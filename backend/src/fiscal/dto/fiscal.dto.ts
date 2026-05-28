import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  FiscalEnvironment,
  FiscalInvoiceDirection,
  FiscalInvoiceStatus,
  FiscalInvoiceType,
  FiscalOrderStatus,
  FiscalOrderType,
  FiscalReturnType,
} from '../entities/fiscal.entities';

export class UpdateFiscalSettingsDto {
  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() tradeName?: string;
  @IsOptional() @IsString() cnpj?: string;
  @IsOptional() @IsString() stateRegistration?: string;
  @IsOptional() @IsString() municipalRegistration?: string;
  @IsOptional() @IsString() taxRegime?: string;
  @IsOptional() @IsEnum(FiscalEnvironment) environment?: FiscalEnvironment;
  @IsOptional() @IsInt() nfeSeries?: number;
  @IsOptional() @IsInt() nfceSeries?: number;
  @IsOptional() @IsString() certificateHint?: string;
  @IsOptional() @IsString() sefazNotes?: string;
}

export class FiscalOrderItemDto {
  @IsString() productName: string;
  @IsOptional() @IsString() ncm?: string;
  @IsOptional() @IsString() cfop?: string;
  @IsOptional() @IsString() unit?: string;
  @Type(() => Number) @Min(0.0001) quantity: number;
  @Type(() => Number) @Min(0) unitPrice: number;
}

export class CreateFiscalOrderDto {
  @IsEnum(FiscalOrderType) orderType: FiscalOrderType;
  @IsOptional() @IsString() referenceCode?: string;
  @IsOptional() @IsUUID() pdvOrderId?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsString() counterpartyName: string;
  @IsOptional() @IsString() counterpartyDocument?: string;
  @IsDateString() issueDate: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => FiscalOrderItemDto)
  items: FiscalOrderItemDto[];
}

export class UpdateFiscalOrderDto {
  @IsOptional() @IsEnum(FiscalOrderStatus) status?: FiscalOrderStatus;
  @IsOptional() @IsString() counterpartyName?: string;
  @IsOptional() @IsString() counterpartyDocument?: string;
  @IsOptional() @IsDateString() issueDate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => FiscalOrderItemDto)
  items?: FiscalOrderItemDto[];
}

export class FiscalOrdersQueryDto {
  @IsOptional() @IsEnum(FiscalOrderType) orderType?: FiscalOrderType;
  @IsOptional() @IsEnum(FiscalOrderStatus) status?: FiscalOrderStatus;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class CreateFiscalReturnDto {
  @IsEnum(FiscalReturnType) returnType: FiscalReturnType;
  @IsOptional() @IsUUID() fiscalOrderId?: string;
  @IsOptional() @IsUUID() fiscalInvoiceId?: string;
  @IsString() reason: string;
  @IsDateString() returnDate: string;
  @Type(() => Number) @Min(0) totalAmount: number;
}

export class UpdateFiscalReturnDto {
  @IsOptional() @IsEnum(FiscalReturnType) returnType?: FiscalReturnType;
  @IsOptional() @IsUUID() fiscalOrderId?: string;
  @IsOptional() @IsUUID() fiscalInvoiceId?: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsDateString() returnDate?: string;
  @IsOptional() @Type(() => Number) @Min(0) totalAmount?: number;
}

export const FISCAL_RETURN_SORT_FIELDS = [
  'createdAt',
  'returnDate',
  'returnType',
  'totalAmount',
  'reason',
] as const;

export type FiscalReturnSortField = (typeof FISCAL_RETURN_SORT_FIELDS)[number];

export class FiscalReturnsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(FISCAL_RETURN_SORT_FIELDS)
  sortBy?: FiscalReturnSortField;

  @IsOptional()
  @IsEnum(FiscalReturnType)
  returnType?: FiscalReturnType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}/)
  dateFrom?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}/)
  dateTo?: string;
}

export class FiscalInvoicesQueryDto {
  @IsOptional() @IsEnum(FiscalInvoiceType) invoiceType?: FiscalInvoiceType;
  @IsOptional() @IsEnum(FiscalInvoiceDirection) direction?: FiscalInvoiceDirection;
  @IsOptional() @IsEnum(FiscalInvoiceStatus) status?: FiscalInvoiceStatus;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class EmitFiscalInvoiceDto {
  @IsEnum(FiscalInvoiceType) invoiceType: FiscalInvoiceType;
  @IsOptional() @IsUUID() fiscalOrderId?: string;
  @IsOptional() @IsUUID() pdvOrderId?: string;
  @IsOptional() @IsString() counterpartyName?: string;
  @IsOptional() @IsString() counterpartyDocument?: string;
}

export class CancelFiscalInvoiceDto {
  @IsString() reason: string;
}

export class ImportFiscalInvoiceDto {
  @IsOptional() @IsString() xmlContent?: string;
  @IsOptional() @IsEnum(FiscalInvoiceType) invoiceType?: FiscalInvoiceType;
}

export class CreateFiscalNumberVoidDto {
  @IsEnum(FiscalInvoiceType) invoiceType: FiscalInvoiceType;
  @IsInt() series: number;
  @IsInt() numberFrom: number;
  @IsInt() numberTo: number;
  @IsString() reason: string;
  @IsDateString() voidDate: string;
}

export class CreateFiscalAccountantDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsOptional() @IsUUID() userId?: string;
  @IsOptional() @IsString() crc?: string;
  @IsOptional() @IsBoolean() canExport?: boolean;
  @IsOptional() @IsBoolean() canEmit?: boolean;
}

export class UpdateFiscalAccountantDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsUUID() userId?: string;
  @IsOptional() @IsString() crc?: string;
  @IsOptional() @IsBoolean() canExport?: boolean;
  @IsOptional() @IsBoolean() canEmit?: boolean;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateFiscalOrderFromPdvDto {
  @IsUUID() pdvOrderId: string;
  @IsEnum(FiscalOrderType) orderType: FiscalOrderType;
}
