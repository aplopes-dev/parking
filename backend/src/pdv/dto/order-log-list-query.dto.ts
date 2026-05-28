import { IsIn, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const ORDER_LOG_SORT_FIELDS = [
  'createdAt',
  'action',
  'message',
  'orderNumber',
  'userName',
] as const;

export type OrderLogSortField = (typeof ORDER_LOG_SORT_FIELDS)[number];

export class OrderLogListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(ORDER_LOG_SORT_FIELDS)
  sortBy?: OrderLogSortField;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}/)
  dateFrom?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}/)
  dateTo?: string;
}
