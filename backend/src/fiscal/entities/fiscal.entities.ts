import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { Order } from '../../pdv/entities/order.entity';
import { User } from '../../users/entities/user.entity';

export enum FiscalEnvironment {
  HOMOLOGATION = 'homologation',
  PRODUCTION = 'production',
}

export enum FiscalOrderType {
  SALE = 'sale',
  PURCHASE = 'purchase',
}

export enum FiscalOrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export enum FiscalReturnType {
  SALE_RETURN = 'sale_return',
  PURCHASE_RETURN = 'purchase_return',
}

export enum FiscalInvoiceType {
  NFE = 'nfe',
  NFCE = 'nfce',
}

export enum FiscalInvoiceDirection {
  EMITTED = 'emitted',
  RECEIVED = 'received',
}

export enum FiscalInvoiceStatus {
  DRAFT = 'draft',
  PROCESSING = 'processing',
  AUTHORIZED = 'authorized',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  VOIDED = 'voided',
}

@Entity('fiscal_settings')
export class FiscalSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', unique: true })
  tenantId: string;

  @Column({ name: 'legal_name', length: 255, default: '' })
  legalName: string;

  @Column({ name: 'trade_name', length: 255, nullable: true })
  tradeName?: string | null;

  @Column({ length: 18, nullable: true })
  cnpj?: string | null;

  @Column({ name: 'state_registration', length: 32, nullable: true })
  stateRegistration?: string | null;

  @Column({ name: 'municipal_registration', length: 32, nullable: true })
  municipalRegistration?: string | null;

  @Column({ name: 'tax_regime', length: 40, default: 'simples_nacional' })
  taxRegime: string;

  @Column({ type: 'enum', enum: FiscalEnvironment, default: FiscalEnvironment.HOMOLOGATION })
  environment: FiscalEnvironment;

  @Column({ name: 'nfe_series', type: 'int', default: 1 })
  nfeSeries: number;

  @Column({ name: 'nfce_series', type: 'int', default: 1 })
  nfceSeries: number;

  @Column({ name: 'last_nfe_number', type: 'int', default: 0 })
  lastNfeNumber: number;

  @Column({ name: 'last_nfce_number', type: 'int', default: 0 })
  lastNfceNumber: number;

  @Column({ name: 'certificate_hint', length: 255, nullable: true })
  certificateHint?: string | null;

  @Column({ name: 'sefaz_notes', type: 'text', nullable: true })
  sefazNotes?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('fiscal_orders')
export class FiscalOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'order_type', type: 'enum', enum: FiscalOrderType })
  orderType: FiscalOrderType;

  @Column({ type: 'enum', enum: FiscalOrderStatus, default: FiscalOrderStatus.DRAFT })
  status: FiscalOrderStatus;

  @Column({ name: 'reference_code', length: 40, nullable: true })
  referenceCode?: string | null;

  @Column({ name: 'pdv_order_id', nullable: true })
  pdvOrderId?: string | null;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pdv_order_id' })
  pdvOrder?: Order | null;

  @Column({ name: 'customer_id', nullable: true })
  customerId?: string | null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer | null;

  @Column({ name: 'counterparty_name' })
  counterpartyName: string;

  @Column({ name: 'counterparty_document', length: 20, nullable: true })
  counterpartyDocument?: string | null;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'created_by_user_id', nullable: true })
  createdByUserId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser?: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => FiscalOrderItem, (item) => item.fiscalOrder, { cascade: true })
  items: FiscalOrderItem[];
}

@Entity('fiscal_order_items')
export class FiscalOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'fiscal_order_id' })
  fiscalOrderId: string;

  @ManyToOne(() => FiscalOrder, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fiscal_order_id' })
  fiscalOrder: FiscalOrder;

  @Column({ name: 'product_name' })
  productName: string;

  @Column({ length: 12, nullable: true })
  ncm?: string | null;

  @Column({ length: 8, nullable: true })
  cfop?: string | null;

  @Column({ length: 10, default: 'UN' })
  unit: string;

  @Column({ type: 'decimal', precision: 14, scale: 4, default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 14, scale: 4, default: 0 })
  unitPrice: number;

  @Column({ name: 'total_price', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalPrice: number;
}

@Entity('fiscal_invoices')
export class FiscalInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'invoice_type', type: 'enum', enum: FiscalInvoiceType })
  invoiceType: FiscalInvoiceType;

  @Column({ type: 'enum', enum: FiscalInvoiceDirection })
  direction: FiscalInvoiceDirection;

  @Column({ type: 'enum', enum: FiscalInvoiceStatus, default: FiscalInvoiceStatus.DRAFT })
  status: FiscalInvoiceStatus;

  @Column({ type: 'int', nullable: true })
  number?: number | null;

  @Column({ type: 'int', default: 1 })
  series: number;

  @Column({ name: 'access_key', length: 44, nullable: true })
  accessKey?: string | null;

  @Column({ name: 'issue_date', type: 'timestamptz', nullable: true })
  issueDate?: Date | null;

  @Column({ name: 'counterparty_name', nullable: true })
  counterpartyName?: string | null;

  @Column({ name: 'counterparty_document', length: 20, nullable: true })
  counterpartyDocument?: string | null;

  @Column({ name: 'total_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ name: 'fiscal_order_id', nullable: true })
  fiscalOrderId?: string | null;

  @Column({ name: 'pdv_order_id', nullable: true })
  pdvOrderId?: string | null;

  @Column({ name: 'xml_storage_key', length: 512, nullable: true })
  xmlStorageKey?: string | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason?: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date | null;

  @Column({ name: 'rejection_message', type: 'text', nullable: true })
  rejectionMessage?: string | null;

  @Column({ name: 'created_by_user_id', nullable: true })
  createdByUserId?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('fiscal_returns')
export class FiscalReturn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'return_type', type: 'enum', enum: FiscalReturnType })
  returnType: FiscalReturnType;

  @Column({ name: 'fiscal_order_id', nullable: true })
  fiscalOrderId?: string | null;

  @ManyToOne(() => FiscalOrder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fiscal_order_id' })
  fiscalOrder?: FiscalOrder | null;

  @Column({ name: 'fiscal_invoice_id', nullable: true })
  fiscalInvoiceId?: string | null;

  @ManyToOne(() => FiscalInvoice, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fiscal_invoice_id' })
  fiscalInvoice?: FiscalInvoice | null;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'return_date', type: 'date' })
  returnDate: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ name: 'created_by_user_id', nullable: true })
  createdByUserId?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('fiscal_number_voids')
export class FiscalNumberVoid {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'invoice_type', type: 'enum', enum: FiscalInvoiceType })
  invoiceType: FiscalInvoiceType;

  @Column({ type: 'int' })
  series: number;

  @Column({ name: 'number_from', type: 'int' })
  numberFrom: number;

  @Column({ name: 'number_to', type: 'int' })
  numberTo: number;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'void_date', type: 'date' })
  voidDate: string;

  @Column({ name: 'created_by_user_id', nullable: true })
  createdByUserId?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('fiscal_accountants')
export class FiscalAccountant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ length: 32, nullable: true })
  crc?: string | null;

  @Column({ name: 'can_export', default: true })
  canExport: boolean;

  @Column({ name: 'can_emit', default: false })
  canEmit: boolean;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
