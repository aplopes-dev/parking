import {
  Allow,
  IsArray,
  IsBoolean,
  IsDateString,
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
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  CrmCampaignChannel,
  CrmCampaignStatus,
  CrmCampaignType,
  CrmDiscountType,
  CrmInteractionType,
  CrmLoyaltyTxType,
  CrmSegment,
} from '../entities/crm.enums';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const CRM_CUSTOMER_SORT_FIELDS = [
  'name',
  'email',
  'phone',
  'createdAt',
  'segment',
] as const;

export type CrmCustomerSortField = (typeof CRM_CUSTOMER_SORT_FIELDS)[number];

export class CrmCustomersQueryDto extends PaginationQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(CrmSegment)
  @IsOptional()
  segment?: CrmSegment;
}

export class UpdateCrmProfileDto {
  @IsEnum(CrmSegment)
  @IsOptional()
  segment?: CrmSegment;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  @Transform(({ value }) => (value === '' ? null : value))
  tags?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  preferredChannel?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  marketingOptIn?: boolean;

  @IsString()
  @IsOptional()
  crmNotes?: string;
}

export class CreateCrmInteractionDto {
  @IsUUID()
  customerId: string;

  @IsEnum(CrmInteractionType)
  type: CrmInteractionType;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  subject: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateCrmCampaignDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CrmCampaignType)
  @IsOptional()
  type?: CrmCampaignType;

  @IsEnum(CrmCampaignStatus)
  @IsOptional()
  status?: CrmCampaignStatus;

  @IsEnum(CrmCampaignChannel)
  @IsOptional()
  channel?: CrmCampaignChannel;

  @IsEnum(CrmDiscountType)
  @IsOptional()
  discountType?: CrmDiscountType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? 0 : Number(value)))
  discountValue?: number;

  @IsEnum(CrmSegment)
  @IsOptional()
  audienceSegment?: CrmSegment;

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @ApiPropertyOptional({ type: [String], format: 'uuid', isArray: true })
  @Allow()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  productIds?: string[];
}

export class UpdateCrmCampaignDto extends PartialType(CreateCrmCampaignDto) {}

export class CreateLoyaltyProgramDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? 1 : Number(value)))
  pointsPerReal?: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? 0.01 : Number(value)))
  redeemRate?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? 100 : Number(value)))
  minRedeemPoints?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  tierSilverMin?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  tierGoldMin?: number;

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
  isDefault?: boolean;
}

export class UpdateLoyaltyProgramDto extends CreateLoyaltyProgramDto {}

export class AdjustLoyaltyPointsDto {
  @IsUUID()
  customerId: string;

  @IsEnum(CrmLoyaltyTxType)
  type: CrmLoyaltyTxType.GANHO | CrmLoyaltyTxType.RESGATE | CrmLoyaltyTxType.AJUSTE;

  @IsInt()
  @Min(1)
  points: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  @IsOptional()
  programId?: string;
}

export class EarnLoyaltyFromPurchaseDto {
  @IsUUID()
  customerId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Transform(({ value }) => Number(value))
  purchaseAmount: number;

  @IsUUID()
  @IsOptional()
  programId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
