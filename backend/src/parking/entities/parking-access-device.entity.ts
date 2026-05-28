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
import {
  ParkingDeviceDirection,
  ParkingDeviceType,
} from './parking.enums';
import { ParkingFacility } from './parking-facility.entity';
import { ParkingAccessEvent } from './parking-access-event.entity';

@Entity('parking_access_devices')
export class ParkingAccessDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ name: 'facility_id', type: 'uuid' })
  facilityId: string;

  @ManyToOne(() => ParkingFacility, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'facility_id' })
  facility?: ParkingFacility;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 32, nullable: true })
  code: string | null;

  @Column({ type: 'varchar', length: 24 })
  type: ParkingDeviceType;

  @Column({ type: 'varchar', length: 24 })
  direction: ParkingDeviceDirection;

  @Column({ length: 64, nullable: true })
  vendor: string | null;

  @Column({ name: 'ip_address', length: 64, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'api_key', length: 128, unique: true })
  apiKey: string;

  @Column({ name: 'auto_entry', default: true })
  autoEntry: boolean;

  @Column({ name: 'auto_exit_waived', default: true })
  autoExitWaived: boolean;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, unknown> | null;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @OneToMany(() => ParkingAccessEvent, (e) => e.device)
  events?: ParkingAccessEvent[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
