import {
  FindManyOptions,
  FindOptionsOrder,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import {
  buildPaginatedMeta,
  PaginatedResult,
  resolvePagination,
} from '../dto/pagination-query.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

export async function paginateQueryBuilder<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  query: PaginationQueryDto,
  sortBy: string,
): Promise<PaginatedResult<T>> {
  const { page, limit, skip, sortOrder } = resolvePagination(query);
  // getCount() resolves ORDER BY metadata; snake_case column names in QB break it.
  const total = await qb.clone().orderBy().getCount();
  const data = await qb.skip(skip).take(limit).getMany();
  return buildPaginatedMeta(data, total, page, limit, sortBy, sortOrder);
}

export async function paginateRepository<T extends ObjectLiteral>(
  repo: Repository<T>,
  query: PaginationQueryDto,
  options: {
    where?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
    relations?: FindManyOptions<T>['relations'];
    order?: FindOptionsOrder<T>;
    sortBy?: string;
  },
): Promise<PaginatedResult<T>> {
  const { page, limit, skip, sortOrder } = resolvePagination(query);
  const sortBy = options.sortBy ?? 'createdAt';
  const [data, total] = await repo.findAndCount({
    where: options.where,
    relations: options.relations,
    order: options.order,
    skip,
    take: limit,
  });
  return buildPaginatedMeta(data, total, page, limit, sortBy, sortOrder);
}
