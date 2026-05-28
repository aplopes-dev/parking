import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from '../pdv/entities/order-item.entity';
import { OrderItemKitchenStatus } from '../pdv/entities/order-item-kitchen.enums';
import { OrderStatus } from '../pdv/entities/pdv.enums';
import { Order } from '../pdv/entities/order.entity';
import {
  WaiterNotificationStatus,
  WaiterTableNotification,
} from '../mobile/entities/waiter-notification.entity';
import {
  NotificationListQueryDto,
  NOTIFICATION_SORT_FIELDS,
  UpdateProductionSettingsDto,
} from './dto/production.dto';
import { ProductionSettings } from './entities/production-settings.entity';
import { buildPaginatedMeta, resolvePagination } from '../common/dto/pagination-query.dto';

@Injectable()
export class ProductionService {
  constructor(
    @InjectRepository(ProductionSettings)
    private readonly settingsRepo: Repository<ProductionSettings>,
    @InjectRepository(WaiterTableNotification)
    private readonly notificationsRepo: Repository<WaiterTableNotification>,
    @InjectRepository(OrderItem) private readonly itemsRepo: Repository<OrderItem>,
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
  ) {}

  async getOrCreateSettings(tenantId: string) {
    let row = await this.settingsRepo.findOne({ where: { tenantId } });
    if (!row) {
      row = await this.settingsRepo.save(this.settingsRepo.create({ tenantId }));
    }
    return row;
  }

  updateSettings(tenantId: string, dto: UpdateProductionSettingsDto) {
    return this.getOrCreateSettings(tenantId).then(async (row) => {
      Object.assign(row, dto);
      return this.settingsRepo.save(row);
    });
  }

  async getOverview(tenantId: string) {
    const [settings, kitchenQueue, pendingNotifications, ordersInPrep] = await Promise.all([
      this.getOrCreateSettings(tenantId),
      this.itemsRepo
        .createQueryBuilder('item')
        .innerJoin('item.order', 'o')
        .where('o.tenant_id = :tenantId', { tenantId })
        .andWhere('item.kitchen_status = :st', {
          st: OrderItemKitchenStatus.ENVIADO_COZINHA,
        })
        .getCount(),
      this.notificationsRepo.count({
        where: { tenantId, status: WaiterNotificationStatus.PENDING },
      }),
      this.ordersRepo.count({
        where: {
          tenantId,
          status: OrderStatus.PREPARANDO,
        },
      }),
    ]);

    const slaMinutes = settings.slaWarningMinutes;
    const overdueItems = await this.itemsRepo
      .createQueryBuilder('item')
      .innerJoin('item.order', 'o')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('item.kitchen_status = :st', {
        st: OrderItemKitchenStatus.ENVIADO_COZINHA,
      })
      .andWhere('item.kitchen_sent_at < :cutoff', {
        cutoff: new Date(Date.now() - slaMinutes * 60 * 1000),
      })
      .getCount();

    return {
      settings,
      kitchenQueue,
      pendingNotifications,
      ordersInPrep,
      overdueItems,
    };
  }

  listNotifications(tenantId: string, limit = 80) {
    return this.notificationsRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async listNotificationsPaginated(tenantId: string, query: NotificationListQueryDto) {
    const { page, limit, skip, sortOrder } = resolvePagination(query);
    const sortBy =
      query.sortBy && (NOTIFICATION_SORT_FIELDS as readonly string[]).includes(query.sortBy)
        ? query.sortBy
        : 'createdAt';

    const qb = this.notificationsRepo
      .createQueryBuilder('n')
      .where('n.tenant_id = :tenantId', { tenantId });

    if (query.search?.trim()) {
      const raw = query.search.trim();
      if (/^\d+$/.test(raw)) {
        qb.andWhere('n.order_number = :orderNum', { orderNum: Number(raw) });
      } else {
        const term = `%${raw.toLowerCase()}%`;
        qb.andWhere(
          '(LOWER(n.product_name) ILIKE :term OR LOWER(n.table_label) ILIKE :term)',
          { term },
        );
      }
    }

    if (query.dateFrom) {
      qb.andWhere('n.created_at >= :dateFrom', { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      const endOfDay = `${query.dateTo.slice(0, 10)}T23:59:59.999`;
      qb.andWhere('n.created_at <= :dateTo', { dateTo: endOfDay });
    }

    const total = await qb.getCount();

    const columnMap: Record<string, string> = {
      createdAt: 'n.created_at',
      orderNumber: 'n.order_number',
      tableLabel: 'n.table_label',
      productName: 'n.product_name',
      status: 'n.status',
    };
    qb.orderBy(columnMap[sortBy] ?? 'n.created_at', sortOrder);

    const data = await qb.skip(skip).take(limit).getMany();

    return buildPaginatedMeta(data, total, page, limit, sortBy, sortOrder);
  }
}
