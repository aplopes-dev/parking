import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  ParkingSegment,
  ParkingSessionStatus,
  ParkingSpotStatus,
  ParkingSystemType,
  TariffBillingType,
  VehicleType,
} from '../entities/parking.enums';

export class CreateParkingFacilityDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name: string;

  @IsEnum(ParkingSystemType)
  systemType: ParkingSystemType;

  @IsEnum(ParkingSegment)
  segment: ParkingSegment;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalSpots?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateParkingFacilityDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsEnum(ParkingSystemType)
  systemType?: ParkingSystemType;

  @IsOptional()
  @IsEnum(ParkingSegment)
  segment?: ParkingSegment;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalSpots?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateParkingSpotDto {
  @IsUUID()
  facilityId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  floor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  zone?: string;
}

export class BulkCreateParkingSpotsDto {
  @IsUUID()
  facilityId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8)
  prefix: string;

  @IsInt()
  @Min(1)
  count: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  floor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  zone?: string;
}

export class UpdateParkingSpotStatusDto {
  @IsEnum(ParkingSpotStatus)
  status: ParkingSpotStatus;
}

export class CreateParkingEntryDto {
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
  @IsUUID()
  spotId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  driverName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseParkingSessionDto {
  @IsOptional()
  @IsString()
  notes?: string;

  /** Tarifa aplicada na saída; se omitida, usa tarifa horária padrão da unidade */
  @IsOptional()
  @IsUUID()
  tariffId?: string;
}

export class CreateParkingTariffDto {
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsEnum(TariffBillingType)
  billingType: TariffBillingType;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  graceMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  blockMinutes?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxDailyPrice?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateParkingTariffDto {
  @IsOptional()
  @IsUUID()
  facilityId?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(TariffBillingType)
  billingType?: TariffBillingType;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  graceMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  blockMinutes?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxDailyPrice?: number | null;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class TariffQuoteQueryDto {
  @IsUUID()
  tariffId: string;

  @IsString()
  entryAt: string;

  @IsOptional()
  @IsString()
  exitAt?: string;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;
}

export class ListParkingTariffsQueryDto {
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @IsOptional()
  @IsEnum(TariffBillingType)
  billingType?: TariffBillingType;
}

export class ListParkingSessionsQueryDto {
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @IsOptional()
  @IsEnum(ParkingSessionStatus)
  status?: ParkingSessionStatus;

  @IsOptional()
  @IsString()
  plate?: string;
}
