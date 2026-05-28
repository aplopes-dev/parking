import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('analytics_online_access_log')
export class AnalyticsOnlineAccessLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 32 })
  channel: string;

  @Column({ length: 64, default: 'menu' })
  source: string;

  @Column({ name: 'accessed_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  accessedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;
}

@Entity('analytics_kpi_targets')
export class AnalyticsKpiTarget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'metric_key', length: 64 })
  metricKey: string;

  @Column()
  label: string;

  @Column({ name: 'target_value', type: 'decimal', precision: 14, scale: 2 })
  targetValue: number;

  @Column({ length: 16, default: 'monthly' })
  period: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
