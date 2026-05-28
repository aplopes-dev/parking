import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class PeriodQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class LogOnlineAccessDto {
  @IsString()
  channel: string;

  @IsOptional()
  @IsString()
  source?: string;
}

export class UpsertKpiTargetDto {
  @IsString()
  metricKey: string;

  @IsString()
  label: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  targetValue: number;

  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
