import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const STOCK_LOCATION_SORT_FIELDS = [
  'sortOrder',
  'name',
  'active',
  'createdAt',
] as const;

export type StockLocationSortField = (typeof STOCK_LOCATION_SORT_FIELDS)[number];

export class StockLocationListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(STOCK_LOCATION_SORT_FIELDS)
  sortBy?: StockLocationSortField;
}
