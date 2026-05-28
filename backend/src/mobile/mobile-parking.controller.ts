import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import {
  AssignValetDto,
  CreateValetTicketDto,
  DeliverValetTicketDto,
  ListValetTicketsQueryDto,
  ParkValetVehicleDto,
} from '../parking/dto/parking-valet.dto';
import { ParkingValetService } from '../parking/parking-valet.service';
import { MobileParkingService } from './mobile-parking.service';

const STAFF_ROLES = Object.values(UserRole) as readonly UserRole[];

@ApiTags('mobile-parking')
@Controller('mobile/parking')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MobileParkingController {
  constructor(
    private readonly valetService: ParkingValetService,
    private readonly mobileParking: MobileParkingService,
  ) {}

  @Get('bootstrap')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Dados iniciais SmartPOS Valet (unidades, fila, tickets)' })
  bootstrap(@CurrentUser() user: User, @Query('facilityId') facilityId?: string) {
    return this.mobileParking.getBootstrap(user.tenantId, facilityId);
  }

  @Get('queue')
  @Roles(...STAFF_ROLES)
  queueSummary(@CurrentUser() user: User, @Query('facilityId') facilityId?: string) {
    return this.valetService.getQueueSummary(user.tenantId, facilityId);
  }

  @Get('tickets')
  @Roles(...STAFF_ROLES)
  listTickets(@CurrentUser() user: User, @Query() query: ListValetTicketsQueryDto) {
    return this.valetService.listTickets(user.tenantId, query);
  }

  @Get('tickets/:id/quote')
  @Roles(...STAFF_ROLES)
  quoteTicket(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('tariffId') tariffId?: string,
  ) {
    return this.mobileParking.quoteTicket(user.tenantId, id, tariffId);
  }

  @Post('tickets')
  @Roles(...STAFF_ROLES)
  async receiveVehicle(@CurrentUser() user: User, @Body() dto: CreateValetTicketDto) {
    const ticket = await this.valetService.receiveVehicle(user.tenantId, dto);
    await this.mobileParking.broadcastValetUpdated(user.tenantId, dto.facilityId, 'receive');
    return ticket;
  }

  @Post('tickets/:id/park/start')
  @Roles(...STAFF_ROLES)
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
    await this.mobileParking.broadcastValetUpdated(user.tenantId, ticket.facilityId, 'parkStart');
    return ticket;
  }

  @Post('tickets/:id/park/complete')
  @Roles(...STAFF_ROLES)
  async markParked(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ParkValetVehicleDto,
  ) {
    const ticket = await this.valetService.markParked(user.tenantId, id, dto);
    await this.mobileParking.broadcastValetUpdated(user.tenantId, ticket.facilityId, 'parked');
    return ticket;
  }

  @Post('tickets/:id/request')
  @Roles(...STAFF_ROLES)
  async requestRetrieval(@CurrentUser() user: User, @Param('id') id: string) {
    const ticket = await this.valetService.requestRetrieval(user.tenantId, id);
    await this.mobileParking.broadcastValetUpdated(user.tenantId, ticket.facilityId, 'requested');
    return ticket;
  }

  @Post('tickets/:id/retrieve/start')
  @Roles(...STAFF_ROLES)
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
    await this.mobileParking.broadcastValetUpdated(user.tenantId, ticket.facilityId, 'retrieveStart');
    return ticket;
  }

  @Post('tickets/:id/ready')
  @Roles(...STAFF_ROLES)
  async markReady(@CurrentUser() user: User, @Param('id') id: string) {
    const ticket = await this.valetService.markReady(user.tenantId, id);
    await this.mobileParking.broadcastValetUpdated(user.tenantId, ticket.facilityId, 'ready');
    return ticket;
  }

  @Post('tickets/:id/deliver')
  @Roles(...STAFF_ROLES)
  async deliverVehicle(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: DeliverValetTicketDto,
  ) {
    const ticket = await this.valetService.deliverVehicle(user.tenantId, id, dto, user);
    await this.mobileParking.broadcastValetUpdated(user.tenantId, ticket.facilityId, 'delivered');
    return ticket;
  }

  @Post('tickets/:id/cancel')
  @Roles(...STAFF_ROLES)
  async cancelTicket(@CurrentUser() user: User, @Param('id') id: string) {
    const ticket = await this.valetService.cancelTicket(user.tenantId, id);
    await this.mobileParking.broadcastValetUpdated(user.tenantId, ticket.facilityId, 'canceled');
    return ticket;
  }
}
