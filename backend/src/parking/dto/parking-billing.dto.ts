import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { SubscriptionBillPaymentMethod } from '../entities/parking.enums';

export class BillingPreviewQueryDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  referenceMonth: string;

  @IsOptional()
  @IsUUID()
  facilityId?: string;
}

export class GenerateSubscriptionBillingDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  referenceMonth: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  subscriptionIds?: string[];

  @IsOptional()
  @IsBoolean()
  autoCharge?: boolean;

  @IsOptional()
  @IsEnum(SubscriptionBillPaymentMethod)
  paymentMethod?: SubscriptionBillPaymentMethod;
}

export class ListSubscriptionBillingQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  referenceMonth?: string;

  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class SettleSubscriptionBillingDto {
  @IsArray()
  @IsUUID('4', { each: true })
  billIds: string[];

  @IsDateString()
  paymentDate: string;

  @IsUUID()
  accountId: string;
}

export class ChargeSubscriptionBillDto {
  @IsEnum(SubscriptionBillPaymentMethod)
  paymentMethod: SubscriptionBillPaymentMethod;
}
