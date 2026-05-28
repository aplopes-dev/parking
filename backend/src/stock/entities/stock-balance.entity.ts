import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Product } from '../../products/entities/product.entity';
import { StockLocation } from './stock-location.entity';

@Entity('stock_balances')
@Unique(['tenantId', 'productId', 'locationId'])
export class StockBalance {
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

  @ManyToOne(() => StockLocation, (location) => location.balances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location: StockLocation;

  @Column({ name: 'location_id' })
  locationId: string;

  @Column({ type: 'decimal', precision: 14, scale: 4, default: 0 })
  quantity: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
