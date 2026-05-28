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

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 255, nullable: true })
  email: string | null;

  @Column({ length: 32, nullable: true })
  phone: string | null;

  @Column({ length: 32, nullable: true })
  document: string | null;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ length: 120, nullable: true })
  city: string | null;

  @Column({ length: 2, nullable: true })
  state: string | null;

  @Column({ name: 'zip_code', length: 16, nullable: true })
  zipCode: string | null;

  @Column({ name: 'allergy_notes', type: 'text', nullable: true })
  allergyNotes: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
