import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { Order } from '../pdv/entities/order.entity';
import { OrderItem } from '../pdv/entities/order-item.entity';
import { OrderStatus } from '../pdv/entities/pdv.enums';
import { UserRole } from '../users/entities/user.entity';
import { RestaurantTable } from './entities/restaurant-table.entity';
import {
  WaiterNotificationStatus,
  WaiterTableNotification,
} from './entities/waiter-notification.entity';
import { MobileRealtimeService } from './mobile-realtime.service';

const SALON_SUPERVISOR_ROLES: UserRole[] = Object.values(UserRole);

const CLOSED_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.FECHADO,
  OrderStatus.CANCELADO,
];

export function canViewAllWaiterNotifications(role: string | undefined): boolean {
  if (!role) return false;
  return SALON_SUPERVISOR_ROLES.includes(role as UserRole);
}

export type WaiterNotificationDto = {
  id: string;
  targetUserId: string;
  orderId: string;
  orderItemId: string;
  orderNumber: number;
  tableNumber: number | null;
  tableLabel: string | null;
  zone: string | null;
  productName: string;
  quantity: number;
  status: WaiterNotificationStatus;
  createdAt: string;
};

@Injectable()
export class WaiterNotificationService {
  constructor(
    @InjectRepository(WaiterTableNotification)
    private readonly repo: Repository<WaiterTableNotification>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(RestaurantTable)
    private readonly tableRepo: Repository<RestaurantTable>,
    private readonly realtime: MobileRealtimeService,
  ) {}

  toDto(row: WaiterTableNotification): WaiterNotificationDto {
    return {
      id: row.id,
      targetUserId: row.targetUserId,
      orderId: row.orderId,
      orderItemId: row.orderItemId,
      orderNumber: row.orderNumber,
      tableNumber: row.tableNumber,
      tableLabel: row.tableLabel,
      zone: row.zone,
      productName: row.productName,
      quantity: parseFloat(row.quantity),
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private broadcastStatus(row: WaiterTableNotification, tenantId: string): void {
    this.realtime.broadcast(tenantId, {
      event: 'waiter.notification',
      data: { notification: this.toDto(row) },
    });
  }

  /** Notificação só vale se a comanda ainda está aberta na mesa. */
  private isRowStillRelevant(
    row: WaiterTableNotification,
    orderById: Map<string, Order>,
    tableById: Map<string, RestaurantTable>,
  ): boolean {
    const order = orderById.get(row.orderId);
    if (!order || CLOSED_ORDER_STATUSES.includes(order.status)) {
      return false;
    }
    if (!order.tableId) {
      return true;
    }
    const table = tableById.get(order.tableId);
    return Boolean(table?.currentOrderId && table.currentOrderId === order.id);
  }

  private async partitionAndDismissStale(
    tenantId: string,
    rows: WaiterTableNotification[],
  ): Promise<WaiterTableNotification[]> {
    if (!rows.length) return [];

    const orderIds = [...new Set(rows.map((r) => r.orderId))];
    const orders = await this.orderRepo.find({
      where: { tenantId, id: In(orderIds) },
    });
    const orderById = new Map(orders.map((o) => [o.id, o]));

    const tableIds = orders
      .map((o) => o.tableId)
      .filter((id): id is string => Boolean(id));
    const tables =
      tableIds.length > 0
        ? await this.tableRepo.find({ where: { tenantId, id: In(tableIds) } })
        : [];
    const tableById = new Map(tables.map((t) => [t.id, t]));

    const active: WaiterTableNotification[] = [];
    const stale: WaiterTableNotification[] = [];

    for (const row of rows) {
      if (this.isRowStillRelevant(row, orderById, tableById)) {
        active.push(row);
      } else {
        stale.push(row);
      }
    }

    if (stale.length > 0) {
      await this.repo.update(
        { id: In(stale.map((s) => s.id)) },
        { status: WaiterNotificationStatus.DELIVERED },
      );
      for (const row of stale) {
        row.status = WaiterNotificationStatus.DELIVERED;
        this.broadcastStatus(row, tenantId);
      }
    }

    return active;
  }

  async dismissPendingForOrder(tenantId: string, orderId: string): Promise<void> {
    const rows = await this.repo.find({
      where: {
        tenantId,
        orderId,
        status: WaiterNotificationStatus.PENDING,
      },
    });
    if (!rows.length) return;

    await this.repo.update(
      { tenantId, orderId, status: WaiterNotificationStatus.PENDING },
      { status: WaiterNotificationStatus.DELIVERED },
    );

    for (const row of rows) {
      row.status = WaiterNotificationStatus.DELIVERED;
      this.broadcastStatus(row, tenantId);
    }
  }

  async listPending(
    tenantId: string,
    userId: string,
    userRole?: string,
    viewAllSalon = false,
  ): Promise<WaiterNotificationDto[]> {
    const viewAll =
      viewAllSalon || canViewAllWaiterNotifications(userRole);
    const where: FindOptionsWhere<WaiterTableNotification> = {
      tenantId,
      status: WaiterNotificationStatus.PENDING,
    };
    if (!viewAll) {
      where.targetUserId = userId;
    }
    const rows = await this.repo.find({
      where,
      order: { createdAt: 'DESC' },
    });
    const active = await this.partitionAndDismissStale(tenantId, rows);
    return active.map((r) => this.toDto(r));
  }

  async createFromKitchenReady(
    tenantId: string,
    order: Order,
    item: OrderItem,
    table: RestaurantTable | null,
  ): Promise<WaiterTableNotification | null> {
    if (!order.openedByUserId) {
      return null;
    }

    const existing = await this.repo.findOne({
      where: {
        tenantId,
        orderItemId: item.id,
        status: WaiterNotificationStatus.PENDING,
      },
    });
    if (existing) {
      return existing;
    }

    const row = await this.repo.save(
      this.repo.create({
        tenantId,
        targetUserId: order.openedByUserId,
        orderId: order.id,
        orderItemId: item.id,
        orderNumber: order.orderNumber,
        tableNumber: table?.number ?? null,
        tableLabel: order.tableLabel,
        zone: table?.zone ?? null,
        productName: item.productName,
        quantity: item.quantity,
        status: WaiterNotificationStatus.PENDING,
      }),
    );

    const event = {
      event: 'waiter.notification' as const,
      data: { notification: this.toDto(row) },
    };
    this.realtime.broadcast(tenantId, event);

    return row;
  }

  async updateStatus(
    id: string,
    tenantId: string,
    userId: string,
    status: WaiterNotificationStatus.READ | WaiterNotificationStatus.DELIVERED,
    userRole?: string,
  ): Promise<WaiterNotificationDto> {
    const where: FindOptionsWhere<WaiterTableNotification> = { id, tenantId };
    if (!canViewAllWaiterNotifications(userRole)) {
      where.targetUserId = userId;
    }
    const row = await this.repo.findOne({ where });
    if (!row) {
      throw new NotFoundException('Notificação não encontrada');
    }
    row.status = status;
    await this.repo.save(row);
    const dto = this.toDto(row);
    this.realtime.broadcast(tenantId, {
      event: 'waiter.notification',
      data: { notification: dto },
    });
    return dto;
  }
}
