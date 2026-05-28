import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StoreGroup } from '../../multistore/entities/store-group.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ name: 'store_group_id', type: 'uuid', nullable: true })
  storeGroupId: string | null;

  @ManyToOne(() => StoreGroup, (g) => g.tenants, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'store_group_id' })
  storeGroup?: StoreGroup | null;

  /** Nome da unidade dentro do grupo (ex.: Loja Centro). */
  @Column({ name: 'unit_label', type: 'varchar', length: 120, nullable: true })
  unitLabel: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
