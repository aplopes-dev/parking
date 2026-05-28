import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('store_groups')
export class StoreGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Identificador único do grupo (ex.: rede-centro-sp). */
  @Column({ length: 64, unique: true })
  code: string;

  @Column({ length: 160 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @OneToMany(() => Tenant, (t) => t.storeGroup)
  tenants?: Tenant[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
