import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum WaiterNotificationStatus {
  PENDING = 'pending',
  READ = 'read',
  DELIVERED = 'delivered',
}

@Entity('waiter_table_notifications')
export class WaiterTableNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'target_user_id' })
  targetUserId: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'order_item_id' })
  orderItemId: string;

  @Column({ name: 'order_number', type: 'int' })
  orderNumber: number;

  @Column({ name: 'table_number', type: 'int', nullable: true })
  tableNumber: number | null;

  @Column({ name: 'table_label', length: 40, nullable: true })
  tableLabel: string | null;

  @Column({ length: 40, nullable: true })
  zone: string | null;

  @Column({ name: 'product_name', length: 200 })
  productName: string;

  @Column({ type: 'decimal', precision: 14, scale: 4 })
  quantity: string;

  @Column({
    type: 'enum',
    enum: WaiterNotificationStatus,
    default: WaiterNotificationStatus.PENDING,
  })
  status: WaiterNotificationStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
