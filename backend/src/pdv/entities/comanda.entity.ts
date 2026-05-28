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
import { ComandaStatus } from './pdv.enums';
import { Order } from './order.entity';

@Entity('comandas')
@Unique(['tenantId', 'number'])
export class Comanda {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'int' })
  number: number;

  @Column({ length: 80, nullable: true })
  label: string | null;

  @Column({ type: 'enum', enum: ComandaStatus, default: ComandaStatus.LIVRE })
  status: ComandaStatus;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'current_order_id' })
  currentOrder: Order | null;

  @Column({ name: 'current_order_id', nullable: true })
  currentOrderId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
