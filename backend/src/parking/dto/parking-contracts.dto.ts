import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ContractStatus, VehicleType } from '../entities/parking.enums';

export class CreateParkingSubscriptionDto {
  @IsUUID()
  customerId: string;

  @IsUUID()
  facilityId: string;

  @IsOptional()
  @IsUUID()
  tariffId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyPrice: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateParkingSubscriptionDto {
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyPrice?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  tariffId?: string | null;
}

export class AddSubscriptionVehicleDto {
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
  holderName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  rfidTag?: string;
}

export class CreateParkingAgreementDto {
  @IsUUID()
  customerId: string;

  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fixedMonthlyFee?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  vehicleLimit?: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateParkingAgreementDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercent?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fixedMonthlyFee?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  vehicleLimit?: number | null;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddAgreementVehicleDto {
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
  driverName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;
}

export class ListContractsQueryDto {
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @IsOptional()
  @IsString()
  search?: string;
}

export class PlateLookupQueryDto {
  @IsString()
  @MinLength(5)
  @MaxLength(16)
  plate: string;

  @IsOptional()
  @IsUUID()
  facilityId?: string;
}

export class UpdateContractVehicleDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
