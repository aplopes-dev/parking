import { Body, Controller, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import {
  LogOnlineAccessDto,
  PeriodQueryDto,
  UpsertKpiTargetDto,
} from './dto/analytics-reports.dto';
import { AnalyticsReportsService } from './analytics-reports.service';

const ANALYTICS_ROLES = Object.values(UserRole);

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ANALYTICS_ROLES)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly service: AnalyticsReportsService) {}

  @Get('realtime')
  @ApiOperation({ summary: 'Painel em tempo real' })
  realtime(@CurrentUser() user: User) {
    return this.service.getRealtime(user.tenantId);
  }

  @Get('indicators')
  indicators(@CurrentUser() user: User, @Query() query: PeriodQueryDto) {
    return this.service.getIndicators(user.tenantId, query);
  }

  @Get('online-access')
  onlineAccess(@CurrentUser() user: User, @Query() query: PeriodQueryDto) {
    return this.service.getOnlineAccess(user.tenantId, query);
  }

  @Post('online-access')
  logAccess(@CurrentUser() user: User, @Body() dto: LogOnlineAccessDto) {
    return this.service.logOnlineAccess(user.tenantId, dto);
  }

  @Get('kpi-targets')
  kpiTargets(@CurrentUser() user: User) {
    return this.service.listKpiTargets(user.tenantId);
  }

  @Put('kpi-targets')
  upsertKpi(@CurrentUser() user: User, @Body() dto: UpsertKpiTargetDto) {
    return this.service.upsertKpiTarget(user.tenantId, dto);
  }

  @Post('kpi-targets/seed')
  seedKpi(@CurrentUser() user: User) {
    return this.service.seedDefaultKpiTargets(user.tenantId);
  }
}
