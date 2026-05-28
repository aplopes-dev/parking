import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { StockBalancesService } from './stock-balances.service';

@ApiTags('stock-balances')
@Controller('stock-balances')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StockBalancesController {
  constructor(private readonly service: StockBalancesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar saldos de estoque' })
  findAll(
    @CurrentUser() user: User,
    @Query('locationId') locationId?: string,
    @Query('productId') productId?: string,
    @Query('belowMinimumOnly') belowMinimumOnly?: string,
  ) {
    return this.service.findAll(user.tenantId, {
      locationId,
      productId,
      belowMinimumOnly: belowMinimumOnly === 'true',
    });
  }
}
