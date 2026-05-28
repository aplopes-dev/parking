import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Order } from '../../pdv/entities/order.entity';

@Entity('restaurant_tables')
@Unique(['tenantId', 'number'])
export class RestaurantTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'int' })
  number: number;

  @Column({ type: 'int', default: 4 })
  capacity: number;

  @Column({ length: 80, default: 'Salão' })
  zone: string;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'current_order_id', nullable: true })
  currentOrderId: string | null;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'current_order_id' })
  currentOrder: Order | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
