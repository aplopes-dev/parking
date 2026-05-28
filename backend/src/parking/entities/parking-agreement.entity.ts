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
import { ContractStatus } from './parking.enums';
import { ParkingFacility } from './parking-facility.entity';
import { ParkingAgreementVehicle } from './parking-agreement-vehicle.entity';

@Entity('parking_agreements')
export class ParkingAgreement {
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

  @Column({ name: 'facility_id', type: 'uuid', nullable: true })
  facilityId: string | null;

  @ManyToOne(() => ParkingFacility, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'facility_id' })
  facility?: ParkingFacility | null;

  @Column({ length: 160 })
  name: string;

  @Column({ length: 32, nullable: true })
  code: string | null;

  @Column({ type: 'varchar', length: 24, default: ContractStatus.ACTIVE })
  status: ContractStatus;

  @Column({ name: 'discount_percent', type: 'numeric', precision: 5, scale: 2, nullable: true })
  discountPercent: string | null;

  @Column({ name: 'fixed_monthly_fee', type: 'numeric', precision: 10, scale: 2, nullable: true })
  fixedMonthlyFee: string | null;

  @Column({ name: 'vehicle_limit', type: 'int', nullable: true })
  vehicleLimit: number | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => ParkingAgreementVehicle, (v) => v.agreement)
  vehicles?: ParkingAgreementVehicle[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
