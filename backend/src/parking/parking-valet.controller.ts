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
  AssignValetDto,
  CreateValetTicketDto,
  DeliverValetTicketDto,
  ListValetTicketsQueryDto,
  ParkValetVehicleDto,
  UpdateValetTicketDto,
} from './dto/parking-valet.dto';
import { ParkingValetService } from './parking-valet.service';

const PARKING_ROLES = Object.values(UserRole);

@ApiTags('parking-valet')
@Controller('parking/valet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...PARKING_ROLES)
@ApiBearerAuth()
export class ParkingValetController {
  constructor(private readonly valetService: ParkingValetService) {}

  @Get('valets')
  listValets(@CurrentUser() user: User) {
    return this.valetService.listValets(user.tenantId);
  }

  @Get('queue')
  queueSummary(@CurrentUser() user: User, @Query('facilityId') facilityId?: string) {
    return this.valetService.getQueueSummary(user.tenantId, facilityId);
  }

  @Get('tickets')
  listTickets(@CurrentUser() user: User, @Query() query: ListValetTicketsQueryDto) {
    return this.valetService.listTickets(user.tenantId, query);
  }

  @Post('tickets')
  receiveVehicle(@CurrentUser() user: User, @Body() dto: CreateValetTicketDto) {
    return this.valetService.receiveVehicle(user.tenantId, dto);
  }

  @Patch('tickets/:id')
  updateTicket(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateValetTicketDto,
  ) {
    return this.valetService.updateTicket(user.tenantId, id, dto);
  }

  @Post('tickets/:id/park/start')
  startParking(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: AssignValetDto,
  ) {
    return this.valetService.startParking(user.tenantId, id, dto.assignedValetId ?? undefined);
  }

  @Post('tickets/:id/park/complete')
  markParked(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ParkValetVehicleDto,
  ) {
    return this.valetService.markParked(user.tenantId, id, dto);
  }

  @Post('tickets/:id/request')
  requestRetrieval(@CurrentUser() user: User, @Param('id') id: string) {
    return this.valetService.requestRetrieval(user.tenantId, id);
  }

  @Post('tickets/:id/retrieve/start')
  startRetrieval(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: AssignValetDto,
  ) {
    return this.valetService.startRetrieval(user.tenantId, id, dto.assignedValetId ?? undefined);
  }

  @Post('tickets/:id/ready')
  markReady(@CurrentUser() user: User, @Param('id') id: string) {
    return this.valetService.markReady(user.tenantId, id);
  }

  @Post('tickets/:id/deliver')
  deliverVehicle(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: DeliverValetTicketDto,
  ) {
    return this.valetService.deliverVehicle(user.tenantId, id, dto, user.id);
  }

  @Post('tickets/:id/cancel')
  cancelTicket(@CurrentUser() user: User, @Param('id') id: string) {
    return this.valetService.cancelTicket(user.tenantId, id);
  }
}
