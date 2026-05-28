import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { VehicleType, ValetTicketStatus, ParkingPaymentMethod } from '../entities/parking.enums';

export class ListValetTicketsQueryDto {
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @IsOptional()
  @IsEnum(ValetTicketStatus)
  status?: ValetTicketStatus;

  /** intake | delivery | parked | active | all */
  @IsOptional()
  @IsString()
  queue?: string;

  @IsOptional()
  @IsString()
  plate?: string;
}

export class CreateValetTicketDto {
  @IsUUID()
  facilityId: string;

  @IsString()
  @MinLength(5)
  @MaxLength(16)
  plate: string;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  customerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  keyTag?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateValetTicketDto {
  @IsOptional()
  @IsEnum(ValetTicketStatus)
  status?: ValetTicketStatus;

  @IsOptional()
  @IsUUID()
  assignedValetId?: string | null;

  @IsOptional()
  @IsUUID()
  parkedSpotId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  parkedLocation?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AssignValetDto {
  @IsOptional()
  @IsUUID()
  assignedValetId?: string | null;
}

export class ParkValetVehicleDto {
  @IsOptional()
  @IsUUID()
  parkedSpotId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  parkedLocation?: string;

  @IsOptional()
  @IsUUID()
  assignedValetId?: string;
}

export class DeliverValetTicketDto {
  @IsOptional()
  @IsUUID()
  tariffId?: string;

  @IsOptional()
  @IsEnum(ParkingPaymentMethod)
  paymentMethod?: ParkingPaymentMethod;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
