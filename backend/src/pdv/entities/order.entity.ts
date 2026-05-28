import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { User } from '../../users/entities/user.entity';
import { OrderType, OrderStatus } from './pdv.enums';
import { Comanda } from './comanda.entity';
import { OrderItem } from './order-item.entity';
import { OrderPayment } from './order-payment.entity';
import { BillSplit } from './bill-split.entity';

@Entity('orders')
@Unique(['tenantId', 'orderNumber'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'order_number', type: 'int' })
  orderNumber: number;

  @Column({ type: 'enum', enum: OrderType })
  type: OrderType;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.ABERTO })
  status: OrderStatus;

  @ManyToOne(() => Comanda, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'comanda_id' })
  comanda: Comanda | null;

  @Column({ name: 'comanda_id', nullable: true })
  comandaId: string | null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @Column({ name: 'customer_id', nullable: true })
  customerId: string | null;

  @Column({ name: 'table_label', length: 40, nullable: true })
  tableLabel: string | null;

  @Column({ name: 'table_id', nullable: true })
  tableId: string | null;

  @Column({ name: 'guest_count', type: 'int', nullable: true })
  guestCount: number | null;

  @Column({ name: 'waiter_name', length: 80, nullable: true })
  waiterName: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  subtotal: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  discount: string;

  @Column({ name: 'service_fee', type: 'decimal', precision: 14, scale: 2, default: 0 })
  serviceFee: string;

  /** Quando true, a taxa de serviço é recalculada como % do subtotal a cada alteração de itens. */
  @Column({ name: 'service_fee_auto', default: false })
  serviceFeeAuto: boolean;

  @Column({ name: 'delivery_fee', type: 'decimal', precision: 14, scale: 2, default: 0 })
  deliveryFee: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'delivery_address', type: 'text', nullable: true })
  deliveryAddress: string | null;

  @Column({ name: 'delivery_lat', type: 'decimal', precision: 10, scale: 7, nullable: true })
  deliveryLat: string | null;

  @Column({ name: 'delivery_lng', type: 'decimal', precision: 10, scale: 7, nullable: true })
  deliveryLng: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'opened_by_user_id' })
  openedByUser: User | null;

  @Column({ name: 'opened_by_user_id', nullable: true })
  openedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'closed_by_user_id' })
  closedByUser: User | null;

  @Column({ name: 'closed_by_user_id', nullable: true })
  closedByUserId: string | null;

  @Column({ name: 'opened_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  openedAt: Date;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date | null;

  /** Conta encerrada no SmartPOS (aguardando pagamento); independente do status cozinha. */
  @Column({ name: 'account_closed_at', type: 'timestamp', nullable: true })
  accountClosedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(() => OrderPayment, (payment) => payment.order, { cascade: true })
  payments: OrderPayment[];

  @OneToMany(() => BillSplit, (split) => split.order, { cascade: true })
  billSplits: BillSplit[];
}
