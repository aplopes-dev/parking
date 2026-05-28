import { PartialType } from '@nestjs/mapped-types';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  FinanceAccountType,
  FinanceCategoryLevel,
  FinanceTransactionType,
} from '../entities/finance.entities';

const emptyToUndefined = ({ value }: { value: unknown }): unknown =>
  value === '' || value === undefined || value === null ? undefined : value;

export class CreateFinanceTransactionDto {
  @IsEnum(FinanceTransactionType)
  type: FinanceTransactionType;

  @IsString()
  description: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsDateString()
  transactionDate: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  notes?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  sourceId?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  tagIds?: string[];
}

export class UpdateFinanceTransactionDto extends PartialType(CreateFinanceTransactionDto) {
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  removeAttachment?: boolean;
}

export class CreateFinanceAccountDto {
  @IsString()
  name: string;

  @IsEnum(FinanceAccountType)
  type: FinanceAccountType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateFinanceAccountDto extends PartialType(CreateFinanceAccountDto) {}

export class CreateFinanceSourceDto {
  @IsString()
  name: string;

  @IsEnum(FinanceTransactionType)
  type: FinanceTransactionType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateFinanceSourceDto extends PartialType(CreateFinanceSourceDto) {}

export class CreateFinanceCategoryDto {
  @IsString()
  name: string;

  @IsEnum(FinanceTransactionType)
  type: FinanceTransactionType;

  @IsEnum(FinanceCategoryLevel)
  level: FinanceCategoryLevel;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateFinanceCategoryDto extends PartialType(CreateFinanceCategoryDto) {}

export class CreateFinanceTagDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateFinanceTagDto extends PartialType(CreateFinanceTagDto) {}

export class FinanceTransactionsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(FinanceTransactionType)
  type?: FinanceTransactionType;

  @IsOptional()
  @IsUUID()
  accountId?: string;
}
