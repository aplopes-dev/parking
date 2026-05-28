import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('production_settings')
export class ProductionSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', unique: true })
  tenantId: string;

  @Column({ name: 'notify_on_kitchen_send', default: true })
  notifyOnKitchenSend: boolean;

  @Column({ name: 'notify_on_kitchen_ready', default: true })
  notifyOnKitchenReady: boolean;

  @Column({ name: 'sound_enabled', default: true })
  soundEnabled: boolean;

  @Column({ name: 'sla_warning_minutes', type: 'int', default: 15 })
  slaWarningMinutes: number;

  @Column({ name: 'auto_refresh_seconds', type: 'int', default: 30 })
  autoRefreshSeconds: number;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
