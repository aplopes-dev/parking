import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ParkingPaymentMethod } from '../entities/parking.enums';

export class ParkingCheckoutDto {
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
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ParkingCashQuoteQueryDto {
  @IsOptional()
  @IsUUID()
  tariffId?: string;
}

export class ParkingOpenCashDto {
  @IsUUID()
  accountId: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingBalance?: number;

  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ParkingCloseCashDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  countedBalance: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ParkingCheckoutByTicketDto extends ParkingCheckoutDto {
  @IsString()
  ticketCode: string;
}
