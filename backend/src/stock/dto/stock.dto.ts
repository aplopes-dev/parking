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
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ProductUnit } from '../../products/entities/product.entity';
import { StockMovementType } from '../entities/stock-movement.entity';

export class CreateStockLocationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  description?: string | null;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  isDefault?: boolean;

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

export class UpdateStockLocationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  description?: string | null;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  isDefault?: boolean;

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

export class CreateStockMovementDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  locationId: string;

  @IsEnum(StockMovementType)
  type: StockMovementType.ENTRADA | StockMovementType.SAIDA;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Transform(({ value }) => Number(value))
  quantity: number;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateStockAdjustmentDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  locationId: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Transform(({ value }) => Number(value))
  countedQuantity: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateStockMinimumDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  locationId?: string | null;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Transform(({ value }) => Number(value))
  minimumQuantity: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  active?: boolean;
}

export class UpdateStockMinimumDto {
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  minimumQuantity?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  active?: boolean;
}

export class TechnicalSheetItemDto {
  @IsUUID()
  ingredientProductId: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Transform(({ value }) => Number(value))
  quantity: number;

  @IsEnum(ProductUnit)
  @IsOptional()
  unit?: ProductUnit;

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? 0 : Number(value)))
  sortOrder?: number;
}

export class CreateTechnicalSheetDto {
  @IsUUID()
  productId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Transform(({ value }) => Number(value))
  yieldQuantity: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  active?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TechnicalSheetItemDto)
  items: TechnicalSheetItemDto[];

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  sortOrder?: number;
}

export class UpdateTechnicalSheetDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  yieldQuantity?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  active?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TechnicalSheetItemDto)
  @IsOptional()
  items?: TechnicalSheetItemDto[];

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  sortOrder?: number;
}

export class CreateRecipeProductionDto {
  @IsUUID()
  sheetId: string;

  @IsUUID()
  locationId: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Transform(({ value }) => Number(value))
  quantityProduced: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
