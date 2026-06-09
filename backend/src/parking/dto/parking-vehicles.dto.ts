import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { VehicleType } from '../entities/parking.enums';

export class ListParkingVehiclesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsUUID()
  customerId?: string;
}

export class CreateParkingVehicleDto {
  @IsString()
  @MinLength(4)
  @MaxLength(16)
  plate: string;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  holderName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  rfidTag?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateParkingVehicleDto {
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsUUID()
  customerId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  holderName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  brand?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  model?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  color?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  rfidTag?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class PlateParamDto {
  @IsString()
  @MinLength(4)
  plate: string;
}
