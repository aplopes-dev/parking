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

@Entity('pagbank_registered_accounts')
export class PagbankRegisteredAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'pagbank_account_id', length: 80, nullable: true })
  pagbankAccountId: string | null;

  @Column({ name: 'account_type', length: 20 })
  accountType: string;

  @Column({ length: 120 })
  email: string;

  @Column({ length: 40, nullable: true })
  status: string | null;

  @Column({ name: 'raw_create', type: 'jsonb', nullable: true })
  rawCreate: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
