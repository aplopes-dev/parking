import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { PagbankRecurringService } from './pagbank-recurring.service';
import {
  PagbankCreatePlanDto,
  PagbankCreateSubscriptionDto,
} from './dto/pagbank-recurring.dto';

@ApiTags('payments-pagbank-recurring')
@Controller('payments/pagbank/recurring')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PagbankRecurringController {
  constructor(private readonly recurring: PagbankRecurringService) {}

  @Post('plans')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  createPlan(@Body() dto: PagbankCreatePlanDto, @CurrentUser() user: User) {
    return this.recurring.createPlan(user.tenantId, dto);
  }

  @Get('plans')
  listPlans(@CurrentUser() user: User) {
    return this.recurring.listPlans(user.tenantId);
  }

  @Get('plans/:id')
  getPlan(@Param('id') id: string, @CurrentUser() user: User) {
    return this.recurring.getPlan(user.tenantId, id);
  }

  @Put('plans/:id/inactivate')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  inactivatePlan(@Param('id') id: string, @CurrentUser() user: User) {
    return this.recurring.inactivatePlan(user.tenantId, id);
  }

  @Post('subscriptions')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  createSubscription(@Body() dto: PagbankCreateSubscriptionDto, @CurrentUser() user: User) {
    return this.recurring.createSubscription(user.tenantId, dto);
  }

  @Get('subscriptions')
  listSubscriptions(@CurrentUser() user: User) {
    return this.recurring.listSubscriptions(user.tenantId);
  }

  @Get('subscriptions/:id')
  getSubscription(@Param('id') id: string, @CurrentUser() user: User) {
    return this.recurring.getSubscription(user.tenantId, id);
  }

  @Put('subscriptions/:id/cancel')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  cancelSubscription(@Param('id') id: string, @CurrentUser() user: User) {
    return this.recurring.cancelSubscription(user.tenantId, id);
  }

  @Get('subscriptions/:id/invoices')
  listInvoices(@Param('id') id: string, @CurrentUser() user: User) {
    return this.recurring.listSubscriptionInvoices(user.tenantId, id);
  }

  @Get('invoices/:invoiceId')
  getInvoice(@Param('invoiceId') invoiceId: string, @CurrentUser() user: User) {
    return this.recurring.getInvoice(user.tenantId, invoiceId);
  }

  @Post('payments/:paymentId/refund')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  refundPayment(@Param('paymentId') paymentId: string, @CurrentUser() user: User) {
    return this.recurring.refundInvoicePayment(user.tenantId, paymentId);
  }
}
