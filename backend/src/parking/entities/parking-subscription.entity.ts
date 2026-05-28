import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { ContractStatus, VehicleType } from './parking.enums';
import { ParkingFacility } from './parking-facility.entity';
import { ParkingTariff } from './parking-tariff.entity';
import { ParkingSubscriptionVehicle } from './parking-subscription-vehicle.entity';

@Entity('parking_subscriptions')
export class ParkingSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @Column({ name: 'facility_id', type: 'uuid' })
  facilityId: string;

  @ManyToOne(() => ParkingFacility, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'facility_id' })
  facility?: ParkingFacility;

  @Column({ name: 'tariff_id', type: 'uuid', nullable: true })
  tariffId: string | null;

  @ManyToOne(() => ParkingTariff, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'tariff_id' })
  tariff?: ParkingTariff | null;

  @Column({ length: 32, nullable: true })
  code: string | null;

  @Column({ type: 'varchar', length: 24, default: ContractStatus.ACTIVE })
  status: ContractStatus;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @Column({ name: 'monthly_price', type: 'numeric', precision: 10, scale: 2 })
  monthlyPrice: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => ParkingSubscriptionVehicle, (v) => v.subscription)
  vehicles?: ParkingSubscriptionVehicle[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
