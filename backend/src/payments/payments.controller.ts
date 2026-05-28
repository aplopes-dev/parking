import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { PaymentsService } from './payments.service';
import { UpdatePagbankSplitSettingsDto } from './dto/payment-settings.dto';
import { UpdatePaymentSettingsDto } from './dto/payment-settings-full.dto';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('settings')
  getSettings(@CurrentUser() user: User) {
    return this.paymentsService.getPaymentSettings(user.tenantId);
  }

  @Patch('settings')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  updateSettings(@Body() dto: UpdatePaymentSettingsDto, @CurrentUser() user: User) {
    return this.paymentsService.updatePaymentSettings(user.tenantId, dto);
  }

  @Get('pagbank-split')
  getPagbankSplit(@CurrentUser() user: User) {
    return this.paymentsService.getPagbankSplitConfig(user.tenantId);
  }

  @Patch('pagbank-split')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  updatePagbankSplit(
    @Body() dto: UpdatePagbankSplitSettingsDto,
    @CurrentUser() user: User,
  ) {
    return this.paymentsService.updatePagbankSplit(user.tenantId, dto);
  }
}
