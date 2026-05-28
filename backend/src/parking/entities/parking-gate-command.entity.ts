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
import { ParkingGateCommandStatus } from './parking.enums';
import { ParkingAccessDevice } from './parking-access-device.entity';

@Entity('parking_gate_commands')
export class ParkingGateCommand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ name: 'device_id', type: 'uuid' })
  deviceId: string;

  @ManyToOne(() => ParkingAccessDevice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device?: ParkingAccessDevice;

  @Column({ length: 32, default: 'open' })
  command: string;

  @Column({ type: 'varchar', length: 24, default: ParkingGateCommandStatus.PENDING })
  status: ParkingGateCommandStatus;

  @Column({ name: 'duration_ms', type: 'int', default: 5000 })
  durationMs: number;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'acked_at', type: 'timestamptz', nullable: true })
  ackedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
