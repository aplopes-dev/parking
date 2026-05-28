import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Order } from '../../pdv/entities/order.entity';

export enum PagbankTransactionStatus {
  CREATED = 'created',
  WAITING_PAYMENT = 'waiting_payment',
  PAID = 'paid',
  DECLINED = 'declined',
  CANCELED = 'canceled',
  ERROR = 'error',
}

@Entity('pagbank_transactions')
export class PagbankTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order: Order | null;

  @Column({ name: 'order_id', nullable: true })
  orderId: string | null;

  @Column({ name: 'flow_id', length: 64 })
  flowId: string;

  @Column({ name: 'pagbank_order_id', length: 80, nullable: true })
  pagbankOrderId: string | null;

  @Column({ name: 'pagbank_checkout_id', length: 80, nullable: true })
  pagbankCheckoutId: string | null;

  @Column({ name: 'charge_id', length: 80, nullable: true })
  chargeId: string | null;

  @Column({ name: 'pagbank_split_id', length: 80, nullable: true })
  pagbankSplitId: string | null;

  @Column({
    type: 'enum',
    enum: PagbankTransactionStatus,
    default: PagbankTransactionStatus.CREATED,
  })
  status: PagbankTransactionStatus;

  @Column({ name: 'payment_method', length: 40, nullable: true })
  paymentMethod: string | null;

  @Column({ name: 'amount_cents', type: 'int', default: 0 })
  amountCents: number;

  @Column({ length: 3, default: 'BRL' })
  currency: string;

  @Column({ name: 'checkout_data', type: 'jsonb', nullable: true })
  checkoutData: Record<string, unknown> | null;

  @Column({ name: 'raw_create', type: 'jsonb', nullable: true })
  rawCreate: Record<string, unknown> | null;

  @Column({ name: 'raw_pay', type: 'jsonb', nullable: true })
  rawPay: Record<string, unknown> | null;

  @Column({ name: 'raw_last_event', type: 'jsonb', nullable: true })
  rawLastEvent: Record<string, unknown> | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
