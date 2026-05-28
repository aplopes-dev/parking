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
import { MenuChannel } from './menu.enums';

@Entity('menu_settings')
@Unique(['tenantId', 'channel'])
export class MenuSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'enum', enum: MenuChannel })
  channel: MenuChannel;

  @Column({ length: 200, default: 'Cardápio' })
  title: string;

  @Column({ name: 'welcome_message', type: 'text', nullable: true })
  welcomeMessage: string | null;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'service_fee_enabled', default: false })
  serviceFeeEnabled: boolean;

  @Column({ name: 'service_fee_percent', type: 'decimal', precision: 5, scale: 2, default: 10 })
  serviceFeePercent: string;

  @Column({ name: 'min_order_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  minOrderAmount: string;

  @Column({ name: 'estimated_minutes', type: 'int', default: 40 })
  estimatedMinutes: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
