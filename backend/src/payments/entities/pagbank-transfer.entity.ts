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

@Entity('pagbank_transfers')
export class PagbankTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'pagbank_transfer_id', length: 80, nullable: true })
  pagbankTransferId: string | null;

  @Column({ name: 'reference_id', length: 80, nullable: true })
  referenceId: string | null;

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents: number;

  @Column({ length: 30, nullable: true })
  status: string | null;

  @Column({ name: 'instrument_type', length: 10 })
  instrumentType: string;

  @Column({ name: 'raw_create', type: 'jsonb', nullable: true })
  rawCreate: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
