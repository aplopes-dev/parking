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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { PagbankOrdersService } from './pagbank-orders.service';
import { PagbankCardVaultService } from './pagbank-card-vault.service';
import { Pagbank3dsService } from './pagbank-3ds.service';
import { PagbankSplitService } from './pagbank-split.service';
import { PagbankHostedCheckoutService } from './pagbank-hosted-checkout.service';
import { PagbankHostedCheckoutDto } from './dto/pagbank-hosted-checkout.dto';
import {
  PagbankCaptureDto,
  PagbankCheckoutDto,
  PagbankPayExistingDto,
} from './dto/pagbank-orders.dto';
import { Pagbank3dsSessionDto, PagbankVaultCardDto } from './dto/pagbank-vault.dto';
import { PagbankReleaseCustodyDto } from './dto/pagbank-split.dto';

@ApiTags('payments-pagbank')
@Controller('payments/pagbank')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PagbankOperationsController {
  constructor(
    private readonly pagbankOrders: PagbankOrdersService,
    private readonly cardVault: PagbankCardVaultService,
    private readonly threeDs: Pagbank3dsService,
    private readonly splitService: PagbankSplitService,
    private readonly hostedCheckout: PagbankHostedCheckoutService,
  ) {}

  @Get('capabilities')
  capabilities(@CurrentUser() user: User) {
    return this.pagbankOrders.getCapabilities(user.tenantId);
  }

  @Post('vault/cards')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  vaultCard(@Body() dto: PagbankVaultCardDto, @CurrentUser() user: User) {
    return this.cardVault.storeCard(user.tenantId, dto);
  }

  @Post('3ds/session')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  create3dsSession(@Body() dto: Pagbank3dsSessionDto, @CurrentUser() user: User) {
    return this.threeDs.createSession(user.tenantId, dto);
  }

  @Post('checkout')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  checkout(@Body() dto: PagbankCheckoutDto, @CurrentUser() user: User) {
    return this.pagbankOrders.checkout(user.tenantId, dto);
  }

  @Post('checkout/hosted')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  createHostedCheckout(@Body() dto: PagbankHostedCheckoutDto, @CurrentUser() user: User) {
    return this.hostedCheckout.createHostedCheckout(user.tenantId, dto);
  }

  @Get('transactions')
  list(
    @CurrentUser() user: User,
    @Query('orderId') orderId?: string,
  ) {
    return this.pagbankOrders.listTransactions(user.tenantId, orderId);
  }

  @Get('transactions/:id')
  getOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.pagbankOrders.getTransaction(user.tenantId, id);
  }

  @Post('transactions/:id/pay')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  pay(
    @Param('id') id: string,
    @Body() dto: PagbankPayExistingDto,
    @CurrentUser() user: User,
  ) {
    return this.pagbankOrders.payExisting(user.tenantId, id, dto);
  }

  @Post('transactions/:id/cancel')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.pagbankOrders.cancelCharge(user.tenantId, id);
  }

  @Post('transactions/:id/capture')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  capture(
    @Param('id') id: string,
    @Body() dto: PagbankCaptureDto,
    @CurrentUser() user: User,
  ) {
    return this.pagbankOrders.captureCharge(user.tenantId, id, dto);
  }

  @Get('transactions/:id/split')
  querySplit(@Param('id') id: string, @CurrentUser() user: User) {
    return this.pagbankOrders.querySplit(user.tenantId, id);
  }

  @Post('transactions/:id/split/release-custody')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  releaseCustody(
    @Param('id') id: string,
    @Body() dto: PagbankReleaseCustodyDto,
    @CurrentUser() user: User,
  ) {
    return this.splitService.releaseCustody(user.tenantId, id, dto);
  }

  @Post('transactions/:id/split/cancel')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  cancelSplit(@Param('id') id: string, @CurrentUser() user: User) {
    return this.splitService.cancelSplitPayment(user.tenantId, id);
  }

  @Post('transactions/:id/refresh')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  async refresh(@Param('id') id: string, @CurrentUser() user: User) {
    const tx = await this.pagbankOrders.getTransaction(user.tenantId, id);
    if (tx.flowId === 'checkout_pagbank') {
      return this.hostedCheckout.refreshHostedCheckout(user.tenantId, id);
    }
    return this.pagbankOrders.refreshFromPagbank(user.tenantId, id);
  }
}
