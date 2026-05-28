import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const PRODUCT_SORT_FIELDS = [
  'sortOrder',
  'name',
  'salePrice',
  'active',
  'createdAt',
] as const;

export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];

export class ProductListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(PRODUCT_SORT_FIELDS)
  sortBy?: ProductSortField;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  activeOnly?: boolean;
}
