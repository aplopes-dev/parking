import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Order } from './order.entity';
import { OrderItemKitchenStatus } from './order-item-kitchen.enums';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'product_name', length: 200 })
  productName: string;

  @Column({ type: 'decimal', precision: 14, scale: 4, default: 1 })
  quantity: string;

  @Column({ name: 'unit_price', type: 'decimal', precision: 14, scale: 2 })
  unitPrice: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  total: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({
    name: 'kitchen_status',
    type: 'enum',
    enum: OrderItemKitchenStatus,
    default: OrderItemKitchenStatus.PENDENTE,
  })
  kitchenStatus: OrderItemKitchenStatus;

  /** Momento em que o item entrou na fila da cozinha (KDS). */
  @Column({ name: 'kitchen_sent_at', type: 'timestamp', nullable: true })
  kitchenSentAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
