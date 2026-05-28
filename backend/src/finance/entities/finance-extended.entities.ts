import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import {
  FinanceAccount,
  FinanceCategory,
  FinanceSource,
  FinanceTransaction,
  FinanceTransactionType,
} from './finance.entities';

export enum FinanceBillType {
  PAYABLE = 'payable',
  RECEIVABLE = 'receivable',
}

export enum FinanceBillStatus {
  OPEN = 'open',
  PARTIAL = 'partial',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export enum FinanceRecurringFrequency {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum FinanceAdvanceStatus {
  OPEN = 'open',
  SETTLED = 'settled',
  CANCELLED = 'cancelled',
}

export enum FinancePayrollStatus {
  DRAFT = 'draft',
  CLOSED = 'closed',
}

export enum FinanceCashSessionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export enum FinanceCardReceivableStatus {
  PENDING = 'pending',
  DEPOSITED = 'deposited',
}

export enum FinancePrepaidMovementType {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

/** Contas a pagar / a receber (fornecedor, aluguel, eventos corporativos). */
@Entity('finance_bills')
export class FinanceBill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({
    name: 'bill_type',
    type: 'enum',
    enum: FinanceBillType,
    enumName: 'finance_bill_type_enum',
  })
  billType: FinanceBillType;

  @Column()
  description: string;

  @Column({ name: 'counterparty_name' })
  counterpartyName: string;

  @Column({ name: 'counterparty_document', nullable: true })
  counterpartyDocument?: string | null;

  @Column('decimal', { precision: 14, scale: 2 })
  amount: number;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({
    type: 'enum',
    enum: FinanceBillStatus,
    enumName: 'finance_bill_status_enum',
    default: FinanceBillStatus.OPEN,
  })
  status: FinanceBillStatus;

  @Column({ name: 'account_id', nullable: true })
  accountId?: string | null;

  @ManyToOne(() => FinanceAccount, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'account_id' })
  account?: FinanceAccount | null;

  @Column({ name: 'category_id', nullable: true })
  categoryId?: string | null;

  @ManyToOne(() => FinanceCategory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category?: FinanceCategory | null;

  @Column({ name: 'customer_id', nullable: true })
  customerId?: string | null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer | null;

  @Column('text', { nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('finance_transfers')
export class FinanceTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'from_account_id' })
  fromAccountId: string;

  @Column({ name: 'to_account_id' })
  toAccountId: string;

  @Column('decimal', { precision: 14, scale: 2 })
  amount: number;

  @Column({ name: 'transfer_date', type: 'date' })
  transferDate: string;

  @Column({ nullable: true })
  description?: string | null;

  @Column({ name: 'out_transaction_id', nullable: true })
  outTransactionId?: string | null;

  @Column({ name: 'in_transaction_id', nullable: true })
  inTransactionId?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('finance_recurring_rules')
export class FinanceRecurringRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: FinanceTransactionType,
    enumName: 'finance_transactions_type_enum',
  })
  type: FinanceTransactionType;

  @Column('decimal', { precision: 14, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: FinanceRecurringFrequency,
    enumName: 'finance_recurring_frequency_enum',
  })
  frequency: FinanceRecurringFrequency;

  @Column({ name: 'next_due_date', type: 'date' })
  nextDueDate: string;

  @Column({ name: 'account_id', nullable: true })
  accountId?: string | null;

  @Column({ name: 'category_id', nullable: true })
  categoryId?: string | null;

  @Column({ name: 'source_id', nullable: true })
  sourceId?: string | null;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('finance_employee_advances')
export class FinanceEmployeeAdvance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('decimal', { precision: 14, scale: 2 })
  amount: number;

  @Column({ name: 'advance_date', type: 'date' })
  advanceDate: string;

  @Column({
    type: 'enum',
    enum: FinanceAdvanceStatus,
    enumName: 'finance_advance_status_enum',
    default: FinanceAdvanceStatus.OPEN,
  })
  status: FinanceAdvanceStatus;

  @Column('text', { nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('finance_payroll_runs')
export class FinancePayrollRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column()
  reference: string;

  @Column({ name: 'period_start', type: 'date' })
  periodStart: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd: string;

  @Column({
    type: 'enum',
    enum: FinancePayrollStatus,
    enumName: 'finance_payroll_status_enum',
    default: FinancePayrollStatus.DRAFT,
  })
  status: FinancePayrollStatus;

  @Column({ name: 'total_net', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalNet: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('finance_payroll_lines')
export class FinancePayrollLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payroll_run_id' })
  payrollRunId: string;

  @ManyToOne(() => FinancePayrollRun, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payroll_run_id' })
  payrollRun: FinancePayrollRun;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'gross_amount', type: 'decimal', precision: 14, scale: 2 })
  grossAmount: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  deductions: number;

  @Column({ name: 'net_amount', type: 'decimal', precision: 14, scale: 2 })
  netAmount: number;

  @Column('text', { nullable: true })
  notes?: string | null;
}

@Entity('finance_cash_sessions')
export class FinanceCashSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'account_id' })
  accountId: string;

