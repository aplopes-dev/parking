import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import { NotificationListQueryDto, UpdateProductionSettingsDto } from './dto/production.dto';
import { ProductionService } from './production.service';

const ALL_ROLES = Object.values(UserRole);
const PRODUCTION_ADMIN = ALL_ROLES;
const PRODUCTION_VIEW = ALL_ROLES;

@ApiTags('production')
@Controller('production')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProductionController {
  constructor(private readonly service: ProductionService) {}

  @Get('overview')
  @Roles(...PRODUCTION_VIEW)
  overview(@CurrentUser() user: User) {
    return this.service.getOverview(user.tenantId);
  }

  @Get('settings')
  @Roles(...PRODUCTION_ADMIN)
  getSettings(@CurrentUser() user: User) {
    return this.service.getOrCreateSettings(user.tenantId);
  }

  @Patch('settings')
  @Roles(...PRODUCTION_ADMIN)
  updateSettings(@CurrentUser() user: User, @Body() dto: UpdateProductionSettingsDto) {
    return this.service.updateSettings(user.tenantId, dto);
  }

  @Get('notifications')
  @Roles(...PRODUCTION_ADMIN)
  notifications(@CurrentUser() user: User, @Query() query: NotificationListQueryDto) {
    return this.service.listNotificationsPaginated(user.tenantId, query);
  }
}
