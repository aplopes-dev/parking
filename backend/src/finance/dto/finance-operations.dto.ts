import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  FinanceAdvanceStatus,
  FinanceBillStatus,
  FinanceBillType,
  FinanceCardReceivableStatus,
  FinancePrepaidMovementType,
  FinanceRecurringFrequency,
} from '../entities/finance-extended.entities';
import { FinanceTransactionType } from '../entities/finance.entities';

export class CreateFinanceBillDto {
  @IsEnum(FinanceBillType)
  billType: FinanceBillType;

  @IsString()
  description: string;

  @IsString()
  counterpartyName: string;

  @IsOptional()
  @IsString()
  counterpartyDocument?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SettleBillsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  billIds: string[];

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsDateString()
  paymentDate: string;

  @IsUUID()
  accountId: string;
}

export class SettleByCounterpartyDto {
  @IsString()
  counterpartyName: string;

  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsUUID()
  accountId: string;

  @IsDateString()
  paymentDate: string;
}

export class CreateFinanceTransferDto {
  @IsUUID()
  fromAccountId: string;

  @IsUUID()
  toAccountId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsDateString()
  transferDate: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateRecurringRuleDto {
  @IsString()
  description: string;

  @IsEnum(FinanceTransactionType)
  type: FinanceTransactionType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsEnum(FinanceRecurringFrequency)
  frequency: FinanceRecurringFrequency;

  @IsDateString()
  nextDueDate: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  sourceId?: string;
}

export class CreateAdvanceDto {
  @IsUUID()
  userId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsDateString()
  advanceDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePayrollRunDto {
  @IsString()
  reference: string;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;
}

export class CreatePayrollLineDto {
  @IsUUID()
  userId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  grossAmount: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  deductions: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class OpenCashSessionDto {
  @IsUUID()
  accountId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingBalance: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseCashSessionDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  countedBalance: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpsertDailyReconciliationDto {
  @IsDateString()
  reconciliationDate: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  cashCounted?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateCardReceivableDto {
  @IsDateString()
  referenceDate: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  grossAmount: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  feeAmount: number;

  @IsOptional()
  @IsString()
  acquirer?: string;

  @IsOptional()
  @IsDateString()
  expectedDepositDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateBankStatementLineDto {
  @IsUUID()
  accountId: string;

  @IsDateString()
  lineDate: string;

  @IsString()
  description: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount: number;
}

export class MatchBankLineDto {
  @IsUUID()
  transactionId: string;
}

export class CreatePrepaidWalletDto {
  @IsString()
  holderName: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;
}

export class PrepaidMovementDto {
  @IsEnum(FinancePrepaidMovementType)
  movementType: FinancePrepaidMovementType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateReceiptDto {
  @IsString()
  issuedTo: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsString()
  description: string;

  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @IsOptional()
  @IsUUID()
  transactionId?: string;
}

export class FinancePeriodQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class FinanceCalendarQueryDto {
  @IsString()
  month: string;
}

export class UpdateBillStatusDto {
  @IsEnum(FinanceBillStatus)
  status: FinanceBillStatus;
}

export class UpdateCardReceivableDto {
  @IsOptional()
  @IsEnum(FinanceCardReceivableStatus)
  status?: FinanceCardReceivableStatus;

  @IsOptional()
  @IsDateString()
  expectedDepositDate?: string;
}
