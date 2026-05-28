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
import { Product } from '../../products/entities/product.entity';
import { TechnicalSheetItem } from './technical-sheet-item.entity';

@Entity('technical_sheets')
@Unique(['tenantId', 'productId'])
export class TechnicalSheet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ name: 'yield_quantity', type: 'decimal', precision: 14, scale: 4, default: 1 })
  yieldQuantity: string;

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

  @OneToMany(() => TechnicalSheetItem, (item) => item.sheet, { cascade: true })
  items: TechnicalSheetItem[];
}
