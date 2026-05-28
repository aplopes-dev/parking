import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import { PeriodQueryDto } from './dto/analytics-reports.dto';
import { AnalyticsReportsService } from './analytics-reports.service';

const REPORT_ROLES = Object.values(UserRole);

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...REPORT_ROLES)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly service: AnalyticsReportsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Relatórios gerais consolidados' })
  overview(@CurrentUser() user: User, @Query() query: PeriodQueryDto) {
    return this.service.getReportsOverview(user.tenantId, query);
  }

  @Get('sales')
  sales(@CurrentUser() user: User, @Query() query: PeriodQueryDto) {
    return this.service.getSalesReport(user.tenantId, query);
  }

  @Get('stock')
  stock(@CurrentUser() user: User) {
    return this.service.getStockReport(user.tenantId);
  }

  @Get('finance')
  finance(@CurrentUser() user: User, @Query() query: PeriodQueryDto) {
    return this.service.getFinanceReport(user.tenantId, query);
  }
}
