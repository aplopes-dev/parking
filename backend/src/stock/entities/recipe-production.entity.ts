import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { StockLocation } from './stock-location.entity';
import { TechnicalSheet } from './technical-sheet.entity';

@Entity('recipe_productions')
export class RecipeProduction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => TechnicalSheet, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sheet_id' })
  sheet: TechnicalSheet;

  @Column({ name: 'sheet_id' })
  sheetId: string;

  @ManyToOne(() => StockLocation, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'location_id' })
  location: StockLocation;

  @Column({ name: 'location_id' })
  locationId: string;

  @Column({ name: 'quantity_produced', type: 'decimal', precision: 14, scale: 4 })
  quantityProduced: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: User | null;

  @Column({ name: 'created_by_user_id', nullable: true })
  createdByUserId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
