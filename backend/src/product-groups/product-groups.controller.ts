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
import { ProductGroupsService } from './product-groups.service';
import { SortOrderOnlyDto } from '../common/dto/sort-order-only.dto';
import { CreateProductGroupDto, UpdateProductGroupDto } from './dto/product-group.dto';
import { ProductGroupListQueryDto } from './dto/product-group-list-query.dto';

@ApiTags('product-groups')
@Controller('product-groups')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductGroupsController {
  constructor(private readonly service: ProductGroupsService) {}

  @Get('options')
  @ApiOperation({ summary: 'Listar grupos para selects (sem paginação)' })
  findOptions(@CurrentUser() user: User) {
    return this.service.findAllOptions(user.tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar grupos de produtos (paginado)' })
  findAll(@CurrentUser() user: User, @Query() query: ProductGroupListQueryDto) {
    return this.service.findAllPaginated(user.tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter grupo por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findOne(id, user.tenantId);
  }

  @Post()
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Criar grupo de produtos' })
  create(@Body() dto: CreateProductGroupDto, @CurrentUser() user: User) {
    return this.service.create(dto, user.tenantId);
  }

  @Patch(':id/sort-order')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Atualizar ordem do grupo na listagem' })
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
  @ApiOperation({ summary: 'Atualizar grupo de produtos' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductGroupDto,
    @CurrentUser() user: User,
  ) {
    return this.service.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Excluir grupo de produtos' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.remove(id, user.tenantId);
  }
}
