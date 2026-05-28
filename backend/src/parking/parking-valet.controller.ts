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
import { ParkingValetBroadcastService } from './parking-valet-broadcast.service';
import { ParkingValetService } from './parking-valet.service';

const PARKING_ROLES = Object.values(UserRole);

@ApiTags('parking-valet')
@Controller('parking/valet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...PARKING_ROLES)
@ApiBearerAuth()
export class ParkingValetController {
  constructor(
    private readonly valetService: ParkingValetService,
    private readonly valetBroadcast: ParkingValetBroadcastService,
  ) {}

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
  async receiveVehicle(@CurrentUser() user: User, @Body() dto: CreateValetTicketDto) {
    const ticket = await this.valetService.receiveVehicle(user.tenantId, dto);
    await this.valetBroadcast.notify(user.tenantId, dto.facilityId, 'receive');
    return ticket;
  }

  @Patch('tickets/:id')
  async updateTicket(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateValetTicketDto,
  ) {
    const ticket = await this.valetService.updateTicket(user.tenantId, id, dto);
    await this.valetBroadcast.notify(user.tenantId, ticket.facilityId, 'update');
    return ticket;
  }

  @Post('tickets/:id/park/start')
  async startParking(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: AssignValetDto,
  ) {
    const ticket = await this.valetService.startParking(
      user.tenantId,
      id,
      dto.assignedValetId ?? undefined,
    );
    await this.valetBroadcast.notify(user.tenantId, ticket.facilityId, 'parkStart');
    return ticket;
  }

  @Post('tickets/:id/park/complete')
  async markParked(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ParkValetVehicleDto,
  ) {
    const ticket = await this.valetService.markParked(user.tenantId, id, dto);
    await this.valetBroadcast.notify(user.tenantId, ticket.facilityId, 'parked');
    return ticket;
  }

  @Post('tickets/:id/request')
  async requestRetrieval(@CurrentUser() user: User, @Param('id') id: string) {
    const ticket = await this.valetService.requestRetrieval(user.tenantId, id);
    await this.valetBroadcast.notify(user.tenantId, ticket.facilityId, 'requested');
    return ticket;
  }

  @Post('tickets/:id/retrieve/start')
  async startRetrieval(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: AssignValetDto,
  ) {
    const ticket = await this.valetService.startRetrieval(
      user.tenantId,
      id,
      dto.assignedValetId ?? undefined,
    );
    await this.valetBroadcast.notify(user.tenantId, ticket.facilityId, 'retrieveStart');
    return ticket;
  }

  @Post('tickets/:id/ready')
  async markReady(@CurrentUser() user: User, @Param('id') id: string) {
    const ticket = await this.valetService.markReady(user.tenantId, id);
    await this.valetBroadcast.notify(user.tenantId, ticket.facilityId, 'ready');
    return ticket;
  }

  @Post('tickets/:id/deliver')
  async deliverVehicle(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: DeliverValetTicketDto,
  ) {
    const ticket = await this.valetService.deliverVehicle(user.tenantId, id, dto, user);
    await this.valetBroadcast.notify(user.tenantId, ticket.facilityId, 'delivered');
    return ticket;
  }

  @Post('tickets/:id/cancel')
  async cancelTicket(@CurrentUser() user: User, @Param('id') id: string) {
    const ticket = await this.valetService.cancelTicket(user.tenantId, id);
    await this.valetBroadcast.notify(user.tenantId, ticket.facilityId, 'canceled');
    return ticket;
  }
}
