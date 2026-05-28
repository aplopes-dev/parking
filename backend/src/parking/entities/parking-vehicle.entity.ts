import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { VehicleType } from './parking.enums';

@Entity('parking_vehicles')
export class ParkingVehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ length: 16 })
  plate: string;

  @Column({ name: 'vehicle_type', type: 'varchar', length: 24, default: VehicleType.CAR })
  vehicleType: VehicleType;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null;

  @ManyToOne(() => Customer, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer | null;

  @Column({ name: 'holder_name', length: 120, nullable: true })
  holderName: string | null;

  @Column({ length: 80, nullable: true })
  brand: string | null;

  @Column({ length: 80, nullable: true })
  model: string | null;

  @Column({ length: 40, nullable: true })
  color: string | null;

  @Column({ name: 'rfid_tag', length: 64, nullable: true })
  rfidTag: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
