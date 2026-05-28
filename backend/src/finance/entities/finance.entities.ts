import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

export enum FinanceTransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export enum FinanceAccountType {
  CASH = 'cash',
  BANK = 'bank',
  CARD = 'card',
  DIGITAL = 'digital',
  OTHER = 'other',
}

export enum FinanceCategoryLevel {
  MACRO = 'macro',
  MEDIUM = 'medium',
  MICRO = 'micro',
}

export enum FinanceTransactionOrigin {
  MANUAL = 'manual',
  TRANSFER = 'transfer',
  BILL = 'bill',
  RECURRING = 'recurring',
  PAYROLL = 'payroll',
  ADVANCE = 'advance',
  PDV = 'pdv',
  CARD = 'card',
  PREPAID = 'prepaid',
  PARKING = 'parking',
}

@Entity('finance_accounts')
export class FinanceAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: FinanceAccountType,
    default: FinanceAccountType.BANK,
  })
  type: FinanceAccountType;

  @Column('text', { nullable: true })
  description?: string | null;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('finance_sources')
export class FinanceSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: FinanceTransactionType })
  type: FinanceTransactionType;

  @Column('text', { nullable: true })
  description?: string | null;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('finance_categories')
export class FinanceCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: FinanceTransactionType })
  type: FinanceTransactionType;

  @Column({ type: 'enum', enum: FinanceCategoryLevel })
  level: FinanceCategoryLevel;

  @Column({ name: 'parent_id', nullable: true })
  parentId?: string | null;

  @ManyToOne(() => FinanceCategory, (c) => c.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: FinanceCategory | null;

  @OneToMany(() => FinanceCategory, (c) => c.parent)
  children: FinanceCategory[];

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('finance_tags')
@Unique(['tenantId', 'name'])
export class FinanceTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column()
  name: string;

  @Column({ default: '#2563eb' })
  color: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToMany(() => FinanceTransaction, (tx) => tx.tags)
  transactions: FinanceTransaction[];
}

@Entity('finance_transactions')
export class FinanceTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser?: User | null;

  @Column({ type: 'enum', enum: FinanceTransactionType })
  type: FinanceTransactionType;

  @Column()
  description: string;

  @Column('decimal', { precision: 14, scale: 2 })
  amount: number;

  @Column({ name: 'transaction_date', type: 'date' })
  transactionDate: string;

  @Column('text', { nullable: true })
  notes?: string | null;

  @Column({ name: 'account_id', nullable: true })
  accountId?: string | null;

  @ManyToOne(() => FinanceAccount, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'account_id' })
  account?: FinanceAccount | null;

  @Column({ name: 'source_id', nullable: true })
  sourceId?: string | null;

  @ManyToOne(() => FinanceSource, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_id' })
  source?: FinanceSource | null;

  @Column({ name: 'category_id', nullable: true })
  categoryId?: string | null;

  @ManyToOne(() => FinanceCategory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category?: FinanceCategory | null;

  @ManyToMany(() => FinanceTag, (tag) => tag.transactions)
  @JoinTable({
    name: 'finance_transaction_tags',
    joinColumn: { name: 'transaction_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: FinanceTag[];

  @Column({ name: 'attachment_key', type: 'varchar', length: 512, nullable: true })
  attachmentKey?: string | null;

  @Column({ name: 'attachment_mime_type', type: 'varchar', length: 255, nullable: true })
  attachmentMimeType?: string | null;

  @Column({ name: 'attachment_original_name', type: 'varchar', length: 500, nullable: true })
  attachmentOriginalName?: string | null;

  @Column({
    type: 'varchar',
    length: 24,
    default: FinanceTransactionOrigin.MANUAL,
  })
  origin: FinanceTransactionOrigin;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId?: string | null;

  @Column({ name: 'cash_session_id', type: 'uuid', nullable: true })
  cashSessionId?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
