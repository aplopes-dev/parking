import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { CrmLoyaltyProgram } from './crm-loyalty-program.entity';
import { CrmLoyaltyTier } from './crm.enums';
import { CrmLoyaltyTransaction } from './crm-loyalty-transaction.entity';

@Entity('crm_loyalty_accounts')
@Unique(['tenantId', 'customerId', 'programId'])
export class CrmLoyaltyAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => CrmLoyaltyProgram, (program) => program.accounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'program_id' })
  program: CrmLoyaltyProgram;

  @Column({ name: 'program_id' })
  programId: string;

  @Column({ name: 'points_balance', type: 'int', default: 0 })
  pointsBalance: number;

  @Column({ name: 'lifetime_points', type: 'int', default: 0 })
  lifetimePoints: number;

  @Column({ type: 'enum', enum: CrmLoyaltyTier, default: CrmLoyaltyTier.BRONZE })
  tier: CrmLoyaltyTier;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => CrmLoyaltyTransaction, (tx) => tx.account)
  transactions: CrmLoyaltyTransaction[];
}
