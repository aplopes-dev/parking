import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PagbankPlanIntervalDto {
  @ApiPropertyOptional({ enum: ['DAY', 'MONTH', 'YEAR'] })
  @IsOptional()
  @IsEnum(['DAY', 'MONTH', 'YEAR'])
  unit?: 'DAY' | 'MONTH' | 'YEAR';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  length?: number;
}

export class PagbankCreatePlanDto {
  @ApiProperty()
  @IsString()
  @MaxLength(65)
  name: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  amountCents: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(65)
  referenceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(250)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PagbankPlanIntervalDto)
  interval?: PagbankPlanIntervalDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  billingCycles?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  paymentMethods?: string[];
}

export class PagbankCreateSubscriptionDto {
  @ApiProperty()
  @IsString()
  @MaxLength(65)
  referenceId: string;

  @ApiPropertyOptional({ description: 'ID PagBank PLAN_… ou id local do plano' })
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  localPlanId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerTaxId?: string;

  @ApiPropertyOptional({ description: 'Token do cartão (TOKE_…)' })
  @IsOptional()
  @IsString()
  cardToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cardSecurityCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
