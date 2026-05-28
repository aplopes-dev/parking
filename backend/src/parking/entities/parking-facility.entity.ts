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
import { ParkingSegment, ParkingSystemType } from './parking.enums';
import { ParkingSpot } from './parking-spot.entity';
import { ParkingSession } from './parking-session.entity';

@Entity('parking_facilities')
export class ParkingFacility {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ length: 160 })
  name: string;

  @Column({ name: 'system_type', type: 'varchar', length: 32, default: ParkingSystemType.GARAGE })
  systemType: ParkingSystemType;

  @Column({ type: 'varchar', length: 32, default: ParkingSegment.COMMERCIAL })
  segment: ParkingSegment;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'total_spots', type: 'int', default: 0 })
  totalSpots: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => ParkingSpot, (s) => s.facility)
  spots?: ParkingSpot[];

  @OneToMany(() => ParkingSession, (s) => s.facility)
  sessions?: ParkingSession[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
