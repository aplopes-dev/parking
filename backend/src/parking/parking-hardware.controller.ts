import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import {
  CreateParkingDeviceDto,
  ListAccessEventsQueryDto,
  ManualGateOpenDto,
  SimulateLprDto,
  UpdateParkingDeviceDto,
} from './dto/parking-hardware.dto';
import { ParkingHardwareService } from './parking-hardware.service';

const PARKING_ROLES = Object.values(UserRole);

@ApiTags('parking-hardware')
@Controller('parking/hardware')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...PARKING_ROLES)
@ApiBearerAuth()
export class ParkingHardwareController {
  constructor(private readonly hardwareService: ParkingHardwareService) {}

  @Get('devices')
  listDevices(@CurrentUser() user: User, @Query('facilityId') facilityId?: string) {
    return this.hardwareService.listDevices(user.tenantId, facilityId);
  }

  @Post('devices')
  createDevice(@CurrentUser() user: User, @Body() dto: CreateParkingDeviceDto) {
    return this.hardwareService.createDevice(user.tenantId, dto);
  }

  @Patch('devices/:id')
  updateDevice(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateParkingDeviceDto,
  ) {
    return this.hardwareService.updateDevice(user.tenantId, id, dto);
  }

  @Post('devices/:id/regenerate-key')
  regenerateKey(@CurrentUser() user: User, @Param('id') id: string) {
    return this.hardwareService.regenerateApiKey(user.tenantId, id);
  }

  @Post('devices/:id/open-gate')
  openGate(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ManualGateOpenDto,
  ) {
    return this.hardwareService.manualOpenGate(user.tenantId, id, dto);
  }

  @Get('events')
  listEvents(@CurrentUser() user: User, @Query() query: ListAccessEventsQueryDto) {
    return this.hardwareService.listEvents(user.tenantId, query);
  }

  @Post('simulate/lpr')
  simulateLpr(@CurrentUser() user: User, @Body() dto: SimulateLprDto) {
    const { deviceId, ...lpr } = dto;
    return this.hardwareService.simulateLpr(user.tenantId, deviceId, lpr);
  }
}
