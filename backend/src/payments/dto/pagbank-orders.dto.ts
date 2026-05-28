import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PagbankPaymentInput } from '../pagbank-flow-payment.builder';
import { PagbankSplitCheckoutOptionsDto } from './pagbank-split.dto';

export enum PagbankCheckoutPaymentMethod {
  PIX = 'PIX',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  BOLETO = 'BOLETO',
}

export class PagbankCustomerDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'CPF/CNPJ apenas números' })
  @IsOptional()
  @IsString()
  taxId?: string;
}

export class PagbankCardPaymentDto {
  @ApiPropertyOptional({ description: 'Token PagBank (CARD_...)' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  encrypted?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  securityCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  store?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  installments?: number;

  @ApiPropertyOptional()
  @IsOptional()
  capture?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PagbankCustomerDto)
  holder?: PagbankCustomerDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  networkToken?: Record<string, unknown>;
}

export class PagbankWalletPaymentDto {
  @ApiProperty({ enum: ['GOOGLE_PAY', 'APPLE_PAY', 'SAMSUNG_PAY'] })
  @IsString()
  type: 'GOOGLE_PAY' | 'APPLE_PAY' | 'SAMSUNG_PAY';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cryptogram?: string;
}

export class PagbankAuthenticationDto {
  @ApiProperty({ enum: ['THREEDS', 'INAPP'] })
  @IsString()
  type: 'THREEDS' | 'INAPP';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cavv?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  xid?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eci?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dsTransactionId?: string;
}

export class PagbankRecurringDto {
  @ApiProperty({ enum: ['INITIAL', 'SUBSEQUENT', 'UNSCHEDULED', 'STANDING_ORDER'] })
  @IsString()
  type: 'INITIAL' | 'SUBSEQUENT' | 'UNSCHEDULED' | 'STANDING_ORDER';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recurrenceId?: string;
}

export class PagbankPaymentDto {
  @ApiPropertyOptional({ enum: PagbankCheckoutPaymentMethod })
  @IsOptional()
  @IsEnum(PagbankCheckoutPaymentMethod)
  method?: PagbankCheckoutPaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PagbankCardPaymentDto)
  card?: PagbankCardPaymentDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PagbankWalletPaymentDto)
  wallet?: PagbankWalletPaymentDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PagbankAuthenticationDto)
  authentication?: PagbankAuthenticationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PagbankRecurringDto)
  recurring?: PagbankRecurringDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  fees?: { buyerInterest?: boolean };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  boleto?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  pix?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  sdwo?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  eloRecurrence?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  orderExtras?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Campos extras mesclados no payment_method' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export function dtoPaymentToInput(payment?: PagbankPaymentDto): PagbankPaymentInput | undefined {
  if (!payment) return undefined;
  return {
    method: payment.method,
    card: payment.card
      ? {
          id: payment.card.id,
          encrypted: payment.card.encrypted,
          securityCode: payment.card.securityCode,
          brand: payment.card.brand,
          store: payment.card.store,
          installments: payment.card.installments,
          capture: payment.card.capture,
          holder: payment.card.holder
            ? { name: payment.card.holder.name, taxId: payment.card.holder.taxId }
            : undefined,
          networkToken: payment.card.networkToken,
        }
      : undefined,
    wallet: payment.wallet,
    authentication: payment.authentication,
    recurring: payment.recurring,
    fees: payment.fees,
    boleto: payment.boleto,
    pix: payment.pix,
    sdwo: payment.sdwo,
    eloRecurrence: payment.eloRecurrence,
    orderExtras: payment.orderExtras,
    payload: payment.payload,
  };
}

export class PagbankCheckoutDto {
  @ApiProperty({ example: 'orders_pix' })
  @IsString()
  flowId: string;

  @ApiPropertyOptional({ description: 'Pedido PDV interno' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Valor em centavos (sobrescreve total do pedido)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  amountCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PagbankCustomerDto)
  customer?: PagbankCustomerDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PagbankPaymentDto)
  payment?: PagbankPaymentDto;

  @ApiPropertyOptional({ description: 'Opções de split (custódia agendada, etc.)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PagbankSplitCheckoutOptionsDto)
  splitOptions?: PagbankSplitCheckoutOptionsDto;
}

export class PagbankPayExistingDto {
  @ApiProperty({ example: 'split_create_then_pay' })
  @IsString()
  flowId: string;

  @ApiPropertyOptional({ enum: PagbankCheckoutPaymentMethod })
  @IsOptional()
  @IsEnum(PagbankCheckoutPaymentMethod)
  method?: PagbankCheckoutPaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PagbankPaymentDto)
  payment?: PagbankPaymentDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PagbankSplitCheckoutOptionsDto)
  splitOptions?: PagbankSplitCheckoutOptionsDto;
}

export class PagbankCaptureDto {
  @ApiPropertyOptional({ description: 'Valor em centavos para captura parcial' })
  @IsOptional()
  @IsInt()
  @Min(1)
  amountCents?: number;
}
