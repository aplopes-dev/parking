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
  BulkCreateParkingSpotsDto,
  CloseParkingSessionDto,
  CreateParkingEntryDto,
  CreateParkingFacilityDto,
  CreateParkingSpotDto,
  CreateParkingTariffDto,
  ListParkingSessionsQueryDto,
  ListParkingTariffsQueryDto,
  TariffQuoteQueryDto,
  UpdateParkingFacilityDto,
  UpdateParkingSpotStatusDto,
  UpdateParkingTariffDto,
} from './dto/parking.dto';
import { ParkingService } from './parking.service';

const PARKING_ROLES = Object.values(UserRole);

@ApiTags('parking')
@Controller('parking')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...PARKING_ROLES)
@ApiBearerAuth()
export class ParkingController {
  constructor(private readonly service: ParkingService) {}

  @Get('meta')
  meta() {
    return this.service.getMeta();
  }

  @Get('dashboard')
  dashboard(@CurrentUser() user: User, @Query('facilityId') facilityId?: string) {
    return this.service.getDashboard(user.tenantId, facilityId);
  }

  @Get('facilities')
  listFacilities(@CurrentUser() user: User) {
    return this.service.listFacilities(user.tenantId);
  }

  @Post('facilities')
  createFacility(@CurrentUser() user: User, @Body() dto: CreateParkingFacilityDto) {
    return this.service.createFacility(user.tenantId, dto);
  }

  @Patch('facilities/:id')
  updateFacility(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateParkingFacilityDto,
  ) {
    return this.service.updateFacility(user.tenantId, id, dto);
  }

  @Get('spots')
  listSpots(@CurrentUser() user: User, @Query('facilityId') facilityId?: string) {
    return this.service.listSpots(user.tenantId, facilityId);
  }

  @Post('spots')
  createSpot(@CurrentUser() user: User, @Body() dto: CreateParkingSpotDto) {
    return this.service.createSpot(user.tenantId, dto);
  }

  @Post('spots/bulk')
  bulkCreateSpots(@CurrentUser() user: User, @Body() dto: BulkCreateParkingSpotsDto) {
    return this.service.bulkCreateSpots(user.tenantId, dto);
  }

  @Patch('spots/:id/status')
  updateSpotStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateParkingSpotStatusDto,
  ) {
    return this.service.updateSpotStatus(user.tenantId, id, dto);
  }

  @Get('sessions')
  listSessions(@CurrentUser() user: User, @Query() query: ListParkingSessionsQueryDto) {
    return this.service.listSessions(user.tenantId, query);
  }

  @Post('sessions/entry')
  registerEntry(@CurrentUser() user: User, @Body() dto: CreateParkingEntryDto) {
    return this.service.registerEntry(user.tenantId, dto);
  }

  @Patch('sessions/:id/exit')
  registerExit(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CloseParkingSessionDto,
  ) {
    return this.service.registerExit(user.tenantId, id, dto);
  }

  @Get('tariffs')
  listTariffs(@CurrentUser() user: User, @Query() query: ListParkingTariffsQueryDto) {
    return this.service.listTariffs(user.tenantId, query);
  }

  @Post('tariffs')
  createTariff(@CurrentUser() user: User, @Body() dto: CreateParkingTariffDto) {
    return this.service.createTariff(user.tenantId, dto);
  }

  @Patch('tariffs/:id')
  updateTariff(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateParkingTariffDto,
  ) {
    return this.service.updateTariff(user.tenantId, id, dto);
  }

  @Get('tariffs/quote')
  quoteTariff(@CurrentUser() user: User, @Query() query: TariffQuoteQueryDto) {
    return this.service.quoteTariff(user.tenantId, query);
  }
}
