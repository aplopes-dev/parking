import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { StockMovementsService } from './stock-movements.service';
import {
  CreateStockAdjustmentDto,
  CreateStockMovementDto,
} from './dto/stock.dto';
import { StockMovementListQueryDto } from './dto/stock-movement-list-query.dto';

@ApiTags('stock-movements')
@Controller('stock-movements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StockMovementsController {
  constructor(private readonly service: StockMovementsService) {}

  @Get()
  @ApiOperation({ summary: 'Histórico de movimentações' })
  findAll(@CurrentUser() user: User, @Query() query: StockMovementListQueryDto) {
    return this.service.findAllPaginated(user.tenantId, query);
  }

  @Post()
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Entrada ou saída manual' })
  createMovement(@Body() dto: CreateStockMovementDto, @CurrentUser() user: User) {
    return this.service.createMovement(dto, user.tenantId, user.id);
  }

  @Post('adjustments')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Acerto de estoque (inventário)' })
  createAdjustment(@Body() dto: CreateStockAdjustmentDto, @CurrentUser() user: User) {
    return this.service.createAdjustment(dto, user.tenantId, user.id);
  }
}
