import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockBalance } from './entities/stock-balance.entity';
import { StockMinimum } from './entities/stock-minimum.entity';

export type BalanceWithAlert = StockBalance & {
  belowMinimum: boolean;
  minimumQuantity: number | null;
};

@Injectable()
export class StockBalancesService {
  constructor(
    @InjectRepository(StockBalance)
    private readonly balanceRepository: Repository<StockBalance>,
    @InjectRepository(StockMinimum)
    private readonly minimumRepository: Repository<StockMinimum>,
  ) {}

  async findAll(
    tenantId: string,
    filters?: { locationId?: string; productId?: string; belowMinimumOnly?: boolean },
  ): Promise<BalanceWithAlert[]> {
    const qb = this.balanceRepository
      .createQueryBuilder('balance')
      .leftJoinAndSelect('balance.product', 'product')
      .leftJoinAndSelect('balance.location', 'location')
      .leftJoinAndSelect('product.group', 'group')
      .where('balance.tenantId = :tenantId', { tenantId })
      .orderBy('product.name', 'ASC');

    if (filters?.locationId) {
      qb.andWhere('balance.locationId = :locationId', { locationId: filters.locationId });
    }
    if (filters?.productId) {
      qb.andWhere('balance.productId = :productId', { productId: filters.productId });
    }

    const balances = await qb.getMany();
    const minimums = await this.minimumRepository.find({
      where: { tenantId, active: true },
      relations: ['product', 'location'],
    });

    const enriched: BalanceWithAlert[] = balances.map((balance) => {
      const qty = parseFloat(balance.quantity);
      const min = this.resolveMinimum(minimums, balance.productId, balance.locationId);
      const belowMinimum = min !== null && qty < min;
      return Object.assign(balance, {
        belowMinimum,
        minimumQuantity: min,
      });
    });

    if (filters?.belowMinimumOnly) {
      return enriched.filter((b) => b.belowMinimum);
    }
    return enriched;
  }

  private resolveMinimum(
    minimums: StockMinimum[],
    productId: string,
    locationId: string,
  ): number | null {
    const specific = minimums.find(
      (m) => m.productId === productId && m.locationId === locationId,
    );
    if (specific) {
      return parseFloat(specific.minimumQuantity);
    }
    const global = minimums.find(
      (m) => m.productId === productId && m.locationId === null,
    );
    return global ? parseFloat(global.minimumQuantity) : null;
  }
}
