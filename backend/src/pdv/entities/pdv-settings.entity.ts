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

@Entity('pdv_settings')
@Unique(['tenantId'])
export class PdvSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'default_service_fee_percent', type: 'decimal', precision: 5, scale: 2, default: 10 })
  defaultServiceFeePercent: string;

  @Column({ name: 'allow_split_bill', default: true })
  allowSplitBill: boolean;

  @Column({ name: 'maps_enabled', default: false })
  mapsEnabled: boolean;

  @Column({ name: 'maps_embed_url', type: 'text', nullable: true })
  mapsEmbedUrl: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
