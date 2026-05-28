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
import { ParkingSubscription } from './parking-subscription.entity';

@Entity('parking_subscription_vehicles')
export class ParkingSubscriptionVehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'subscription_id', type: 'uuid' })
  subscriptionId: string;

  @ManyToOne(() => ParkingSubscription, (s) => s.vehicles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription?: ParkingSubscription;

  @Column({ length: 16 })
  plate: string;

  @Column({ name: 'vehicle_type', type: 'varchar', length: 24, default: VehicleType.CAR })
  vehicleType: VehicleType;

  @Column({ name: 'holder_name', length: 120, nullable: true })
  holderName: string | null;

  @Column({ name: 'rfid_tag', length: 64, nullable: true })
  rfidTag: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
