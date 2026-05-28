import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import { ParkingReportsQueryDto } from './dto/parking-reports.dto';
import { ParkingReportsService } from './parking-reports.service';

const PARKING_ROLES = Object.values(UserRole);

@ApiTags('parking-reports')
@Controller('parking/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...PARKING_ROLES)
@ApiBearerAuth()
export class ParkingReportsController {
  constructor(private readonly service: ParkingReportsService) {}

  @Get('overview')
  overview(@CurrentUser() user: User, @Query() query: ParkingReportsQueryDto) {
    return this.service.getOverview(user.tenantId, query);
  }

  @Get('daily')
  daily(@CurrentUser() user: User, @Query() query: ParkingReportsQueryDto) {
    return this.service.getDaily(user.tenantId, query);
  }

  @Get('top-plates')
  topPlates(@CurrentUser() user: User, @Query() query: ParkingReportsQueryDto) {
    return this.service.getTopPlates(user.tenantId, query);
  }
}
