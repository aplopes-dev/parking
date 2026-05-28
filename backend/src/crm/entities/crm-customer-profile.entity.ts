import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { CrmSegment } from './crm.enums';

@Entity('crm_customer_profiles')
@Unique(['tenantId', 'customerId'])
export class CrmCustomerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @OneToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ type: 'enum', enum: CrmSegment, default: CrmSegment.NOVO })
  segment: CrmSegment;

  @Column({ length: 255, nullable: true })
  tags: string | null;

  @Column({ name: 'preferred_channel', length: 32, nullable: true })
  preferredChannel: string | null;

  @Column({ name: 'marketing_opt_in', default: true })
  marketingOptIn: boolean;

  @Column({ name: 'last_contact_at', type: 'timestamp', nullable: true })
  lastContactAt: Date | null;

  @Column({ name: 'crm_notes', type: 'text', nullable: true })
  crmNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
