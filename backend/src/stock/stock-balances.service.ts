import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { buildPaginatedMeta, resolvePagination } from '../common/dto/pagination-query.dto';
import { StockBalanceListQueryDto } from './dto/stock.dto';
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

  async findAll(tenantId: string, query: StockBalanceListQueryDto) {
    const { page, limit, skip, sortOrder } = resolvePagination(query);
    const belowMinimumOnly = query.belowMinimumOnly === 'true';
    const qb = this.balanceRepository
      .createQueryBuilder('balance')
      .leftJoinAndSelect('balance.product', 'product')
      .leftJoinAndSelect('balance.location', 'location')
      .leftJoinAndSelect('product.group', 'group')
      .where('balance.tenantId = :tenantId', { tenantId })
      .orderBy('product.name', 'ASC');

    if (query.locationId) {
      qb.andWhere('balance.locationId = :locationId', { locationId: query.locationId });
    }
    if (query.productId) {
      qb.andWhere('balance.productId = :productId', { productId: query.productId });
    }

    const total = await qb.getCount();
    const balances = await qb.skip(skip).take(limit).getMany();
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

    const data = belowMinimumOnly ? enriched.filter((b) => b.belowMinimum) : enriched;
    return buildPaginatedMeta(data, total, page, limit, 'product.name', sortOrder);
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
