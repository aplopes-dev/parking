import {
  Body,
  Controller,
  Get,
  Param,
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
  ParkingCashQuoteQueryDto,
  ParkingCheckoutByTicketDto,
  ParkingCheckoutDto,
  ParkingCloseCashDto,
  ParkingOpenCashDto,
} from './dto/parking-cash.dto';
import { ParkingCashService } from './parking-cash.service';
import { ParkingTicketService } from './parking-ticket.service';

const PARKING_ROLES = Object.values(UserRole);

@ApiTags('parking-cash')
@Controller('parking/cash')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...PARKING_ROLES)
@ApiBearerAuth()
export class ParkingCashController {
  constructor(
    private readonly cashService: ParkingCashService,
    private readonly ticketService: ParkingTicketService,
  ) {}

  @Get('queue')
  listQueue(@CurrentUser() user: User, @Query('facilityId') facilityId?: string) {
    return this.cashService.listQueue(user.tenantId, facilityId);
  }

  @Get('summary')
  summary(@CurrentUser() user: User, @Query('facilityId') facilityId?: string) {
    return this.cashService.getSummary(user.tenantId, facilityId);
  }

  @Get('my-session')
  mySession(@CurrentUser() user: User) {
    return this.cashService.getMyCashSession(user);
  }

  @Post('my-session/open')
  openMySession(@CurrentUser() user: User, @Body() dto: ParkingOpenCashDto) {
    return this.cashService.openMyCashSession(user, dto);
  }

  @Post('my-session/:id/close')
  closeMySession(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ParkingCloseCashDto,
  ) {
    return this.cashService.closeMyCashSession(user, id, dto.countedBalance, dto.notes);
  }

  @Get('quote/:sessionId')
  quote(
    @CurrentUser() user: User,
    @Param('sessionId') sessionId: string,
    @Query() query: ParkingCashQuoteQueryDto,
  ) {
    return this.cashService.getQuote(user.tenantId, sessionId, query.tariffId);
  }

  @Get('quote-by-ticket/:ticketCode')
  quoteByTicket(
    @CurrentUser() user: User,
    @Param('ticketCode') ticketCode: string,
    @Query() query: ParkingCashQuoteQueryDto,
  ) {
    return this.cashService.getQuoteByTicket(user.tenantId, ticketCode, query.tariffId);
  }

  @Post('checkout/:sessionId')
  checkout(
    @CurrentUser() user: User,
    @Param('sessionId') sessionId: string,
    @Body() dto: ParkingCheckoutDto,
  ) {
    return this.cashService.checkout(user.tenantId, user.id, sessionId, dto);
  }

  @Post('checkout-by-ticket')
  checkoutByTicket(@CurrentUser() user: User, @Body() dto: ParkingCheckoutByTicketDto) {
    return this.cashService.checkoutByTicket(user.tenantId, user.id, dto.ticketCode, dto);
  }

  @Get('ticket/:sessionId')
  ticket(@CurrentUser() user: User, @Param('sessionId') sessionId: string) {
    return this.ticketService.getTicketBySessionId(user.tenantId, sessionId);
  }

  @Get('ticket-by-code/:ticketCode')
  ticketByCode(@CurrentUser() user: User, @Param('ticketCode') ticketCode: string) {
    return this.ticketService.getTicketByCode(user.tenantId, ticketCode);
  }
}
