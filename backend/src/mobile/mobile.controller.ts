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
import { MobileService } from './mobile.service';
import { OpenTableDto, MobileAddItemDto, MobilePaymentDto } from './dto/mobile.dto';
import { UpdateWaiterNotificationDto } from './dto/waiter-notification.dto';

const ALL_ROLES = Object.values(UserRole) as readonly UserRole[];

const STAFF_ROLES = ALL_ROLES;
const PAYMENT_ROLES = ALL_ROLES;
const KITCHEN_ROLES = ALL_ROLES;
const WAITER_NOTIFY_ROLES = ALL_ROLES;

@ApiTags('mobile')
@Controller('mobile')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MobileController {
  constructor(private readonly service: MobileService) {}

  @Get('bootstrap')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Dados iniciais SmartPOS (mesas, cardápio mesa, config PDV)' })
  bootstrap(@CurrentUser() user: User) {
    return this.service.getBootstrap(user.tenantId);
  }

  @Get('menu-promo-prices')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Preços promocionais ativos por produto (campanhas CRM)' })
  menuPromoPrices(@CurrentUser() user: User) {
    return this.service.getMenuPromoPrices(user.tenantId);
  }

  @Get('tables')
  @Roles(...STAFF_ROLES)
  listTables(@CurrentUser() user: User) {
    return this.service.listTables(user.tenantId);
  }

  @Post('tables/:id/open')
  @Roles(...STAFF_ROLES)
  openTable(
    @Param('id') id: string,
    @Body() dto: OpenTableDto,
    @CurrentUser() user: User,
  ) {
    return this.service.openTable(id, user.tenantId, dto, user.id);
  }

  @Post('tables/:id/items')
  @Roles(...STAFF_ROLES)
  addItem(
    @Param('id') id: string,
    @Body() dto: MobileAddItemDto,
    @CurrentUser() user: User,
  ) {
    return this.service.addItem(id, user.tenantId, dto, user.id);
  }

  @Delete('tables/:id/items/:itemId')
  @Roles(...STAFF_ROLES)
  removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: User,
  ) {
    return this.service.removeItem(id, itemId, user.tenantId, user.id);
  }

  @Post('tables/:id/send-to-kitchen')
  @Roles(...STAFF_ROLES)
  sendToKitchen(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.sendToKitchen(id, user.tenantId, user.id);
  }

  @Post('tables/:id/payments')
  @Roles(...PAYMENT_ROLES)
  registerPayment(
    @Param('id') id: string,
    @Body() dto: MobilePaymentDto,
    @CurrentUser() user: User,
  ) {
    return this.service.registerPayment(id, user.tenantId, dto, user.id);
  }

  @Post('tables/:id/service-fee')
  @Roles(...STAFF_ROLES)
  applyServiceFee(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.applyServiceFee(id, user.tenantId, user.id);
  }

  @Post('tables/:id/close-account')
  @Roles(...STAFF_ROLES)
  closeAccount(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.closeAccount(id, user.tenantId, user.id);
  }

  @Post('tables/:id/free')
  @Roles(...ALL_ROLES)
  freeTable(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.freeTable(id, user.tenantId, user.id);
  }

  @Get('kitchen/queue')
  @Roles(...KITCHEN_ROLES)
  @ApiOperation({ summary: 'Fila KDS — itens enviados à cozinha aguardando preparo' })
  kitchenQueue(@CurrentUser() user: User) {
    return this.service.getKitchenQueue(user.tenantId);
  }

  @Post('kitchen/items/:itemId/ready')
  @Roles(...KITCHEN_ROLES)
  @ApiOperation({ summary: 'Marcar item da fila como pronto (entregue)' })
  markKitchenReady(@Param('itemId') itemId: string, @CurrentUser() user: User) {
    return this.service.markKitchenItemReady(itemId, user.tenantId, user.id);
  }

  @Get('waiter-notifications')
  @Roles(...WAITER_NOTIFY_ROLES)
  @ApiOperation({
    summary:
      'Notificações pendentes (garçom: suas mesas; admin/gestor: todas do salão)',
  })
  listWaiterNotifications(
    @CurrentUser() user: User,
    @Query('scope') scope?: string,
  ) {
    const viewAllSalon = scope === 'salon';
    return this.service.listWaiterNotifications(
      user.tenantId,
      user.id,
      user.role,
      viewAllSalon,
    );
  }

  @Patch('waiter-notifications/:id')
  @Roles(...WAITER_NOTIFY_ROLES)
  @ApiOperation({ summary: 'Marcar notificação como lida ou entregue na mesa' })
  updateWaiterNotification(
    @Param('id') id: string,
    @Body() dto: UpdateWaiterNotificationDto,
    @CurrentUser() user: User,
  ) {
    return this.service.updateWaiterNotification(
      user.tenantId,
      user.id,
      user.role,
      id,
      dto.status,
    );
  }
}
