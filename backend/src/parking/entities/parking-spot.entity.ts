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
import { ParkingSpotStatus } from './parking.enums';
import { ParkingFacility } from './parking-facility.entity';

@Entity('parking_spots')
export class ParkingSpot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ name: 'facility_id', type: 'uuid' })
  facilityId: string;

  @ManyToOne(() => ParkingFacility, (f) => f.spots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'facility_id' })
  facility?: ParkingFacility;

  @Column({ length: 32 })
  code: string;

  @Column({ length: 32, nullable: true })
  floor: string | null;

  @Column({ length: 64, nullable: true })
  zone: string | null;

  @Column({ type: 'varchar', length: 24, default: ParkingSpotStatus.AVAILABLE })
  status: ParkingSpotStatus;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
