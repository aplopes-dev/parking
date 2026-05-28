import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { PdvSettingsService } from './pdv-settings.service';
import { OrderLogsService } from './order-logs.service';
import { UpdatePdvSettingsDto } from './dto/pdv.dto';
import { OrderLogListQueryDto } from './dto/order-log-list-query.dto';

@ApiTags('pdv')
@Controller('pdv')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PdvController {
  constructor(
    private readonly settingsService: PdvSettingsService,
    private readonly logsService: OrderLogsService,
  ) {}

  @Get('settings')
  getSettings(@CurrentUser() user: User) {
    return this.settingsService.getOrCreate(user.tenantId);
  }

  @Patch('settings')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  updateSettings(@Body() dto: UpdatePdvSettingsDto, @CurrentUser() user: User) {
    return this.settingsService.update(user.tenantId, dto);
  }

  @Get('logs')
  getLogs(@CurrentUser() user: User, @Query() query: OrderLogListQueryDto) {
    return this.logsService.findAllPaginated(user.tenantId, query);
  }
}
