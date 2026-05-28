import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { StockLocationsService } from './stock-locations.service';
import { SortOrderOnlyDto } from '../common/dto/sort-order-only.dto';
import { CreateStockLocationDto, UpdateStockLocationDto } from './dto/stock.dto';
import { StockLocationListQueryDto } from './dto/stock-location-list-query.dto';

@ApiTags('stock-locations')
@Controller('stock-locations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StockLocationsController {
  constructor(private readonly service: StockLocationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar locais de estoque (paginado)' })
  findAll(@CurrentUser() user: User, @Query() query: StockLocationListQueryDto) {
    return this.service.findAllPaginated(user.tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findOne(id, user.tenantId);
  }

  @Post()
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateStockLocationDto, @CurrentUser() user: User) {
    return this.service.create(dto, user.tenantId);
  }

  @Patch(':id/sort-order')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Atualizar ordem do local na listagem' })
  setSortOrder(
    @Param('id') id: string,
    @Body() dto: SortOrderOnlyDto,
    @CurrentUser() user: User,
  ) {
    return this.service.update(id, user.tenantId, { sortOrder: dto.sortOrder });
  }

  @Patch(':id')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStockLocationDto,
    @CurrentUser() user: User,
  ) {
    return this.service.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.remove(id, user.tenantId);
  }
}
