import { IsIn, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { StockMovementType } from '../entities/stock-movement.entity';

export const STOCK_MOVEMENT_SORT_FIELDS = [
  'createdAt',
  'productName',
  'locationName',
  'type',
  'quantity',
  'reason',
] as const;

export type StockMovementSortField = (typeof STOCK_MOVEMENT_SORT_FIELDS)[number];

export class StockMovementListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(STOCK_MOVEMENT_SORT_FIELDS)
  sortBy?: StockMovementSortField;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsIn([
    StockMovementType.ENTRADA,
    StockMovementType.SAIDA,
    StockMovementType.ACERTO,
    StockMovementType.PRODUCAO_ENTRADA,
    StockMovementType.PRODUCAO_SAIDA,
  ])
  type?: StockMovementType;

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
