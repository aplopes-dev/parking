import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { CrmLoyaltyAccount } from './crm-loyalty-account.entity';
import { CrmLoyaltyTxType } from './crm.enums';

@Entity('crm_loyalty_transactions')
export class CrmLoyaltyTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => CrmLoyaltyAccount, (account) => account.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id' })
  account: CrmLoyaltyAccount;

  @Column({ name: 'account_id' })
  accountId: string;

  @Column({ type: 'enum', enum: CrmLoyaltyTxType })
  type: CrmLoyaltyTxType;

  @Column({ type: 'int' })
  points: number;

  @Column({ name: 'balance_after', type: 'int' })
  balanceAfter: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'reference_type', length: 64, nullable: true })
  referenceType: string | null;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: User | null;

  @Column({ name: 'created_by_user_id', nullable: true })
  createdByUserId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