  @ManyToOne(() => FinanceAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: FinanceAccount;

  @Column({
    type: 'enum',
    enum: FinanceCashSessionStatus,
    enumName: 'finance_cash_session_status_enum',
    default: FinanceCashSessionStatus.OPEN,
  })
  status: FinanceCashSessionStatus;

  @Column({ name: 'opened_at', type: 'timestamptz' })
  openedAt: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt?: Date | null;

  @Column({ name: 'opening_balance', type: 'decimal', precision: 14, scale: 2, default: 0 })
  openingBalance: number;

  @Column({ name: 'expected_balance', type: 'decimal', precision: 14, scale: 2, nullable: true })
  expectedBalance?: number | null;

  @Column({ name: 'counted_balance', type: 'decimal', precision: 14, scale: 2, nullable: true })
  countedBalance?: number | null;

  @Column({ name: 'opened_by_user_id', nullable: true })
  openedByUserId?: string | null;

  @Column({ name: 'closed_by_user_id', nullable: true })
  closedByUserId?: string | null;

  @Column({ name: 'facility_id', type: 'uuid', nullable: true })
  facilityId?: string | null;

  @Column('text', { nullable: true })
  notes?: string | null;
}

@Entity('finance_daily_reconciliations')
export class FinanceDailyReconciliation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'reconciliation_date', type: 'date' })
  reconciliationDate: string;

  @Column({ name: 'pdv_sales_total', type: 'decimal', precision: 14, scale: 2, default: 0 })
  pdvSalesTotal: number;

  @Column({ name: 'finance_income_total', type: 'decimal', precision: 14, scale: 2, default: 0 })
  financeIncomeTotal: number;

  @Column({ name: 'cash_counted', type: 'decimal', precision: 14, scale: 2, nullable: true })
  cashCounted?: number | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  difference: number;

  @Column('text', { nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('finance_card_receivables')
export class FinanceCardReceivable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'reference_date', type: 'date' })
  referenceDate: string;

  @Column({ default: 'PagBank / adquirente' })
  acquirer: string;

  @Column({ name: 'gross_amount', type: 'decimal', precision: 14, scale: 2 })
  grossAmount: number;

  @Column({ name: 'fee_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  feeAmount: number;

  @Column({ name: 'net_amount', type: 'decimal', precision: 14, scale: 2 })
  netAmount: number;

  @Column({ name: 'expected_deposit_date', type: 'date', nullable: true })
  expectedDepositDate?: string | null;

  @Column({
    type: 'enum',
    enum: FinanceCardReceivableStatus,
    enumName: 'finance_card_receivable_status_enum',
    default: FinanceCardReceivableStatus.PENDING,
  })
  status: FinanceCardReceivableStatus;

  @Column({ name: 'transaction_id', nullable: true })
  transactionId?: string | null;

  @ManyToOne(() => FinanceTransaction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'transaction_id' })
  transaction?: FinanceTransaction | null;

  @Column('text', { nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('finance_bank_statement_lines')
export class FinanceBankStatementLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'account_id' })
  accountId: string;

  @Column({ name: 'line_date', type: 'date' })
  lineDate: string;

  @Column()
  description: string;

  @Column('decimal', { precision: 14, scale: 2 })
  amount: number;

  @Column({ name: 'matched_transaction_id', nullable: true })
  matchedTransactionId?: string | null;

  @ManyToOne(() => FinanceTransaction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'matched_transaction_id' })
  matchedTransaction?: FinanceTransaction | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('finance_prepaid_wallets')
export class FinancePrepaidWallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'holder_name' })
  holderName: string;

  @Column({ name: 'customer_id', nullable: true })
  customerId?: string | null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  balance: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('finance_prepaid_movements')
export class FinancePrepaidMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet_id' })
  walletId: string;

  @ManyToOne(() => FinancePrepaidWallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: FinancePrepaidWallet;

  @Column({
    name: 'movement_type',
    type: 'enum',
    enum: FinancePrepaidMovementType,
    enumName: 'finance_prepaid_movement_type_enum',
  })
  movementType: FinancePrepaidMovementType;

  @Column('decimal', { precision: 14, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  description?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('finance_receipts')
export class FinanceReceipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'receipt_number', type: 'varchar', length: 32 })
  receiptNumber: string;

  @Column({ name: 'issued_to' })
  issuedTo: string;

  @Column('decimal', { precision: 14, scale: 2 })
  amount: number;

  @Column()
  description: string;

  @Column({ name: 'issued_at', type: 'date' })
  issuedAt: string;

  @Column({ name: 'transaction_id', nullable: true })
  transactionId?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
