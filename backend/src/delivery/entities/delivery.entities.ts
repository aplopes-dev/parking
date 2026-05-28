import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../pdv/entities/order.entity';

export enum DeliveryCourierStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  OFFLINE = 'offline',
}

export enum DeliveryAssignmentStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

@Entity('delivery_couriers')
export class DeliveryCourier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 32, nullable: true })
  phone?: string | null;

  @Column({ length: 40, default: 'moto' })
  vehicle: string;

  @Column({ type: 'enum', enum: DeliveryCourierStatus, default: DeliveryCourierStatus.AVAILABLE })
  status: DeliveryCourierStatus;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('delivery_routes')
export class DeliveryRoute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 120 })
  name: string;

  @Column({ name: 'zone_label', length: 80, nullable: true })
  zoneLabel?: string | null;

  @Column({ length: 16, default: '#ea1d2c' })
  color: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('delivery_assignments')
export class DeliveryAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'order_id', unique: true })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'courier_id', nullable: true })
  courierId?: string | null;

  @ManyToOne(() => DeliveryCourier, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'courier_id' })
  courier?: DeliveryCourier | null;

  @Column({ name: 'route_id', nullable: true })
  routeId?: string | null;

  @ManyToOne(() => DeliveryRoute, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'route_id' })
  route?: DeliveryRoute | null;

  @Column({
    type: 'enum',
    enum: DeliveryAssignmentStatus,
    default: DeliveryAssignmentStatus.PENDING,
  })
  status: DeliveryAssignmentStatus;

  @Column({ name: 'assigned_at', type: 'timestamptz', nullable: true })
  assignedAt?: Date | null;

  @Column({ name: 'picked_up_at', type: 'timestamptz', nullable: true })
  pickedUpAt?: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
