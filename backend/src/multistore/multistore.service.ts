import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Order } from '../pdv/entities/order.entity';
import { OrderPayment } from '../pdv/entities/order-payment.entity';
import { OrderStatus } from '../pdv/entities/pdv.enums';
import { User, UserRole } from '../users/entities/user.entity';
import {
  FinanceTransaction,
  FinanceTransactionType,
} from '../finance/entities/finance.entities';
import {
  FinanceBill,
  FinanceBillStatus,
} from '../finance/entities/finance-extended.entities';
import { Product } from '../products/entities/product.entity';
import { StockBalance } from '../stock/entities/stock-balance.entity';
import { StockMinimum } from '../stock/entities/stock-minimum.entity';
import { AuthService } from '../auth/auth.service';
import { StoreGroup } from './entities/store-group.entity';
import {
  ConsolidatedReportQueryDto,
  CreateStoreGroupDto,
  JoinStoreGroupDto,
  UpdateStoreGroupDto,
  UpdateUnitLabelDto,
} from './dto/multistore.dto';

const SWITCH_ROLES = Object.values(UserRole);

function slugifyCode(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

@Injectable()
export class MultistoreService {
  constructor(
    @InjectRepository(StoreGroup)
    private readonly groupsRepo: Repository<StoreGroup>,
    @InjectRepository(Tenant)
    private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,
    @InjectRepository(OrderPayment)
    private readonly paymentsRepo: Repository<OrderPayment>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(FinanceTransaction)
    private readonly financeTxRepo: Repository<FinanceTransaction>,
    @InjectRepository(FinanceBill)
    private readonly billsRepo: Repository<FinanceBill>,
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    @InjectRepository(StockBalance)
    private readonly balancesRepo: Repository<StockBalance>,
    @InjectRepository(StockMinimum)
    private readonly minimumsRepo: Repository<StockMinimum>,
    private readonly authService: AuthService,
  ) {}

  private assertSwitchRole(role: UserRole) {
    if (!SWITCH_ROLES.includes(role)) {
      throw new ForbiddenException('Apenas administrador ou gestor pode trocar de loja');
    }
  }

  private async assertSameGroup(tenantIdA: string, tenantIdB: string) {
    const [a, b] = await Promise.all([
      this.getTenantOrThrow(tenantIdA),
      this.getTenantOrThrow(tenantIdB),
    ]);
    if (!a.storeGroupId || !b.storeGroupId || a.storeGroupId !== b.storeGroupId) {
      throw new ForbiddenException('As lojas devem pertencer ao mesmo grupo');
    }
  }

  private async getTenantOrThrow(tenantId: string) {
    const tenant = await this.tenantsRepo.findOne({
      where: { id: tenantId },
      relations: ['storeGroup'],
    });
    if (!tenant) throw new NotFoundException('Organização não encontrada');
    return tenant;
  }

  private async uniqueCode(base: string): Promise<string> {
    let code = base || 'grupo';
    if (code.length < 3) code = `grupo-${code}`;
    let attempt = code;
    let n = 0;
    while (await this.groupsRepo.findOne({ where: { code: attempt } })) {
      n += 1;
      attempt = `${code}-${n}`;
    }
    return attempt;
  }

  private defaultPeriod(query: ConsolidatedReportQueryDto) {
    const to = query.to ?? new Date().toISOString().slice(0, 10);
    const d = new Date(to);
    d.setDate(d.getDate() - 29);
    const from = query.from ?? d.toISOString().slice(0, 10);
    return { from, to };
  }

  private async resolveGroupTenantIds(tenantId: string): Promise<{
    group: StoreGroup;
    tenantIds: string[];
    units: Tenant[];
    currentTenant: Tenant;
  }> {
    const current = await this.getTenantOrThrow(tenantId);
    if (!current.storeGroupId || !current.storeGroup) {
      throw new BadRequestException(
        'Esta loja não pertence a um grupo. Crie um grupo ou entre com um código.',
      );
    }
    const units = await this.tenantsRepo.find({
      where: { storeGroupId: current.storeGroupId },
      order: { name: 'ASC' },
    });
    return {
      group: current.storeGroup,
      tenantIds: units.map((u) => u.id),
      units,
      currentTenant: current,
    };
  }

  async getContext(tenantId: string) {
    const current = await this.getTenantOrThrow(tenantId);
    if (!current.storeGroupId) {
      return {
        inGroup: false,
        currentTenant: this.toUnitDto(current, current.id),
        group: null,
        units: [],
      };
    }
    const group = await this.groupsRepo.findOne({
      where: { id: current.storeGroupId },
    });
    const units = await this.tenantsRepo.find({
      where: { storeGroupId: current.storeGroupId },
      order: { name: 'ASC' },
    });
    return {
      inGroup: true,
      currentTenant: this.toUnitDto(current, current.id),
      group: group
        ? {
            id: group.id,
            code: group.code,
            name: group.name,
            description: group.description,
            unitCount: units.length,
          }
        : null,
      units: units.map((u) => this.toUnitDto(u, current.id)),
    };
  }

  private toUnitDto(t: Tenant, currentTenantId?: string) {
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      unitLabel: t.unitLabel,
      displayName: t.unitLabel?.trim() || t.name,
      isCurrent: currentTenantId === t.id,
    };
  }

  async createGroup(tenantId: string, dto: CreateStoreGroupDto) {
    const tenant = await this.getTenantOrThrow(tenantId);
    if (tenant.storeGroupId) {
      throw new ConflictException('Esta loja já pertence a um grupo de lojas');
    }

    const baseCode = dto.code?.trim().toLowerCase() ?? slugifyCode(dto.name);
    const code = await this.uniqueCode(baseCode);

    const group = await this.groupsRepo.save(
      this.groupsRepo.create({
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
      }),
    );

    tenant.storeGroupId = group.id;
    tenant.unitLabel = dto.unitLabel?.trim() || tenant.unitLabel || tenant.name;
    await this.tenantsRepo.save(tenant);

    return this.getContext(tenantId);
  }

  async updateGroup(tenantId: string, dto: UpdateStoreGroupDto) {
    const { group } = await this.resolveGroupTenantIds(tenantId);
    if (dto.name !== undefined) group.name = dto.name.trim();
    if (dto.description !== undefined) {
      group.description = dto.description.trim() || null;
    }
    await this.groupsRepo.save(group);
    return this.getContext(tenantId);
  }

  async joinGroup(tenantId: string, dto: JoinStoreGroupDto) {
    const tenant = await this.getTenantOrThrow(tenantId);
    if (tenant.storeGroupId) {
      throw new ConflictException('Esta loja já pertence a um grupo');
    }

    const code = dto.code.trim().toLowerCase();
    const group = await this.groupsRepo.findOne({ where: { code } });
    if (!group) {
      throw new NotFoundException('Grupo não encontrado. Verifique o código.');
    }

    tenant.storeGroupId = group.id;
    tenant.unitLabel = dto.unitLabel?.trim() || tenant.unitLabel || tenant.name;
    await this.tenantsRepo.save(tenant);
    return this.getContext(tenantId);
  }

  async leaveGroup(tenantId: string) {
    const tenant = await this.getTenantOrThrow(tenantId);
    if (!tenant.storeGroupId) {
      throw new BadRequestException('Esta loja não está em um grupo');
    }
    tenant.storeGroupId = null;
    await this.tenantsRepo.save(tenant);
    return this.getContext(tenantId);
  }

  async updateUnitLabel(tenantId: string, dto: UpdateUnitLabelDto) {
    const tenant = await this.getTenantOrThrow(tenantId);
    tenant.unitLabel = dto.unitLabel.trim();
    await this.tenantsRepo.save(tenant);
    return this.getContext(tenantId);
  }

  private async sumPaymentsMulti(tenantIds: string[], from: string, to: string) {
    if (!tenantIds.length) return 0;
    const row = await this.paymentsRepo
      .createQueryBuilder('p')
      .innerJoin('p.order', 'o')
      .where('o.tenant_id IN (:...tenantIds)', { tenantIds })
      .andWhere('DATE(p.paid_at) BETWEEN :from AND :to', { from, to })
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }

  async getConsolidatedReport(tenantId: string, query: ConsolidatedReportQueryDto) {
    const { from, to } = this.defaultPeriod(query);
    const { group, tenantIds, units } = await this.resolveGroupTenantIds(tenantId);

    const [revenue, closedOrders, byUnit, daily, byType] = await Promise.all([
      this.sumPaymentsMulti(tenantIds, from, to),
      this.ordersRepo.count({
        where: {
          tenantId: In(tenantIds),
          status: OrderStatus.FECHADO,
          closedAt: Between(new Date(from), new Date(`${to}T23:59:59`)),
        },
      }),
      Promise.all(
        units.map(async (unit) => {
          const unitRevenue = await this.sumPaymentsMulti([unit.id], from, to);
          const unitOrders = await this.ordersRepo.count({
            where: {
              tenantId: unit.id,
              status: OrderStatus.FECHADO,
              closedAt: Between(new Date(from), new Date(`${to}T23:59:59`)),
            },
          });
          return {
            tenantId: unit.id,
            slug: unit.slug,
            name: unit.name,
            unitLabel: unit.unitLabel,
            displayName: unit.unitLabel?.trim() || unit.name,
            revenue: unitRevenue,
            closedOrders: unitOrders,
            avgTicket: unitOrders > 0 ? unitRevenue / unitOrders : 0,
          };
        }),
      ),
      this.paymentsRepo
        .createQueryBuilder('p')
        .innerJoin('p.order', 'o')
        .select("TO_CHAR(p.paid_at, 'YYYY-MM-DD')", 'date')
        .addSelect('SUM(p.amount)', 'revenue')
        .where('o.tenant_id IN (:...tenantIds)', { tenantIds })
        .andWhere('DATE(p.paid_at) BETWEEN :from AND :to', { from, to })
        .groupBy("TO_CHAR(p.paid_at, 'YYYY-MM-DD')")
        .orderBy('date', 'ASC')
        .getRawMany<{ date: string; revenue: string }>(),
      this.ordersRepo
        .createQueryBuilder('o')
        .select('o.type', 'type')
        .addSelect('COUNT(*)', 'orders')
        .addSelect('SUM(o.total)', 'total')
        .where('o.tenant_id IN (:...tenantIds)', { tenantIds })
        .andWhere('o.status = :st', { st: OrderStatus.FECHADO })
        .andWhere('DATE(o.closed_at) BETWEEN :from AND :to', { from, to })
        .groupBy('o.type')
        .getRawMany<{ type: string; orders: string; total: string }>(),
    ]);

    return {
      period: { from, to },
      group: {
        id: group.id,
        code: group.code,
        name: group.name,
      },
      summary: {
        unitCount: units.length,
        revenue,
        closedOrders,
        avgTicket: closedOrders > 0 ? revenue / closedOrders : 0,
      },
      byUnit,
      byType: byType.map((r) => ({
        type: r.type,
        orders: Number(r.orders),
        total: Number(r.total),
      })),
      daily: daily.map((r) => ({
        date: r.date,
        revenue: Number(r.revenue),
      })),
    };
  }

  async getAccessibleStores(user: User) {
    this.assertSwitchRole(user.role);
    const current = await this.getTenantOrThrow(user.tenantId);
    if (!current.storeGroupId) {
      return { inGroup: false, group: null, stores: [] };
    }
    const group = await this.groupsRepo.findOne({ where: { id: current.storeGroupId } });
    const units = await this.tenantsRepo.find({
      where: { storeGroupId: current.storeGroupId },
      order: { name: 'ASC' },
    });
    const stores = await Promise.all(
      units.map(async (t) => {
        const account = await this.usersRepo.findOne({
          where: { tenantId: t.id, email: user.email, active: true },
        });
        return {
          tenantId: t.id,
          slug: t.slug,
          name: t.name,
          unitLabel: t.unitLabel,
          displayName: t.unitLabel?.trim() || t.name,
          isCurrent: t.id === user.tenantId,
          canSwitch: Boolean(account),
        };
      }),
    );
    return {
      inGroup: true,
      group: group
        ? { id: group.id, code: group.code, name: group.name }
        : null,
      stores,
    };
  }

  async switchTenant(user: User, targetTenantId: string) {
    this.assertSwitchRole(user.role);
    if (targetTenantId === user.tenantId) {
      return this.authService.buildSessionForUser(
        await this.usersRepo.findOneOrFail({
          where: { id: user.id },
          relations: ['tenant'],
        }),
      );
    }
    await this.assertSameGroup(user.tenantId, targetTenantId);
    const targetUser = await this.usersRepo.findOne({
      where: { tenantId: targetTenantId, email: user.email, active: true },
      relations: ['tenant'],
    });
    if (!targetUser) {
      throw new BadRequestException(
        'Não há usuário ativo com seu e-mail nesta loja. Peça ao administrador da unidade para criar seu acesso.',
      );
    }
    return this.authService.buildSessionForUser(targetUser);
  }

  async getConsolidatedFinance(tenantId: string, query: ConsolidatedReportQueryDto) {
    const { from, to } = this.defaultPeriod(query);
    const { group, tenantIds, units } = await this.resolveGroupTenantIds(tenantId);
    const today = new Date().toISOString().slice(0, 10);

    const txs = await this.financeTxRepo
      .createQueryBuilder('t')
      .where('t.tenant_id IN (:...tenantIds)', { tenantIds })
      .andWhere('t.transaction_date BETWEEN :from AND :to', { from, to })
      .getMany();

    let totalIncome = 0;
    let totalExpense = 0;
    for (const tx of txs) {
      const amount = Number(tx.amount);
      if (tx.type === FinanceTransactionType.INCOME) totalIncome += amount;
      else totalExpense += amount;
    }

    const overdueBills = await this.billsRepo
      .createQueryBuilder('b')
      .where('b.tenant_id IN (:...tenantIds)', { tenantIds })
      .andWhere('b.status IN (:...st)', {
        st: [FinanceBillStatus.OPEN, FinanceBillStatus.PARTIAL],
      })
      .andWhere('b.due_date < :today', { today })
      .getCount();

    const byUnit = units.map((unit) => {
      const unitTxs = txs.filter((t) => t.tenantId === unit.id);
      let income = 0;
      let expense = 0;
      for (const tx of unitTxs) {
        const amount = Number(tx.amount);
        if (tx.type === FinanceTransactionType.INCOME) income += amount;
        else expense += amount;
      }
      return {
        tenantId: unit.id,
        displayName: unit.unitLabel?.trim() || unit.name,
        totalIncome: income,
        totalExpense: expense,
        balance: income - expense,
        transactionCount: unitTxs.length,
      };
    });

    return {
      period: { from, to },
      group: { id: group.id, code: group.code, name: group.name },
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        transactionCount: txs.length,
        overdueBills,
      },
      byUnit,
    };
  }

  async getConsolidatedStock(tenantId: string) {
    const { group, tenantIds, units } = await this.resolveGroupTenantIds(tenantId);

    const [totalSkus, balanceRows, minimums] = await Promise.all([
      this.productsRepo.count({ where: { tenantId: In(tenantIds), active: true } }),
      this.balancesRepo.find({
        where: { tenantId: In(tenantIds) },
        relations: ['product', 'location'],
      }),
      this.minimumsRepo.find({
        where: { tenantId: In(tenantIds) },
        relations: ['product', 'location'],
      }),
    ]);

    let belowMinimumCount = 0;
    for (const m of minimums) {
      const bal = balanceRows.find(
        (b) => b.productId === m.productId && b.locationId === m.locationId,
      );
      if (Number(bal?.quantity ?? 0) < Number(m.minimumQuantity)) belowMinimumCount += 1;
    }

    const byUnit = units.map((unit) => {
      const unitBalances = balanceRows.filter((b) => b.tenantId === unit.id);
      const unitMinimums = minimums.filter((m) => m.tenantId === unit.id);
      let unitBelow = 0;
      for (const m of unitMinimums) {
        const bal = unitBalances.find(
          (b) => b.productId === m.productId && b.locationId === m.locationId,
        );
        if (Number(bal?.quantity ?? 0) < Number(m.minimumQuantity)) unitBelow += 1;
      }
      return {
        tenantId: unit.id,
        displayName: unit.unitLabel?.trim() || unit.name,
        skus: unitBalances.length,
        belowMinimum: unitBelow,
      };
    });

    return {
      group: { id: group.id, code: group.code, name: group.name },
      summary: {
        totalSkus,
        locationsWithStock: balanceRows.length,
        belowMinimumCount,
      },
      byUnit,
    };
  }
}
