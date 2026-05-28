import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const PAGINATION_DEFAULT_PAGE = 1;
export const PAGINATION_DEFAULT_LIMIT = 20;
export const PAGINATION_MAX_LIMIT = 100;

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = PAGINATION_DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION_MAX_LIMIT)
  limit?: number = PAGINATION_DEFAULT_LIMIT;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc' = 'ASC';
}

export function resolvePagination(query: PaginationQueryDto) {
  const page = query.page ?? PAGINATION_DEFAULT_PAGE;
  const limit = Math.min(query.limit ?? PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT);
  const sortOrder =
    String(query.sortOrder ?? 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  return { page, limit, skip: (page - 1) * limit, sortOrder: sortOrder as 'ASC' | 'DESC' };
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginatedMeta;
}

export function buildPaginatedMeta<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  sortBy: string,
  sortOrder: 'ASC' | 'DESC',
): PaginatedResult<T> {
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      sortBy,
      sortOrder,
    },
  };
}
