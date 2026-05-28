import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductGroupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  description?: string | null;

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? 0 : Number(value)))
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  active?: boolean;
}

export class UpdateProductGroupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  description?: string | null;

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  active?: boolean;
}
