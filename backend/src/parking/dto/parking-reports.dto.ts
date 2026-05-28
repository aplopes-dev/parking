import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ParkingReportsQueryDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsOptional()
  @IsUUID()
  facilityId?: string;
}
