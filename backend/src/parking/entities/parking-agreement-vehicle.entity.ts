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
import { VehicleType } from './parking.enums';
import { ParkingAgreement } from './parking-agreement.entity';

@Entity('parking_agreement_vehicles')
export class ParkingAgreementVehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'agreement_id', type: 'uuid' })
  agreementId: string;

  @ManyToOne(() => ParkingAgreement, (a) => a.vehicles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agreement_id' })
  agreement?: ParkingAgreement;

  @Column({ length: 16 })
  plate: string;

  @Column({ name: 'vehicle_type', type: 'varchar', length: 24, default: VehicleType.CAR })
  vehicleType: VehicleType;

  @Column({ name: 'driver_name', length: 120, nullable: true })
  driverName: string | null;

  @Column({ length: 120, nullable: true })
  department: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
