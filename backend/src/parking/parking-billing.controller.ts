import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import {
  BillingPreviewQueryDto,
  ChargeSubscriptionBillDto,
  GenerateSubscriptionBillingDto,
  ListSubscriptionBillingQueryDto,
  SettleSubscriptionBillingDto,
} from './dto/parking-billing.dto';
import { ParkingBillingService } from './parking-billing.service';

const PARKING_ROLES = Object.values(UserRole);

@ApiTags('parking-billing')
@Controller('parking/subscriptions/billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...PARKING_ROLES)
@ApiBearerAuth()
export class ParkingBillingController {
  constructor(private readonly service: ParkingBillingService) {}

  @Get('preview')
  preview(@CurrentUser() user: User, @Query() query: BillingPreviewQueryDto) {
    return this.service.preview(user.tenantId, query);
  }

  @Post('generate')
  generate(@CurrentUser() user: User, @Body() dto: GenerateSubscriptionBillingDto) {
    return this.service.generate(user.tenantId, dto);
  }

  @Get()
  list(@CurrentUser() user: User, @Query() query: ListSubscriptionBillingQueryDto) {
    return this.service.list(user.tenantId, query);
  }

  @Post('settle')
  settle(@CurrentUser() user: User, @Body() dto: SettleSubscriptionBillingDto) {
    return this.service.settle(user, dto);
  }

  @Post(':billId/charge')
  charge(
    @CurrentUser() user: User,
    @Param('billId') billId: string,
    @Body() dto: ChargeSubscriptionBillDto,
  ) {
    return this.service.chargeBill(user.tenantId, billId, dto);
  }
}
