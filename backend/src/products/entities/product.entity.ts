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
import { ProductGroup } from '../../product-groups/entities/product-group.entity';

export enum ProductUnit {
  UN = 'un',
  KG = 'kg',
  L = 'l',
  PORCAO = 'porcao',
}

@Entity('products')
@Unique(['tenantId', 'name'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => ProductGroup, (group) => group.products, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'group_id' })
  group: ProductGroup | null;

  @Column({ name: 'group_id', nullable: true })
  groupId: string | null;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ length: 64, nullable: true })
  sku: string | null;

  @Column({ name: 'cost_price', type: 'decimal', precision: 14, scale: 2, default: 0 })
  costPrice: string;

  @Column({ name: 'sale_price', type: 'decimal', precision: 14, scale: 2, default: 0 })
  salePrice: string;

  @Column({
    type: 'enum',
    enum: ProductUnit,
    default: ProductUnit.UN,
  })
  unit: ProductUnit;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ nullable: true })
  photoKey: string | null;

  @Column({ nullable: true })
  photoMimeType: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
