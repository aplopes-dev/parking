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
import { Product } from '../../products/entities/product.entity';
import { StockLocation } from './stock-location.entity';

@Entity('stock_minimums')
export class StockMinimum {
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

  @ManyToOne(() => StockLocation, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location: StockLocation | null;

  @Column({ name: 'location_id', nullable: true })
  locationId: string | null;

  @Column({ name: 'minimum_quantity', type: 'decimal', precision: 14, scale: 4, default: 0 })
  minimumQuantity: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
