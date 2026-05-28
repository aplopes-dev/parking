import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PaymentMethod } from './pdv.enums';
import { Order } from './order.entity';

@Entity('order_payments')
export class OrderPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: string;

  @Column({ name: 'paid_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  paidAt: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: User | null;

  @Column({ name: 'created_by_user_id', nullable: true })
  createdByUserId: string | null;

  @Column({ name: 'pagbank_transaction_id', length: 120, nullable: true })
  pagbankTransactionId: string | null;

  @Column({ name: 'pagbank_transaction_code', length: 120, nullable: true })
  pagbankTransactionCode: string | null;

  @Column({ name: 'pagbank_nsu', length: 80, nullable: true })
  pagbankNsu: string | null;

  @Column({ name: 'pagbank_host_nsu', length: 80, nullable: true })
  pagbankHostNsu: string | null;

  @Column({ name: 'pagbank_auto_code', length: 80, nullable: true })
  pagbankAutoCode: string | null;

  @Column({ name: 'pagbank_card_brand', length: 40, nullable: true })
  pagbankCardBrand: string | null;

  @Column({ name: 'pagbank_pix_tx_id', length: 120, nullable: true })
  pagbankPixTxId: string | null;

  @Column({ name: 'pagbank_payment_type', type: 'int', nullable: true })
  pagbankPaymentType: number | null;

  @Column({ name: 'processed_on_terminal', default: false })
  processedOnTerminal: boolean;
}
