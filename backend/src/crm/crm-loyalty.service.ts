import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CrmLoyaltyProgram } from './entities/crm-loyalty-program.entity';
import { CrmLoyaltyAccount } from './entities/crm-loyalty-account.entity';
import { CrmLoyaltyTransaction } from './entities/crm-loyalty-transaction.entity';
import { CrmLoyaltyTier, CrmLoyaltyTxType } from './entities/crm.enums';
import { Customer } from '../customers/entities/customer.entity';
import {
  AdjustLoyaltyPointsDto,
  CreateLoyaltyProgramDto,
  EarnLoyaltyFromPurchaseDto,
  UpdateLoyaltyProgramDto,
} from './dto/crm.dto';

@Injectable()
export class CrmLoyaltyService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CrmLoyaltyProgram)
    private readonly programRepository: Repository<CrmLoyaltyProgram>,
    @InjectRepository(CrmLoyaltyAccount)
    private readonly accountRepository: Repository<CrmLoyaltyAccount>,
    @InjectRepository(CrmLoyaltyTransaction)
    private readonly txRepository: Repository<CrmLoyaltyTransaction>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  findPrograms(tenantId: string): Promise<CrmLoyaltyProgram[]> {
    return this.programRepository.find({
      where: { tenantId },
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  async getDefaultProgram(tenantId: string): Promise<CrmLoyaltyProgram> {
    let program = await this.programRepository.findOne({
      where: { tenantId, isDefault: true, active: true },
    });
    if (!program) {
      program = await this.programRepository.findOne({
        where: { tenantId, active: true },
        order: { createdAt: 'ASC' },
      });
    }
    if (!program) {
      throw new NotFoundException('Nenhum programa de fidelidade ativo. Crie um programa primeiro.');
    }
    return program;
  }

  async createProgram(dto: CreateLoyaltyProgramDto, tenantId: string): Promise<CrmLoyaltyProgram> {
    if (dto.isDefault) {
      await this.clearDefaultProgram(tenantId);
    }
    const entity = this.programRepository.create({
      tenantId,
      name: dto.name.trim(),
      description: dto.description?.trim() ?? null,
      pointsPerReal: (dto.pointsPerReal ?? 1).toFixed(4),
      redeemRate: (dto.redeemRate ?? 0.01).toFixed(4),
      minRedeemPoints: dto.minRedeemPoints ?? 100,
      tierSilverMin: dto.tierSilverMin ?? 500,
      tierGoldMin: dto.tierGoldMin ?? 2000,
      active: dto.active ?? true,
      isDefault: dto.isDefault ?? false,
    });
    return this.programRepository.save(entity);
  }

  async updateProgram(
    id: string,
    tenantId: string,
    dto: UpdateLoyaltyProgramDto,
  ): Promise<CrmLoyaltyProgram> {
    const program = await this.programRepository.findOne({ where: { id, tenantId } });
    if (!program) throw new NotFoundException('Programa não encontrado');
    if (dto.isDefault) await this.clearDefaultProgram(tenantId, id);
    if (dto.name) program.name = dto.name.trim();
    if (dto.description !== undefined) program.description = dto.description?.trim() ?? null;
    if (dto.pointsPerReal !== undefined) program.pointsPerReal = dto.pointsPerReal.toFixed(4);
    if (dto.redeemRate !== undefined) program.redeemRate = dto.redeemRate.toFixed(4);
    if (dto.minRedeemPoints !== undefined) program.minRedeemPoints = dto.minRedeemPoints;
    if (dto.tierSilverMin !== undefined) program.tierSilverMin = dto.tierSilverMin;
    if (dto.tierGoldMin !== undefined) program.tierGoldMin = dto.tierGoldMin;
    if (dto.active !== undefined) program.active = dto.active;
    if (dto.isDefault !== undefined) program.isDefault = dto.isDefault;
    return this.programRepository.save(program);
  }

  findAccounts(tenantId: string, programId?: string): Promise<CrmLoyaltyAccount[]> {
    return this.accountRepository.find({
      where: { tenantId, ...(programId ? { programId } : {}) },
      relations: ['customer', 'program'],
      order: { pointsBalance: 'DESC' },
    });
  }

  findTransactions(tenantId: string, accountId?: string, limit = 50): Promise<CrmLoyaltyTransaction[]> {
    return this.txRepository.find({
      where: { tenantId, ...(accountId ? { accountId } : {}) },
      relations: ['account', 'account.customer', 'createdByUser'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getOrCreateAccount(
    tenantId: string,
    customerId: string,
    programId: string,
  ): Promise<CrmLoyaltyAccount> {
    let account = await this.accountRepository.findOne({
      where: { tenantId, customerId, programId },
      relations: ['customer', 'program'],
    });
    if (account) return account;

    const customer = await this.customerRepository.findOne({ where: { id: customerId, tenantId } });
    if (!customer) throw new NotFoundException('Cliente não encontrado');

    account = await this.accountRepository.save(
      this.accountRepository.create({
        tenantId,
        customerId,
        programId,
        pointsBalance: 0,
        lifetimePoints: 0,
        tier: CrmLoyaltyTier.BRONZE,
      }),
    );
    return this.accountRepository.findOne({
      where: { id: account.id },
      relations: ['customer', 'program'],
    }) as Promise<CrmLoyaltyAccount>;
  }

  async adjustPoints(
    dto: AdjustLoyaltyPointsDto,
    tenantId: string,
    userId: string,
  ): Promise<CrmLoyaltyAccount> {
    const program = dto.programId
      ? await this.programRepository.findOne({ where: { id: dto.programId, tenantId } })
      : await this.getDefaultProgram(tenantId);
    if (!program) throw new NotFoundException('Programa não encontrado');

    return this.dataSource.transaction(async (manager) => {
      const account = await this.getOrCreateAccount(tenantId, dto.customerId, program.id);
      const reloaded = await manager.findOne(CrmLoyaltyAccount, { where: { id: account.id } });
      if (!reloaded) throw new NotFoundException('Conta de fidelidade não encontrada');

      let delta = dto.points;
      if (dto.type === CrmLoyaltyTxType.RESGATE) {
        if (reloaded.pointsBalance < dto.points) {
          throw new BadRequestException('Saldo de pontos insuficiente');
        }
        if (dto.points < program.minRedeemPoints) {
          throw new BadRequestException(
            `Mínimo de ${program.minRedeemPoints} pontos para resgate`,
          );
        }
        delta = -dto.points;
      } else if (dto.type === CrmLoyaltyTxType.AJUSTE) {
        delta = dto.points - reloaded.pointsBalance;
      }

      const newBalance = reloaded.pointsBalance + delta;
      if (newBalance < 0) {
        throw new BadRequestException('Saldo de pontos não pode ficar negativo');
      }

      reloaded.pointsBalance = newBalance;
      if (delta > 0) {
        reloaded.lifetimePoints += delta;
      }
      reloaded.tier = this.resolveTier(reloaded.lifetimePoints, program);
      await manager.save(reloaded);

      await manager.save(
        manager.create(CrmLoyaltyTransaction, {
          tenantId,
          accountId: reloaded.id,
          type: dto.type,
          points: Math.abs(dto.points),
          balanceAfter: newBalance,
          notes: dto.notes ?? null,
          createdByUserId: userId,
        }),
      );

      return manager.findOne(CrmLoyaltyAccount, {
        where: { id: reloaded.id },
        relations: ['customer', 'program'],
      }) as Promise<CrmLoyaltyAccount>;
    });
  }

  async earnFromPurchase(
    dto: EarnLoyaltyFromPurchaseDto,
    tenantId: string,
    userId: string,
  ): Promise<CrmLoyaltyAccount> {
    const program = dto.programId
      ? await this.programRepository.findOne({ where: { id: dto.programId, tenantId, active: true } })
      : await this.getDefaultProgram(tenantId);
    if (!program) throw new NotFoundException('Programa não encontrado');

    const points = Math.floor(dto.purchaseAmount * parseFloat(program.pointsPerReal));
    if (points <= 0) {
      throw new BadRequestException('Valor da compra não gera pontos');
    }

    return this.adjustPoints(
      {
        customerId: dto.customerId,
        type: CrmLoyaltyTxType.GANHO,
        points,
        notes: dto.notes ?? `Compra R$ ${dto.purchaseAmount.toFixed(2)}`,
        programId: program.id,
      },
      tenantId,
      userId,
    );
  }

  private resolveTier(lifetimePoints: number, program: CrmLoyaltyProgram): CrmLoyaltyTier {
    if (lifetimePoints >= program.tierGoldMin) return CrmLoyaltyTier.OURO;
    if (lifetimePoints >= program.tierSilverMin) return CrmLoyaltyTier.PRATA;
    return CrmLoyaltyTier.BRONZE;
  }

  private async clearDefaultProgram(tenantId: string, exceptId?: string): Promise<void> {
    const programs = await this.programRepository.find({ where: { tenantId, isDefault: true } });
    for (const p of programs) {
      if (p.id !== exceptId) {
        p.isDefault = false;
        await this.programRepository.save(p);
      }
    }
  }
}
