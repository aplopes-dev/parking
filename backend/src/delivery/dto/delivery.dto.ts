import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  DeliveryAssignmentStatus,
  DeliveryCourierStatus,
} from '../entities/delivery.entities';

export class CreateCourierDto {
  @IsString() name: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() vehicle?: string;
  @IsOptional() @IsEnum(DeliveryCourierStatus) status?: DeliveryCourierStatus;
}

export class UpdateCourierDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() vehicle?: string;
  @IsOptional() @IsEnum(DeliveryCourierStatus) status?: DeliveryCourierStatus;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateRouteDto {
  @IsString() name: string;
  @IsOptional() @IsString() zoneLabel?: string;
  @IsOptional() @IsString() color?: string;
}

export class UpdateRouteDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() zoneLabel?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class AssignDeliveryDto {
  @IsUUID() courierId: string;
  @IsOptional() @IsUUID() routeId?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateAssignmentStatusDto {
  @IsEnum(DeliveryAssignmentStatus) status: DeliveryAssignmentStatus;
  @IsOptional() @IsString() notes?: string;
}

export class DeliveryOrdersQueryDto {
  @IsOptional() @IsEnum(DeliveryAssignmentStatus) assignmentStatus?: DeliveryAssignmentStatus;
  @IsOptional() @IsString() openOnly?: string;
}
