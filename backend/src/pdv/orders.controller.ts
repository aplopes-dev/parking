import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  forwardRef,
  Get,
  Inject,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MobileService } from '../mobile/mobile.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { OrdersService } from './orders.service';
import { OrderStatus, OrderType } from './entities/pdv.enums';
import {
  AddOrderItemDto,
  AddOrderPaymentDto,
  CloseOrderDto,
  CreateOrderDto,
  SetBillSplitsDto,
  UpdateOrderDetailsDto,
  UpdateOrderFeesDto,
  UpdateOrderItemDto,
  UpdateOrderStatusDto,
} from './dto/pdv.dto';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(
    private readonly service: OrdersService,
    @Inject(forwardRef(() => MobileService))
    private readonly mobileService: MobileService,
  ) {}

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('type') type?: OrderType,
    @Query('status') status?: OrderStatus,
    @Query('openOnly') openOnly?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(user.tenantId, {
      type,
      status,
      openOnly: openOnly === 'true',
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findOne(id, user.tenantId);
  }

  @Post()
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  async create(@Body() dto: CreateOrderDto, @CurrentUser() user: User) {
    const order = await this.service.create(dto, user.tenantId, user.id);
    if (dto.tableId) {
      try {
        await this.mobileService.broadcastTablesUpdated(user.tenantId, 'orderCreated');
      } catch (err) {
        this.logger.error('broadcastTablesUpdated (create) failed', err);
      }
    }
    return order;
  }

  @Patch(':id/details')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  async updateDetails(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDetailsDto,
    @CurrentUser() user: User,
  ) {
    const order = await this.service.updateDetails(id, user.tenantId, dto, user.id);
    if (dto.tableId !== undefined) {
      try {
        await this.mobileService.broadcastTablesUpdated(user.tenantId, 'orderDetailsUpdated');
      } catch (err) {
        this.logger.error('broadcastTablesUpdated (updateDetails) failed', err);
      }
    }
    return order;
  }

  @Patch(':id/status')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.service.updateStatus(id, user.tenantId, dto, user.id);
  }

  @Post(':id/items')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  addItem(@Param('id') id: string, @Body() dto: AddOrderItemDto, @CurrentUser() user: User) {
    return this.service.addItem(id, user.tenantId, dto, user.id);
  }

  @Patch(':id/items/:itemId')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOrderItemDto,
    @CurrentUser() user: User,
  ) {
    return this.service.updateItem(id, itemId, user.tenantId, dto, user.id);
  }

  @Delete(':id/items/:itemId')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: User,
  ) {
    return this.service.removeItem(id, itemId, user.tenantId, user.id);
  }

  @Patch(':id/fees')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  updateFees(
    @Param('id') id: string,
    @Body() dto: UpdateOrderFeesDto,
    @CurrentUser() user: User,
  ) {
    return this.service.updateFees(id, user.tenantId, dto, user.id);
  }

  @Post(':id/service-fee')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  applyServiceFee(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.applyDefaultServiceFee(id, user.tenantId, user.id);
  }

  @Post(':id/splits')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  setSplits(@Param('id') id: string, @Body() dto: SetBillSplitsDto, @CurrentUser() user: User) {
    return this.service.setBillSplits(id, user.tenantId, dto, user.id);
  }

  @Post(':id/payments')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  addPayment(
    @Param('id') id: string,
    @Body() dto: AddOrderPaymentDto,
    @CurrentUser() user: User,
  ) {
    return this.service.addPayment(id, user.tenantId, dto, user.id);
  }

  @Post(':id/send-to-kitchen')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  async sendToKitchen(@Param('id') id: string, @CurrentUser() user: User) {
    const sentCount = await this.service.sendItemsToKitchen(
      id,
      user.tenantId,
      user.id,
    );
    if (sentCount === 0) {
      throw new BadRequestException(
        'Não há itens novos para enviar à cozinha',
      );
    }
    try {
      await this.mobileService.broadcastTablesUpdated(user.tenantId, 'sentToKitchen');
      await this.mobileService.notifyKitchenUpdated(user.tenantId);
    } catch (err) {
      this.logger.error('broadcastTablesUpdated (sentToKitchen) failed', err);
    }
    return this.service.findOne(id, user.tenantId);
  }

  @Post(':id/close')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  async close(
    @Param('id') id: string,
    @Body() dto: CloseOrderDto,
    @CurrentUser() user: User,
  ) {
    const order = await this.service.closeOrder(id, user.tenantId, dto, user.id);
    try {
      await this.mobileService.broadcastTablesUpdated(user.tenantId, 'orderClosed');
    } catch (err) {
      this.logger.error('broadcastTablesUpdated (orderClosed) failed', err);
    }
    return order;
  }

  @Post(':id/cancel')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  async cancel(@Param('id') id: string, @CurrentUser() user: User) {
    const order = await this.service.cancelOrder(id, user.tenantId, user.id);
    try {
      await this.mobileService.broadcastTablesUpdated(user.tenantId, 'orderCancelled');
    } catch (err) {
      this.logger.error('broadcastTablesUpdated (orderCancelled) failed', err);
    }
    return order;
  }
}
