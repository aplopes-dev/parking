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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import {
  AssignDeliveryDto,
  CreateCourierDto,
  CreateRouteDto,
  DeliveryOrdersQueryDto,
  UpdateAssignmentStatusDto,
  UpdateCourierDto,
  UpdateRouteDto,
} from './dto/delivery.dto';
import { DeliveryService } from './delivery.service';

const DELIVERY_ROLES = Object.values(UserRole);

@ApiTags('delivery')
@Controller('delivery')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DELIVERY_ROLES)
@ApiBearerAuth()
export class DeliveryController {
  constructor(private readonly service: DeliveryService) {}

  @Get('overview')
  overview(@CurrentUser() user: User) {
    return this.service.getOverview(user.tenantId);
  }

  @Get('orders')
  listOrders(@CurrentUser() user: User, @Query() query: DeliveryOrdersQueryDto) {
    return this.service.listDeliveryOrders(user.tenantId, query);
  }

  @Get('orders/:id')
  getOrder(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.getDeliveryOrder(user.tenantId, id);
  }

  @Post('orders/:id/assign')
  assign(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: AssignDeliveryDto) {
    return this.service.assignCourier(user.tenantId, id, dto);
  }

  @Patch('orders/:id/status')
  updateStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentStatusDto,
  ) {
    return this.service.updateAssignmentStatus(user.tenantId, id, dto);
  }

  @Get('couriers')
  listCouriers(@CurrentUser() user: User) {
    return this.service.listCouriers(user.tenantId);
  }

  @Post('couriers')
  createCourier(@CurrentUser() user: User, @Body() dto: CreateCourierDto) {
    return this.service.createCourier(user.tenantId, dto);
  }

  @Patch('couriers/:id')
  updateCourier(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateCourierDto,
  ) {
    return this.service.updateCourier(user.tenantId, id, dto);
  }

  @Delete('couriers/:id')
  deleteCourier(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.deleteCourier(user.tenantId, id);
  }

  @Get('routes')
  listRoutes(@CurrentUser() user: User) {
    return this.service.listRoutes(user.tenantId);
  }

  @Post('routes')
  createRoute(@CurrentUser() user: User, @Body() dto: CreateRouteDto) {
    return this.service.createRoute(user.tenantId, dto);
  }

  @Patch('routes/:id')
  updateRoute(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateRouteDto) {
    return this.service.updateRoute(user.tenantId, id, dto);
  }

  @Delete('routes/:id')
  deleteRoute(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.deleteRoute(user.tenantId, id);
  }
}
