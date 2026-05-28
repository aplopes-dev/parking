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
import { User } from '../../users/entities/user.entity';
import { ValetTicketStatus, VehicleType } from './parking.enums';
import { ParkingFacility } from './parking-facility.entity';
import { ParkingSession } from './parking-session.entity';
import { ParkingSpot } from './parking-spot.entity';

@Entity('parking_valet_tickets')
export class ParkingValetTicket {
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

  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId: string | null;

  @ManyToOne(() => ParkingSession, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'session_id' })
  session?: ParkingSession | null;

  @Column({ name: 'ticket_code', length: 32, unique: true })
  ticketCode: string;

  @Column({ length: 16 })
  plate: string;

  @Column({ name: 'vehicle_type', type: 'varchar', length: 24, default: VehicleType.CAR })
  vehicleType: VehicleType;

  @Column({ name: 'customer_name', length: 120, nullable: true })
  customerName: string | null;

  @Column({ name: 'customer_phone', length: 32, nullable: true })
  customerPhone: string | null;

  @Column({ name: 'key_tag', length: 32, nullable: true })
  keyTag: string | null;

  @Column({ type: 'varchar', length: 24, default: ValetTicketStatus.RECEIVED })
  status: ValetTicketStatus;

  @Column({ name: 'assigned_valet_id', type: 'uuid', nullable: true })
  assignedValetId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_valet_id' })
  assignedValet?: User | null;

  @Column({ name: 'parked_spot_id', type: 'uuid', nullable: true })
  parkedSpotId: string | null;

  @ManyToOne(() => ParkingSpot, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'parked_spot_id' })
  parkedSpot?: ParkingSpot | null;

  @Column({ name: 'parked_location', length: 160, nullable: true })
  parkedLocation: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'received_at', type: 'timestamptz' })
  receivedAt: Date;

  @Column({ name: 'parked_at', type: 'timestamptz', nullable: true })
  parkedAt: Date | null;

  @Column({ name: 'requested_at', type: 'timestamptz', nullable: true })
  requestedAt: Date | null;

  @Column({ name: 'ready_at', type: 'timestamptz', nullable: true })
  readyAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
