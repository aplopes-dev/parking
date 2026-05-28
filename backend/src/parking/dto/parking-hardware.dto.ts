import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  ParkingDeviceDirection,
  ParkingDeviceType,
} from '../entities/parking.enums';

export class CreateParkingDeviceDto {
  @IsUUID()
  facilityId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string;

  @IsEnum(ParkingDeviceType)
  type: ParkingDeviceType;

  @IsEnum(ParkingDeviceDirection)
  direction: ParkingDeviceDirection;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  vendor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ipAddress?: string;

  @IsOptional()
  @IsBoolean()
  autoEntry?: boolean;

  @IsOptional()
  @IsBoolean()
  autoExitWaived?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class UpdateParkingDeviceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string;

  @IsOptional()
  @IsEnum(ParkingDeviceType)
  type?: ParkingDeviceType;

  @IsOptional()
  @IsEnum(ParkingDeviceDirection)
  direction?: ParkingDeviceDirection;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  vendor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ipAddress?: string;

  @IsOptional()
  @IsBoolean()
  autoEntry?: boolean;

  @IsOptional()
  @IsBoolean()
  autoExitWaived?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class ListAccessEventsQueryDto {
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsString()
  plate?: string;
}

export class HardwareLprReadDto {
  @IsString()
  @MinLength(5)
  @MaxLength(16)
  plate: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  confidence?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsObject()
  raw?: Record<string, unknown>;
}

export class HardwareHeartbeatDto {
  @IsOptional()
  @IsString()
  firmwareVersion?: string;

  @IsOptional()
  @IsObject()
  status?: Record<string, unknown>;
}

export class ManualGateOpenDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(60000)
  durationMs?: number;
}

export class SimulateLprDto extends HardwareLprReadDto {
  @IsUUID()
  deviceId: string;
}
