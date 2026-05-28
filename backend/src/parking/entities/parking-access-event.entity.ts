import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { ParkingAccessEventType } from './parking.enums';
import { ParkingAccessDevice } from './parking-access-device.entity';
import { ParkingFacility } from './parking-facility.entity';
import { ParkingSession } from './parking-session.entity';

@Entity('parking_access_events')
export class ParkingAccessEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ name: 'device_id', type: 'uuid' })
  deviceId: string;

  @ManyToOne(() => ParkingAccessDevice, (d) => d.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device?: ParkingAccessDevice;

  @Column({ name: 'facility_id', type: 'uuid' })
  facilityId: string;

  @ManyToOne(() => ParkingFacility, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'facility_id' })
  facility?: ParkingFacility;

  @Column({ name: 'event_type', type: 'varchar', length: 32 })
  eventType: ParkingAccessEventType;

  @Column({ length: 16, nullable: true })
  plate: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  confidence: string | null;

  @Column({ default: false })
  allowed: boolean;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId: string | null;

  @ManyToOne(() => ParkingSession, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'session_id' })
  session?: ParkingSession | null;

  @Column({ name: 'gate_action', length: 32, nullable: true })
  gateAction: string | null;

  @Column({ name: 'raw_payload', type: 'jsonb', nullable: true })
  rawPayload: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
