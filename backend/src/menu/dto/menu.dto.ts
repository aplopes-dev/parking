import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { MenuChannel } from '../entities/menu.enums';

export class UpdateMenuSettingsDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  welcomeMessage?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  active?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  serviceFeeEnabled?: boolean;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  serviceFeePercent?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  minOrderAmount?: number;

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  estimatedMinutes?: number;
}

export class MenuProductEntryDto {
  @IsUUID()
  productId: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  visible?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  featured?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  promoLabel?: string | null;
}

export class SyncMenuProductsDto {
  @IsEnum(MenuChannel)
  channel: MenuChannel;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuProductEntryDto)
  products: MenuProductEntryDto[];
}
