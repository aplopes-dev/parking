import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  buildPaginatedMeta,
  resolvePagination,
} from '../common/dto/pagination-query.dto';
import {
  OrderLogListQueryDto,
  OrderLogSortField,
  ORDER_LOG_SORT_FIELDS,
} from './dto/order-log-list-query.dto';
import { OrderLog } from './entities/order-log.entity';

const DEFAULT_SORT: OrderLogSortField = 'createdAt';

@Injectable()
export class OrderLogsService {
  constructor(
    @InjectRepository(OrderLog)
    private readonly repository: Repository<OrderLog>,
  ) {}

  private resolveSortField(sortBy?: string): OrderLogSortField {
    if (sortBy && ORDER_LOG_SORT_FIELDS.includes(sortBy as OrderLogSortField)) {
      return sortBy as OrderLogSortField;
    }
    return DEFAULT_SORT;
  }

  private applySort(
    qb: SelectQueryBuilder<OrderLog>,
    sortBy: OrderLogSortField,
    sortOrder: 'ASC' | 'DESC',
  ) {
    switch (sortBy) {
      case 'orderNumber':
        qb.orderBy('order.orderNumber', sortOrder);
        break;
      case 'userName':
        qb.orderBy('user.name', sortOrder);
        break;
      default:
        qb.orderBy(`log.${sortBy}`, sortOrder);
        break;
    }
    if (sortBy !== 'createdAt') {
      qb.addOrderBy('log.createdAt', 'DESC');
    }
  }

  private applyFilters(
    qb: SelectQueryBuilder<OrderLog>,
    query: OrderLogListQueryDto,
  ): void {
    if (query.orderId) {
      qb.andWhere('log.order_id = :orderId', { orderId: query.orderId });
    }

    if (query.search?.trim()) {
      const raw = query.search.trim();
      const term = `%${raw}%`;
      const orderNum = /^\d+$/.test(raw) ? parseInt(raw, 10) : null;
      if (orderNum != null) {
        qb.andWhere(
          '("order"."order_number" = :orderNum OR "user"."name" ILIKE :term OR log.action ILIKE :term OR log.message ILIKE :term)',
          { orderNum, term },
        );
      } else {
        qb.andWhere(
          '("user"."name" ILIKE :term OR log.action ILIKE :term OR log.message ILIKE :term)',
          { term },
        );
      }
    }

    if (query.dateFrom) {
      qb.andWhere('log.createdAt >= :dateFrom', { dateFrom: query.dateFrom });
    }

    if (query.dateTo) {
      const endOfDay = new Date(query.dateTo);
      endOfDay.setUTCHours(23, 59, 59, 999);
      qb.andWhere('log.createdAt <= :dateTo', { dateTo: endOfDay.toISOString() });
    }
  }

  async findAllPaginated(tenantId: string, query: OrderLogListQueryDto) {
    const { page, limit, skip, sortOrder: resolvedOrder } = resolvePagination(query);
    const sortBy = this.resolveSortField(query.sortBy);
    const sortOrder =
      query.sortOrder != null
        ? resolvedOrder
        : sortBy === 'createdAt'
          ? 'DESC'
          : resolvedOrder;

    const baseQb = this.repository
      .createQueryBuilder('log')
      .leftJoin('log.order', 'order')
      .leftJoin('log.createdByUser', 'user')
      .where('log.tenant_id = :tenantId', { tenantId });

    this.applyFilters(baseQb, query);

    const total = await baseQb.getCount();

    baseQb
      .addSelect(['order.id', 'order.orderNumber'])
      .addSelect(['user.id', 'user.name']);

    this.applySort(baseQb, sortBy, sortOrder);

    const data = await baseQb.skip(skip).take(limit).getMany();

    return buildPaginatedMeta(data, total, page, limit, sortBy, sortOrder);
  }
}
