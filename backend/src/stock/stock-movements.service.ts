import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { StockMovement, StockMovementType } from './entities/stock-movement.entity';
import {
  CreateStockAdjustmentDto,
  CreateStockMovementDto,
} from './dto/stock.dto';
import { StockLedgerService } from './stock-ledger.service';
import {
  buildPaginatedMeta,
  resolvePagination,
} from '../common/dto/pagination-query.dto';
import {
  STOCK_MOVEMENT_SORT_FIELDS,
  StockMovementListQueryDto,
  StockMovementSortField,
} from './dto/stock-movement-list-query.dto';

const DEFAULT_SORT: StockMovementSortField = 'createdAt';

@Injectable()
export class StockMovementsService {
  constructor(
    @InjectRepository(StockMovement)
    private readonly repository: Repository<StockMovement>,
    private readonly ledger: StockLedgerService,
  ) {}

  private resolveSortField(sortBy?: string): StockMovementSortField {
    if (sortBy && STOCK_MOVEMENT_SORT_FIELDS.includes(sortBy as StockMovementSortField)) {
      return sortBy as StockMovementSortField;
    }
    return DEFAULT_SORT;
  }

  private applySort(
    qb: SelectQueryBuilder<StockMovement>,
    sortBy: StockMovementSortField,
    sortOrder: 'ASC' | 'DESC',
  ) {
    switch (sortBy) {
      case 'productName':
        qb.orderBy('product.name', sortOrder);
        break;
      case 'locationName':
        qb.orderBy('location.name', sortOrder);
        break;
      default:
        qb.orderBy(`movement.${sortBy}`, sortOrder);
        break;
    }
    if (sortBy !== 'createdAt') {
      qb.addOrderBy('movement.createdAt', 'DESC');
    }
  }

  private applyFilters(
    qb: SelectQueryBuilder<StockMovement>,
    query: StockMovementListQueryDto,
  ): void {
    if (query.locationId) {
      qb.andWhere('movement.locationId = :locationId', { locationId: query.locationId });
    }
    if (query.productId) {
      qb.andWhere('movement.productId = :productId', { productId: query.productId });
    }
    if (query.type) {
      qb.andWhere('movement.type = :type', { type: query.type });
    }
    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        '(product.name ILIKE :term OR location.name ILIKE :term OR movement.reason ILIKE :term OR movement.notes ILIKE :term OR movement.type::text ILIKE :term)',
        { term },
      );
    }
    if (query.dateFrom) {
      qb.andWhere('movement.createdAt >= :dateFrom', { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      const endOfDay = new Date(query.dateTo);
      endOfDay.setUTCHours(23, 59, 59, 999);
      qb.andWhere('movement.createdAt <= :dateTo', { dateTo: endOfDay.toISOString() });
    }
  }

  async findAllPaginated(tenantId: string, query: StockMovementListQueryDto) {
    const { page, limit, skip, sortOrder: resolvedOrder } = resolvePagination(query);
    const sortBy = this.resolveSortField(query.sortBy);
    const sortOrder =
      query.sortOrder != null
        ? resolvedOrder
        : sortBy === 'createdAt'
          ? 'DESC'
          : resolvedOrder;

    const qb = this.repository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.product', 'product')
      .leftJoinAndSelect('movement.location', 'location')
      .leftJoinAndSelect('movement.createdByUser', 'createdByUser')
      .where('movement.tenantId = :tenantId', { tenantId });

    this.applyFilters(qb, query);
    const total = await qb.getCount();
    this.applySort(qb, sortBy, sortOrder);
    const data = await qb.skip(skip).take(limit).getMany();

    return buildPaginatedMeta(data, total, page, limit, sortBy, sortOrder);
  }

  findAll(
    tenantId: string,
    filters?: {
      locationId?: string;
      productId?: string;
      type?: StockMovementType;
      limit?: number;
    },
  ): Promise<StockMovement[]> {
    const qb = this.repository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.product', 'product')
      .leftJoinAndSelect('movement.location', 'location')
      .leftJoinAndSelect('movement.createdByUser', 'createdByUser')
      .where('movement.tenantId = :tenantId', { tenantId })
      .orderBy('movement.createdAt', 'DESC')
      .take(filters?.limit ?? 100);

    if (filters?.locationId) {
      qb.andWhere('movement.locationId = :locationId', { locationId: filters.locationId });
    }
    if (filters?.productId) {
      qb.andWhere('movement.productId = :productId', { productId: filters.productId });
    }
    if (filters?.type) {
      qb.andWhere('movement.type = :type', { type: filters.type });
    }

    return qb.getMany();
  }

  async createMovement(
    dto: CreateStockMovementDto,
    tenantId: string,
    userId: string,
  ): Promise<StockMovement> {
    if (dto.type !== StockMovementType.ENTRADA && dto.type !== StockMovementType.SAIDA) {
      throw new BadRequestException('Tipo deve ser entrada ou saida');
    }
    return this.ledger.applyMovement({
      tenantId,
      productId: dto.productId,
      locationId: dto.locationId,
      type: dto.type,
      quantity: dto.quantity,
      reason: dto.reason ?? (dto.type === StockMovementType.ENTRADA ? 'Entrada manual' : 'Saída manual'),
      notes: dto.notes ?? null,
      createdByUserId: userId,
    });
  }

  async createAdjustment(
    dto: CreateStockAdjustmentDto,
    tenantId: string,
    userId: string,
  ): Promise<StockMovement> {
    return this.ledger.applyMovement({
      tenantId,
      productId: dto.productId,
      locationId: dto.locationId,
      type: StockMovementType.ACERTO,
      quantity: 0,
      countedQuantity: dto.countedQuantity,
      reason: 'Acerto de estoque',
      notes: dto.notes ?? null,
      createdByUserId: userId,
    });
  }
}
