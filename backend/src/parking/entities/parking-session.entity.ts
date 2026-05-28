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
import { ParkingSessionStatus, ParkingAccessType, VehicleType, ParkingPaymentStatus } from './parking.enums';
import { ParkingFacility } from './parking-facility.entity';
import { ParkingSpot } from './parking-spot.entity';
import { ParkingTariff } from './parking-tariff.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { ParkingSubscription } from './parking-subscription.entity';
import { ParkingAgreement } from './parking-agreement.entity';

@Entity('parking_sessions')
export class ParkingSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ name: 'facility_id', type: 'uuid' })
  facilityId: string;

  @ManyToOne(() => ParkingFacility, (f) => f.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'facility_id' })
  facility?: ParkingFacility;

  @Column({ name: 'spot_id', type: 'uuid', nullable: true })
  spotId: string | null;

  @ManyToOne(() => ParkingSpot, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'spot_id' })
  spot?: ParkingSpot | null;

  @Column({ length: 16 })
  plate: string;

  @Column({ name: 'vehicle_type', type: 'varchar', length: 24, default: VehicleType.CAR })
  vehicleType: VehicleType;

  @Column({ name: 'ticket_code', length: 32, unique: true })
  ticketCode: string;

  @Column({ name: 'driver_name', length: 120, nullable: true })
  driverName: string | null;

  @Column({ type: 'varchar', length: 24, default: ParkingSessionStatus.ACTIVE })
  status: ParkingSessionStatus;

  @Column({ name: 'entry_at', type: 'timestamptz' })
  entryAt: Date;

  @Column({ name: 'exit_at', type: 'timestamptz', nullable: true })
  exitAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'tariff_id', type: 'uuid', nullable: true })
  tariffId: string | null;

  @ManyToOne(() => ParkingTariff, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'tariff_id' })
  tariff?: ParkingTariff | null;

  @Column({ name: 'amount_charged', type: 'numeric', precision: 10, scale: 2, nullable: true })
  amountCharged: string | null;

  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes: number | null;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null;

  @ManyToOne(() => Customer, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer | null;

  @Column({ name: 'subscription_id', type: 'uuid', nullable: true })
  subscriptionId: string | null;

  @ManyToOne(() => ParkingSubscription, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription?: ParkingSubscription | null;

  @Column({ name: 'agreement_id', type: 'uuid', nullable: true })
  agreementId: string | null;

  @ManyToOne(() => ParkingAgreement, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'agreement_id' })
  agreement?: ParkingAgreement | null;

  @Column({ name: 'access_type', type: 'varchar', length: 24, default: ParkingAccessType.ROTATIVO })
  accessType: ParkingAccessType;

  @Column({ name: 'payment_status', type: 'varchar', length: 24, nullable: true })
  paymentStatus: ParkingPaymentStatus | null;

  @Column({ name: 'payment_method', type: 'varchar', length: 24, nullable: true })
  paymentMethod: string | null;

  @Column({ name: 'finance_transaction_id', type: 'uuid', nullable: true })
  financeTransactionId: string | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Column({ name: 'paid_by_user_id', type: 'uuid', nullable: true })
  paidByUserId: string | null;

  @Column({ name: 'cash_session_id', type: 'uuid', nullable: true })
  cashSessionId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
