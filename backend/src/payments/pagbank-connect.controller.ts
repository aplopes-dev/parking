import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { PagbankConnectService } from './pagbank-connect.service';
import {
  PagbankConnectSmsConfirmDto,
  PagbankConnectSmsRequestDto,
} from './dto/pagbank-connect.dto';

@ApiTags('payments-pagbank-connect')
@Controller('payments/pagbank/connect')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PagbankConnectController {
  constructor(private readonly connect: PagbankConnectService) {}

  @Get('authorize-url')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  authorizeUrl(@CurrentUser() user: User, @Query('redirectUri') redirectUri?: string) {
    return this.connect.getAuthorizationUrl(user.tenantId, redirectUri);
  }

  @Get('accounts')
  listAccounts(@CurrentUser() user: User) {
    return this.connect.listAccounts(user.tenantId);
  }

  @Post('accounts/sync-split-receivers')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  syncSplitReceivers(@CurrentUser() user: User) {
    return this.connect.syncSplitReceivers(user.tenantId);
  }

  @Post('accounts/:id/refresh')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  refresh(@Param('id') id: string, @CurrentUser() user: User) {
    return this.connect.refreshAccountToken(user.tenantId, id);
  }

  @Delete('accounts/:id')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.connect.deleteAccount(user.tenantId, id);
  }

  @Post('sms/request')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  smsRequest(@Body() dto: PagbankConnectSmsRequestDto, @CurrentUser() user: User) {
    return this.connect.requestSmsAuthorization(user.tenantId, dto);
  }

  @Post('sms/confirm')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  smsConfirm(@Body() dto: PagbankConnectSmsConfirmDto, @CurrentUser() user: User) {
    return this.connect.confirmSmsAuthorization(user.tenantId, dto);
  }
}
