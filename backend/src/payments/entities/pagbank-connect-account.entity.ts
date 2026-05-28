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

export enum PagbankConnectAuthMethod {
  AUTHORIZATION = 'authorization',
  SMS = 'sms',
}

@Entity('pagbank_connect_accounts')
export class PagbankConnectAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 120, nullable: true })
  label: string | null;

  @Column({ name: 'pagbank_account_id', length: 80, nullable: true })
  pagbankAccountId: string | null;

  @Column({ name: 'access_token', type: 'text' })
  accessToken: string;

  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken: string | null;

  @Column({ name: 'token_expires_at', type: 'timestamp', nullable: true })
  tokenExpiresAt: Date | null;

  @Column({ type: 'text', nullable: true })
  scopes: string | null;

  @Column({ name: 'bank_branch', length: 20, nullable: true })
  bankBranch: string | null;

  @Column({ name: 'account_number', length: 30, nullable: true })
  accountNumber: string | null;

  @Column({
    name: 'auth_method',
    length: 20,
    default: PagbankConnectAuthMethod.AUTHORIZATION,
  })
  authMethod: PagbankConnectAuthMethod;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
