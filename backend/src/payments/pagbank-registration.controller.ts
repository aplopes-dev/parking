import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { PagbankRegistrationService } from './pagbank-registration.service';
import { PagbankRegisterAccountDto } from './dto/pagbank-registration.dto';

@ApiTags('payments-pagbank-registration')
@Controller('payments/pagbank/registration')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PagbankRegistrationController {
  constructor(private readonly registration: PagbankRegistrationService) {}

  @Post('accounts')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  register(@Body() dto: PagbankRegisterAccountDto, @CurrentUser() user: User) {
    return this.registration.registerAccount(user.tenantId, dto);
  }

  @Get('accounts')
  list(@CurrentUser() user: User) {
    return this.registration.listRegisteredAccounts(user.tenantId);
  }

  @Get('accounts/:id')
  getOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.registration.getRegisteredAccount(user.tenantId, id);
  }
}
