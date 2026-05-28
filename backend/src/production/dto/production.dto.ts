import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class UpdateProductionSettingsDto {
  @IsOptional() @IsBoolean() notifyOnKitchenSend?: boolean;
  @IsOptional() @IsBoolean() notifyOnKitchenReady?: boolean;
  @IsOptional() @IsBoolean() soundEnabled?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) slaWarningMinutes?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(5) autoRefreshSeconds?: number;
  @IsOptional() @IsString() notes?: string;
}

export const NOTIFICATION_SORT_FIELDS = [
  'createdAt',
  'orderNumber',
  'tableLabel',
  'productName',
  'status',
] as const;

export class NotificationListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(NOTIFICATION_SORT_FIELDS)
  sortBy?: string;

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
