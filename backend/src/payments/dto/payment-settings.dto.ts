import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PagbankEnvironment, PagbankSplitMethod } from '../entities/payment-settings.entity';
import { PaymentSplitReceiverRole } from '../entities/payment-split-receiver.entity';

export class PaymentSplitReceiverDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MaxLength(120)
  label: string;

  @IsString()
  @MaxLength(80)
  pagbankAccountId: string;

  @IsEnum(PaymentSplitReceiverRole)
  role: PaymentSplitReceiverRole;

  @IsNumber()
  @Min(0)
  amountValue: number;

  @IsOptional()
  @IsBoolean()
  isLiable?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  connectAccountId?: string | null;
}

export class UpdatePagbankSplitSettingsDto {
  @IsOptional()
  @IsBoolean()
  pagbankSplitEnabled?: boolean;

  @IsOptional()
  @IsEnum(PagbankEnvironment)
  pagbankEnvironment?: PagbankEnvironment;

  /** Enviar vazio para manter o token atual; omitir para não alterar */
  @IsOptional()
  @IsString()
  pagbankToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  pagbankMasterAccountId?: string | null;

  @IsOptional()
  @IsEnum(PagbankSplitMethod)
  pagbankSplitMethod?: PagbankSplitMethod;

  @IsOptional()
  @IsBoolean()
  pagbankTransferInterest?: boolean;

  @IsOptional()
  @IsBoolean()
  pagbankTransferShipping?: boolean;

  @IsOptional()
  @IsBoolean()
  pagbankCustodyEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  pagbankCustodyScheduledDefault?: string | null;

  @IsOptional()
  @IsString()
  pagbankConnectRedirectUri?: string | null;

  @IsOptional()
  @IsBoolean()
  pagbankConnectAutoSyncSplit?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  pagbankConnectSplitPercentEach?: number | null;

  @IsOptional()
  @IsString()
  pagbankCheckoutReturnUrl?: string | null;

  @IsOptional()
  @IsString()
  pagbankCheckoutSuccessUrl?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentSplitReceiverDto)
  receivers?: PaymentSplitReceiverDto[];
}
