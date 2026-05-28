import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FinanceBill } from '../../finance/entities/finance-extended.entities';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { SubscriptionBillStatus } from './parking.enums';
import { ParkingSubscription } from './parking-subscription.entity';

@Entity('parking_subscription_bills')
export class ParkingSubscriptionBill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ name: 'subscription_id', type: 'uuid' })
  subscriptionId: string;

  @ManyToOne(() => ParkingSubscription, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription?: ParkingSubscription;

  @Column({ name: 'reference_month', type: 'varchar', length: 7 })
  referenceMonth: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: string;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({ name: 'finance_bill_id', type: 'uuid', nullable: true })
  financeBillId: string | null;

  @ManyToOne(() => FinanceBill, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'finance_bill_id' })
  financeBill?: FinanceBill | null;

  @Column({ type: 'varchar', length: 24, default: SubscriptionBillStatus.PENDING })
  status: SubscriptionBillStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'pagbank_transaction_id', type: 'uuid', nullable: true })
  pagbankTransactionId: string | null;

  @Column({ name: 'payment_method', type: 'varchar', length: 24, nullable: true })
  paymentMethod: string | null;

  @Column({ name: 'pix_copy_paste', type: 'text', nullable: true })
  pixCopyPaste: string | null;

  @Column({ name: 'pix_qr_code', type: 'text', nullable: true })
  pixQrCode: string | null;

  @Column({ name: 'boleto_pdf_url', type: 'text', nullable: true })
  boletoPdfUrl: string | null;

  @Column({ name: 'boleto_barcode', type: 'varchar', length: 80, nullable: true })
  boletoBarcode: string | null;

  @Column({ name: 'auto_charge_error', type: 'text', nullable: true })
  autoChargeError: string | null;

  @Column({ name: 'charged_at', type: 'timestamptz', nullable: true })
  chargedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
