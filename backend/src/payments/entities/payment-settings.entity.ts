import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum PagbankEnvironment {
  SANDBOX = 'sandbox',
  PRODUCTION = 'production',
}

export enum PagbankSplitMethod {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE',
}

@Entity('payment_settings')
@Unique(['tenantId'])
export class PaymentSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'pagbank_split_enabled', default: false })
  pagbankSplitEnabled: boolean;

  @Column({
    name: 'pagbank_environment',
    type: 'enum',
    enum: PagbankEnvironment,
    default: PagbankEnvironment.SANDBOX,
  })
  pagbankEnvironment: PagbankEnvironment;

  @Column({ name: 'pagbank_token', type: 'text', nullable: true })
  pagbankToken: string | null;

  @Column({ name: 'pagbank_master_account_id', length: 80, nullable: true })
  pagbankMasterAccountId: string | null;

  @Column({
    name: 'pagbank_split_method',
    type: 'enum',
    enum: PagbankSplitMethod,
    default: PagbankSplitMethod.PERCENTAGE,
  })
  pagbankSplitMethod: PagbankSplitMethod;

  @Column({ name: 'pagbank_transfer_interest', default: false })
  pagbankTransferInterest: boolean;

  @Column({ name: 'pagbank_transfer_shipping', default: false })
  pagbankTransferShipping: boolean;

  @Column({ name: 'pagbank_custody_enabled', default: false })
  pagbankCustodyEnabled: boolean;

  /** ISO 8601 padrão para novos checkouts com custódia (ex.: 2025-12-01T18:00:00-03:00). */
  @Column({ name: 'pagbank_custody_scheduled_default', length: 40, nullable: true })
  pagbankCustodyScheduledDefault: string | null;

  @Column({ name: 'pagbank_connect_redirect_uri', type: 'text', nullable: true })
  pagbankConnectRedirectUri: string | null;

  /** Cria/atualiza recebedores secundários a partir de contas PagBank Connect. */
  @Column({ name: 'pagbank_connect_auto_sync_split', default: false })
  pagbankConnectAutoSyncSplit: boolean;

  /** Percentual fixo por conta Connect (modo PERCENTAGE); null = divide o restante entre contas Connect. */
  @Column({
    name: 'pagbank_connect_split_percent_each',
    type: 'decimal',
    precision: 8,
    scale: 4,
    nullable: true,
  })
  pagbankConnectSplitPercentEach: string | null;

  @Column({ name: 'pagbank_checkout_return_url', type: 'text', nullable: true })
  pagbankCheckoutReturnUrl: string | null;

  @Column({ name: 'pagbank_checkout_success_url', type: 'text', nullable: true })
  pagbankCheckoutSuccessUrl: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'pagbank_public_key', type: 'text', nullable: true })
  pagbankPublicKey: string | null;

  @Column({ name: 'pagbank_connect_client_id', length: 120, nullable: true })
  pagbankConnectClientId: string | null;

  @Column({ name: 'pagbank_connect_client_secret', type: 'text', nullable: true })
  pagbankConnectClientSecret: string | null;

  @Column({ name: 'pagbank_notification_url', type: 'text', nullable: true })
  pagbankNotificationUrl: string | null;

  @Column({ name: 'pagbank_order_soft_descriptor', length: 22, nullable: true })
  pagbankOrderSoftDescriptor: string | null;

  @Column({ name: 'pagbank_order_mcc', length: 10, nullable: true })
  pagbankOrderMcc: string | null;

  @Column({ name: 'pagbank_flows_config', type: 'jsonb', default: () => "'{}'" })
  pagbankFlowsConfig: Record<string, { enabled: boolean; options?: Record<string, unknown> }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
