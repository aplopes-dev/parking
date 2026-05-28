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
import { TariffBillingType, VehicleType } from './parking.enums';
import { ParkingFacility } from './parking-facility.entity';

@Entity('parking_tariffs')
export class ParkingTariff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  /** null = vale para todas as unidades do tenant */
  @Column({ name: 'facility_id', type: 'uuid', nullable: true })
  facilityId: string | null;

  @ManyToOne(() => ParkingFacility, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'facility_id' })
  facility?: ParkingFacility | null;

  @Column({ length: 120 })
  name: string;

  @Column({ name: 'billing_type', type: 'varchar', length: 24 })
  billingType: TariffBillingType;

  /** null = todos os veículos */
  @Column({ name: 'vehicle_type', type: 'varchar', length: 24, nullable: true })
  vehicleType: VehicleType | null;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price: string;

  /** Minutos de tolerância (somente hora) */
  @Column({ name: 'grace_minutes', type: 'int', default: 0 })
  graceMinutes: number;

  /** Tamanho do bloco de cobrança em minutos (somente hora) */
  @Column({ name: 'block_minutes', type: 'int', default: 60 })
  blockMinutes: number;

  /** Teto diário para rotativo por hora */
  @Column({
    name: 'max_daily_price',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  maxDailyPrice: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
