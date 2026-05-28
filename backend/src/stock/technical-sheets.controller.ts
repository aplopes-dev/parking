import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { TechnicalSheetsService } from './technical-sheets.service';
import { SortOrderOnlyDto } from '../common/dto/sort-order-only.dto';
import { CreateTechnicalSheetDto, UpdateTechnicalSheetDto } from './dto/stock.dto';

@ApiTags('technical-sheets')
@Controller('technical-sheets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TechnicalSheetsController {
  constructor(private readonly service: TechnicalSheetsService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.service.findAll(user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findOne(id, user.tenantId);
  }

  @Post()
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateTechnicalSheetDto, @CurrentUser() user: User) {
    return this.service.create(dto, user.tenantId);
  }

  @Patch(':id/sort-order')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Atualizar ordem da ficha na listagem' })
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
    @Body() dto: UpdateTechnicalSheetDto,
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
