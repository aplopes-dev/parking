import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { PagbankTransfersService } from './pagbank-transfers.service';
import { PagbankCreateTransferDto } from './dto/pagbank-transfer.dto';

@ApiTags('payments-pagbank-transfers')
@Controller('payments/pagbank/transfers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PagbankTransfersController {
  constructor(private readonly transfers: PagbankTransfersService) {}

  @Post()
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  create(@Body() dto: PagbankCreateTransferDto, @CurrentUser() user: User) {
    return this.transfers.createTransfer(user.tenantId, dto);
  }

  @Get()
  list(@CurrentUser() user: User) {
    return this.transfers.listTransfers(user.tenantId);
  }

  @Get('by-transaction-code')
  byTransactionCode(
    @CurrentUser() user: User,
    @Query('transactionCode') transactionCode: string,
  ) {
    return this.transfers.queryByTransactionCode(user.tenantId, transactionCode);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.transfers.getTransfer(user.tenantId, id);
  }
}
