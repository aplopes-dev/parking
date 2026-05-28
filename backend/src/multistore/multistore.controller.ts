import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import {
  ConsolidatedReportQueryDto,
  CreateStoreGroupDto,
  JoinStoreGroupDto,
  SwitchTenantDto,
  UpdateStoreGroupDto,
  UpdateUnitLabelDto,
} from './dto/multistore.dto';
import { MultistoreService } from './multistore.service';

const MULTISTORE_ROLES = Object.values(UserRole);

@ApiTags('multistore')
@Controller('multistore')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...MULTISTORE_ROLES)
@ApiBearerAuth()
export class MultistoreController {
  constructor(private readonly service: MultistoreService) {}

  @Get('context')
  context(@CurrentUser() user: User) {
    return this.service.getContext(user.tenantId);
  }

  @Post('group')
  createGroup(@CurrentUser() user: User, @Body() dto: CreateStoreGroupDto) {
    return this.service.createGroup(user.tenantId, dto);
  }

  @Patch('group')
  updateGroup(@CurrentUser() user: User, @Body() dto: UpdateStoreGroupDto) {
    return this.service.updateGroup(user.tenantId, dto);
  }

  @Post('group/join')
  joinGroup(@CurrentUser() user: User, @Body() dto: JoinStoreGroupDto) {
    return this.service.joinGroup(user.tenantId, dto);
  }

  @Post('group/leave')
  leaveGroup(@CurrentUser() user: User) {
    return this.service.leaveGroup(user.tenantId);
  }

  @Patch('unit')
  updateUnit(@CurrentUser() user: User, @Body() dto: UpdateUnitLabelDto) {
    return this.service.updateUnitLabel(user.tenantId, dto);
  }

  @Get('reports/consolidated')
  consolidatedReport(
    @CurrentUser() user: User,
    @Query() query: ConsolidatedReportQueryDto,
  ) {
    return this.service.getConsolidatedReport(user.tenantId, query);
  }

  @Get('reports/finance')
  consolidatedFinance(
    @CurrentUser() user: User,
    @Query() query: ConsolidatedReportQueryDto,
  ) {
    return this.service.getConsolidatedFinance(user.tenantId, query);
  }

  @Get('reports/stock')
  consolidatedStock(@CurrentUser() user: User) {
    return this.service.getConsolidatedStock(user.tenantId);
  }

  @Get('accessible-stores')
  accessibleStores(@CurrentUser() user: User) {
    return this.service.getAccessibleStores(user);
  }

  @Post('switch-tenant')
  switchTenant(@CurrentUser() user: User, @Body() dto: SwitchTenantDto) {
    return this.service.switchTenant(user, dto.tenantId);
  }
}
