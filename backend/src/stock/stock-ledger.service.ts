import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { StockBalance } from './entities/stock-balance.entity';
import { StockMovement, StockMovementType } from './entities/stock-movement.entity';
import { StockLocation } from './entities/stock-location.entity';
import { Product } from '../products/entities/product.entity';

export type ApplyMovementInput = {
  tenantId: string;
  productId: string;
  locationId: string;
  type: StockMovementType;
  quantity: number;
  reason?: string | null;
  notes?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  createdByUserId?: string | null;
  /** Para acerto: quantidade contada no inventário */
  countedQuantity?: number;
};

@Injectable()
export class StockLedgerService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(StockBalance)
    private readonly balanceRepository: Repository<StockBalance>,
    @InjectRepository(StockMovement)
    private readonly movementRepository: Repository<StockMovement>,
    @InjectRepository(StockLocation)
    private readonly locationRepository: Repository<StockLocation>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async applyMovement(
    input: ApplyMovementInput,
    existingManager?: EntityManager,
  ): Promise<StockMovement> {
    if (input.quantity <= 0 && input.type !== StockMovementType.ACERTO) {
      throw new BadRequestException('Quantidade deve ser maior que zero');
    }

    if (existingManager) {
      return this.applyMovementWithManager(existingManager, input);
    }

    return this.dataSource.transaction((manager) =>
      this.applyMovementWithManager(manager, input),
    );
  }

  private async applyMovementWithManager(
    manager: EntityManager,
    input: ApplyMovementInput,
  ): Promise<StockMovement> {
    return (async () => {
      const location = await manager.findOne(StockLocation, {
        where: { id: input.locationId, tenantId: input.tenantId, active: true },
      });
      if (!location) {
        throw new NotFoundException('Local de estoque não encontrado');
      }

      const product = await manager.findOne(Product, {
        where: { id: input.productId, tenantId: input.tenantId, active: true },
      });
      if (!product) {
        throw new NotFoundException('Produto não encontrado');
      }

      let balance = await manager.findOne(StockBalance, {
        where: {
          tenantId: input.tenantId,
          productId: input.productId,
          locationId: input.locationId,
        },
      });

      if (!balance) {
        balance = manager.create(StockBalance, {
          tenantId: input.tenantId,
          productId: input.productId,
          locationId: input.locationId,
          quantity: '0',
        });
        balance = await manager.save(balance);
      }

      const before = parseFloat(balance.quantity);
      let after = before;
      let movementQty = input.quantity;

      switch (input.type) {
        case StockMovementType.ENTRADA:
        case StockMovementType.PRODUCAO_ENTRADA:
          after = before + input.quantity;
          break;
        case StockMovementType.SAIDA:
        case StockMovementType.PRODUCAO_SAIDA:
          after = before - input.quantity;
          if (after < 0) {
            throw new BadRequestException(
              `Estoque insuficiente. Saldo atual: ${before}`,
            );
          }
          break;
        case StockMovementType.ACERTO: {
          if (input.countedQuantity === undefined || input.countedQuantity < 0) {
            throw new BadRequestException('Informe a quantidade contada para o acerto');
          }
          after = input.countedQuantity;
          movementQty = Math.abs(after - before);
          break;
        }
        default:
          throw new BadRequestException('Tipo de movimentação inválido');
      }

      if (input.type === StockMovementType.ACERTO && movementQty === 0) {
        return manager.save(
          manager.create(StockMovement, {
            tenantId: input.tenantId,
            productId: input.productId,
            locationId: input.locationId,
            type: input.type,
            quantity: '0',
            balanceBefore: before.toFixed(4),
            balanceAfter: after.toFixed(4),
            reason: input.reason ?? 'Acerto de estoque',
            notes: input.notes ?? null,
            referenceType: input.referenceType ?? null,
            referenceId: input.referenceId ?? null,
            createdByUserId: input.createdByUserId ?? null,
          }),
        );
      }

      balance.quantity = after.toFixed(4);
      await manager.save(balance);

      return manager.save(
        manager.create(StockMovement, {
          tenantId: input.tenantId,
          productId: input.productId,
          locationId: input.locationId,
          type: input.type,
          quantity: movementQty.toFixed(4),
          balanceBefore: before.toFixed(4),
          balanceAfter: after.toFixed(4),
          reason: input.reason ?? null,
          notes: input.notes ?? null,
          referenceType: input.referenceType ?? null,
          referenceId: input.referenceId ?? null,
          createdByUserId: input.createdByUserId ?? null,
        }),
      );
    })();
  }

  async getBalance(
    tenantId: string,
    productId: string,
    locationId: string,
  ): Promise<number> {
    const balance = await this.balanceRepository.findOne({
      where: { tenantId, productId, locationId },
    });
    return balance ? parseFloat(balance.quantity) : 0;
  }
}
