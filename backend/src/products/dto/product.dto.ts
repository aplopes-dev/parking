import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ProductUnit } from '../entities/product.entity';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsUUID()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  groupId?: string | null;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  description?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  @Transform(({ value }) => (value === '' ? null : value))
  sku?: string | null;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Transform(({ value }) => Number(value))
  costPrice: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Transform(({ value }) => Number(value))
  salePrice: number;

  @IsEnum(ProductUnit)
  @IsOptional()
  unit?: ProductUnit;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  active?: boolean;

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  sortOrder?: number;
}

export class UpdateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @IsUUID()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  groupId?: string | null;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  description?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  @Transform(({ value }) => (value === '' ? null : value))
  sku?: string | null;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  costPrice?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  salePrice?: number;

  @IsEnum(ProductUnit)
  @IsOptional()
  unit?: ProductUnit;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  active?: boolean;

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  sortOrder?: number;
}
