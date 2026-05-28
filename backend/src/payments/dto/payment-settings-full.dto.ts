import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PagbankEnvironment, PagbankSplitMethod } from '../entities/payment-settings.entity';
import { PaymentSplitReceiverDto, UpdatePagbankSplitSettingsDto } from './payment-settings.dto';

export class PagbankFlowConfigItemDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsObject()
  options?: Record<string, string | number | boolean>;
}

export class UpdatePaymentSettingsDto {
  @IsOptional()
  @IsEnum(PagbankEnvironment)
  pagbankEnvironment?: PagbankEnvironment;

  @IsOptional()
  @IsString()
  pagbankToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  pagbankMasterAccountId?: string | null;

  @IsOptional()
  @IsString()
  pagbankPublicKey?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  pagbankConnectClientId?: string | null;

  @IsOptional()
  @IsString()
  pagbankConnectClientSecret?: string;

  @IsOptional()
  @IsString()
  pagbankNotificationUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(22)
  pagbankOrderSoftDescriptor?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  pagbankOrderMcc?: string | null;

  @IsOptional()
  @IsString()
  pagbankConnectRedirectUri?: string | null;

  @IsOptional()
  @IsBoolean()
  pagbankConnectAutoSyncSplit?: boolean;

  @IsOptional()
  @IsNumber()
  pagbankConnectSplitPercentEach?: number | null;

  @IsOptional()
  @IsString()
  pagbankCheckoutReturnUrl?: string | null;

  @IsOptional()
  @IsString()
  pagbankCheckoutSuccessUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  pagbankCustodyScheduledDefault?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsObject()
  pagbankFlows?: Record<string, PagbankFlowConfigItemDto>;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePagbankSplitSettingsDto)
  pagbankSplit?: UpdatePagbankSplitSettingsDto;
}

export { PaymentSplitReceiverDto, UpdatePagbankSplitSettingsDto };
