import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';
import { StockLocation } from './stock-location.entity';

export enum StockMovementType {
  ENTRADA = 'entrada',
  SAIDA = 'saida',
  ACERTO = 'acerto',
  PRODUCAO_ENTRADA = 'producao_entrada',
  PRODUCAO_SAIDA = 'producao_saida',
}

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => StockLocation, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'location_id' })
  location: StockLocation;

  @Column({ name: 'location_id' })
  locationId: string;

  @Column({
    type: 'enum',
    enum: StockMovementType,
  })
  type: StockMovementType;

  @Column({ type: 'decimal', precision: 14, scale: 4 })
  quantity: string;

  @Column({ name: 'balance_before', type: 'decimal', precision: 14, scale: 4 })
  balanceBefore: string;

  @Column({ name: 'balance_after', type: 'decimal', precision: 14, scale: 4 })
  balanceAfter: string;

  @Column({ length: 120, nullable: true })
  reason: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'reference_type', length: 64, nullable: true })
  referenceType: string | null;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: User | null;

  @Column({ name: 'created_by_user_id', nullable: true })
  createdByUserId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
