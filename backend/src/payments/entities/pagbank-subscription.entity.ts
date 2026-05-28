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
import { PagbankRecurringPlan } from './pagbank-recurring-plan.entity';

@Entity('pagbank_subscriptions')
export class PagbankSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => PagbankRecurringPlan, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'local_plan_id' })
  localPlan: PagbankRecurringPlan | null;

  @Column({ name: 'local_plan_id', nullable: true })
  localPlanId: string | null;

  @Column({ name: 'pagbank_subscription_id', length: 80 })
  pagbankSubscriptionId: string;

  @Column({ name: 'pagbank_plan_id', length: 80, nullable: true })
  pagbankPlanId: string | null;

  @Column({ name: 'reference_id', length: 80, nullable: true })
  referenceId: string | null;

  @Column({ name: 'customer_email', length: 120, nullable: true })
  customerEmail: string | null;

  @Column({ length: 30, nullable: true })
  status: string | null;

  @Column({ name: 'amount_cents', type: 'int', default: 0 })
  amountCents: number;

  @Column({ name: 'raw_data', type: 'jsonb', nullable: true })
  rawData: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
