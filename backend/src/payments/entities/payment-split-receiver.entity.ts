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
import { PagbankConnectAccount } from './pagbank-connect-account.entity';

export enum PaymentSplitReceiverRole {
  MASTER = 'master',
  SECONDARY = 'secondary',
}

@Entity('payment_split_receivers')
export class PaymentSplitReceiver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 120 })
  label: string;

  @Column({ name: 'pagbank_account_id', length: 80 })
  pagbankAccountId: string;

  @ManyToOne(() => PagbankConnectAccount, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'connect_account_id' })
  connectAccount: PagbankConnectAccount | null;

  @Column({ name: 'connect_account_id', nullable: true })
  connectAccountId: string | null;

  @Column({
    type: 'enum',
    enum: PaymentSplitReceiverRole,
    default: PaymentSplitReceiverRole.SECONDARY,
  })
  role: PaymentSplitReceiverRole;

  @Column({ name: 'amount_value', type: 'decimal', precision: 14, scale: 4, default: 0 })
  amountValue: string;

  @Column({ name: 'is_liable', default: false })
  isLiable: boolean;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
