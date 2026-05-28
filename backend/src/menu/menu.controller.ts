import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { MenuService } from './menu.service';
import { MenuChannel } from './entities/menu.enums';
import { SyncMenuProductsDto, UpdateMenuSettingsDto } from './dto/menu.dto';

@ApiTags('menu')
@Controller('menu')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MenuController {
  constructor(private readonly service: MenuService) {}

  @Get(':channel/settings')
  getSettings(@Param('channel') channel: MenuChannel, @CurrentUser() user: User) {
    return this.service.getSettings(user.tenantId, channel);
  }

  @Patch(':channel/settings')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  updateSettings(
    @Param('channel') channel: MenuChannel,
    @Body() dto: UpdateMenuSettingsDto,
    @CurrentUser() user: User,
  ) {
    return this.service.updateSettings(user.tenantId, channel, dto);
  }

  @Get(':channel/catalog')
  @ApiOperation({ summary: 'Cardápio público interno por canal' })
  getCatalog(@Param('channel') channel: MenuChannel, @CurrentUser() user: User) {
    return this.service.getCatalog(user.tenantId, channel);
  }

  @Post(':channel/products/sync')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  syncProducts(
    @Param('channel') channel: MenuChannel,
    @Body() dto: SyncMenuProductsDto,
    @CurrentUser() user: User,
  ) {
    return this.service.syncProducts(user.tenantId, { ...dto, channel });
  }
}
