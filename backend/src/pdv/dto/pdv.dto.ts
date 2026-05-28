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
import {
  ComandaStatus,
  OrderStatus,
  OrderType,
  PaymentMethod,
} from '../entities/pdv.enums';

export class UpdatePdvSettingsDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  defaultServiceFeePercent?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  allowSplitBill?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  mapsEnabled?: boolean;

  @IsString()
  @IsOptional()
  mapsEmbedUrl?: string | null;
}

export class CreateComandaDto {
  @IsInt()
  @Min(1)
  number: number;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  label?: string;
}

export class UpdateComandaDto {
  @IsString()
  @IsOptional()
  @MaxLength(80)
  label?: string;

  @IsEnum(ComandaStatus)
  @IsOptional()
  status?: ComandaStatus;
}

export class CreateOrderDto {
  @IsEnum(OrderType)
  type: OrderType;

  @IsUUID()
  @IsOptional()
  comandaId?: string;

  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  tableLabel?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  deliveryAddress?: string;

  @IsNumber()
  @IsOptional()
  deliveryLat?: number;

  @IsNumber()
  @IsOptional()
  deliveryLng?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? 0 : Number(value)))
  deliveryFee?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  applyServiceFee?: boolean;

  @IsUUID()
  @IsOptional()
  tableId?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  guestCount?: number;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  waiterName?: string;
}

export class UpdateOrderDetailsDto {
  @IsUUID()
  @IsOptional()
  customerId?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  tableLabel?: string | null;

  @IsUUID()
  @IsOptional()
  tableId?: string | null;

  @IsString()
  @IsOptional()
  notes?: string | null;

  @IsString()
  @IsOptional()
  deliveryAddress?: string | null;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

export class AddOrderItemDto {
  @IsUUID()
  productId: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Transform(({ value }) => Number(value))
  quantity: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateOrderItemDto {
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  quantity?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateOrderFeesDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  discount?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  serviceFee?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  deliveryFee?: number;
}

export class PaymentEntryDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Transform(({ value }) => Number(value))
  amount: number;
}

export class CloseOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentEntryDto)
  payments: PaymentEntryDto[];
}

export class BillSplitEntryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Transform(({ value }) => Number(value))
  amount: number;
}

export class SetBillSplitsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillSplitEntryDto)
  splits: BillSplitEntryDto[];
}

export class PagBankMetaDto {
  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsString()
  @IsOptional()
  transactionCode?: string;

  @IsString()
  @IsOptional()
  hostNsu?: string;

  @IsString()
  @IsOptional()
  nsu?: string;

  @IsString()
  @IsOptional()
  autoCode?: string;

  @IsString()
  @IsOptional()
  cardBrand?: string;

  @IsString()
  @IsOptional()
  pixTxIdCode?: string;

  @IsInt()
  @IsOptional()
  plugPagPaymentType?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  processedOnTerminal?: boolean;
}

export class AddOrderPaymentDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Transform(({ value }) => Number(value))
  amount: number;

  @ValidateNested()
  @Type(() => PagBankMetaDto)
  @IsOptional()
  pagBank?: PagBankMetaDto;
}
