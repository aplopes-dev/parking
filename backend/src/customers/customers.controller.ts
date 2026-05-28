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
import { CustomersService, CustomerListQueryDto } from './customers.service';
import { SortOrderOnlyDto } from '../common/dto/sort-order-only.dto';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes (paginado)' })
  findAll(@CurrentUser() user: User, @Query() query: CustomerListQueryDto) {
    return this.service.findAllPaginated(user.tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter cliente por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findOne(id, user.tenantId);
  }

  @Post()
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Criar cliente' })
  create(@Body() dto: CreateCustomerDto, @CurrentUser() user: User) {
    return this.service.create(dto, user.tenantId);
  }

  @Patch(':id/sort-order')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Atualizar ordem do cliente na listagem' })
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
  @ApiOperation({ summary: 'Atualizar cliente' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: User,
  ) {
    return this.service.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Excluir cliente' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.remove(id, user.tenantId);
  }
}
