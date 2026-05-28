import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const PRODUCT_GROUP_SORT_FIELDS = [
  'sortOrder',
  'name',
  'active',
  'createdAt',
] as const;

export type ProductGroupSortField = (typeof PRODUCT_GROUP_SORT_FIELDS)[number];

export class ProductGroupListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(PRODUCT_GROUP_SORT_FIELDS)
  sortBy?: ProductGroupSortField;
}
