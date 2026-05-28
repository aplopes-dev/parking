import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('pagbank_recurring_plans')
export class PagbankRecurringPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'pagbank_plan_id', length: 80 })
  pagbankPlanId: string;

  @Column({ name: 'reference_id', length: 80, nullable: true })
  referenceId: string | null;

  @Column({ length: 120 })
  name: string;

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents: number;

  @Column({ name: 'interval_unit', length: 10, default: 'MONTH' })
  intervalUnit: string;

  @Column({ name: 'interval_length', type: 'int', default: 1 })
  intervalLength: number;

  @Column({ length: 30, nullable: true })
  status: string | null;

  @Column({ name: 'raw_data', type: 'jsonb', nullable: true })
  rawData: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
