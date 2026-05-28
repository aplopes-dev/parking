import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RestaurantTable } from './entities/restaurant-table.entity';
import { MenuService } from '../menu/menu.service';
import { MenuChannel } from '../menu/entities/menu.enums';
import { OrdersService } from '../pdv/orders.service';
import { PdvSettingsService } from '../pdv/pdv-settings.service';
import { Order } from '../pdv/entities/order.entity';
import { OrderItem } from '../pdv/entities/order-item.entity';
import { OrderStatus, OrderType, PaymentMethod } from '../pdv/entities/pdv.enums';
import { OrderItemKitchenStatus } from '../pdv/entities/order-item-kitchen.enums';
import { ProductGroup } from '../product-groups/entities/product-group.entity';
import { OpenTableDto, MobileAddItemDto, MobilePaymentDto } from './dto/mobile.dto';
import { PaymentMethod as BackendPaymentMethod } from '../pdv/entities/pdv.enums';
import { MobileRealtimeService } from './mobile-realtime.service';
import { WaiterNotificationService } from './waiter-notification.service';
import { WaiterNotificationStatus } from './entities/waiter-notification.entity';
import { CrmCampaignPricingService } from '../crm/crm-campaign-pricing.service';

function categoryIconForName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('beb') || n.includes('drink')) return '🥤';
  if (n.includes('pizz')) return '🍕';
  if (n.includes('burg') || n.includes('lanch')) return '🍔';
  if (n.includes('sobrem') || n.includes('doce')) return '🍰';
  if (n.includes('salad') || n.includes('entrada')) return '🥗';
  if (n.includes('carne') || n.includes('churra')) return '🥩';
  if (n.includes('frut') || n.includes('suco')) return '🍊';
  if (n.includes('caf')) return '☕';
  if (n.includes('cervej') || n.includes('bar')) return '🍺';
  if (n.includes('combo') || n.includes('promo')) return '⭐';
  return '🍽️';
}

const DEFAULT_TABLES: { number: number; capacity: number; zone: string }[] = [
  { number: 1, capacity: 4, zone: 'Salão' },
  { number: 2, capacity: 2, zone: 'Salão' },
  { number: 3, capacity: 6, zone: 'Salão' },
  { number: 4, capacity: 4, zone: 'Varanda' },
  { number: 5, capacity: 8, zone: 'Varanda' },
  { number: 6, capacity: 2, zone: 'Bar' },
  { number: 7, capacity: 4, zone: 'Bar' },
  { number: 8, capacity: 6, zone: 'VIP' },
  { number: 9, capacity: 4, zone: 'VIP' },
  { number: 10, capacity: 2, zone: 'Balcão' },
  { number: 11, capacity: 4, zone: 'Balcão' },
  { number: 12, capacity: 6, zone: 'Terraço' },
];

export type MobileTableStatus = 'free' | 'open' | 'payment_pending' | 'closed';

@Injectable()
export class MobileService {
  constructor(
    @InjectRepository(RestaurantTable)
    private readonly tableRepository: Repository<RestaurantTable>,
    @InjectRepository(ProductGroup)
    private readonly groupRepository: Repository<ProductGroup>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly menuService: MenuService,
    private readonly ordersService: OrdersService,
    private readonly pdvSettingsService: PdvSettingsService,
    private readonly realtime: MobileRealtimeService,
    private readonly waiterNotifications: WaiterNotificationService,
    private readonly campaignPricing: CrmCampaignPricingService,
  ) {}

  /** Atualiza clientes do Painel geral (WebSocket) após mudança de mesa. */
  async broadcastTablesUpdated(tenantId: string, source?: string): Promise<void> {
    await this.notifyTablesUpdated(tenantId, source);
  }

  private async notifyTablesUpdated(tenantId: string, source?: string): Promise<void> {
    const tables = await this.listTables(tenantId);
    this.realtime.broadcast(tenantId, {
      event: 'tables.updated',
      data: { tables, source },
    });
  }

  async ensureDefaultTables(tenantId: string): Promise<void> {
    const count = await this.tableRepository.count({ where: { tenantId } });
    if (count > 0) return;
    await this.tableRepository.save(
      DEFAULT_TABLES.map((t) =>
        this.tableRepository.create({ tenantId, ...t }),
      ),
    );
  }

  async getBootstrap(tenantId: string) {
    await this.ensureDefaultTables(tenantId);
    const [tables, catalog, settings, groups] = await Promise.all([
      this.listTables(tenantId),
      this.menuService.getCatalog(tenantId, MenuChannel.MESA),
      this.pdvSettingsService.getOrCreate(tenantId),
      this.groupRepository.find({
        where: { tenantId, active: true },
        order: { sortOrder: 'ASC', name: 'ASC' },
      }),
    ]);

    const categories = groups.map((g) => ({
      id: g.id,
      name: g.name,
      icon: categoryIconForName(g.name),
    }));

    const promoMap = await this.campaignPricing.getPromoPriceMap(tenantId);

    const items = catalog.visible.map((entry) => {
      const basePrice = parseFloat(String(entry.product.salePrice));
      const promo = promoMap.get(entry.product.id);
      const price = promo?.price ?? basePrice;
      const hasPromo = Boolean(promo && price < basePrice);

      return {
        id: entry.product.id,
        categoryId: entry.product.groupId ?? 'uncategorized',
        name: entry.product.name,
        description: entry.product.description ?? '',
        price,
        originalPrice: hasPromo ? basePrice : undefined,
        promoLabel: hasPromo ? promo!.promoLabel : undefined,
        available: entry.visible,
        featured: entry.featured,
        imageKey: entry.product.photoKey ?? null,
        imageUpdatedAt: entry.product.photoKey
          ? entry.product.updatedAt.toISOString()
          : null,
      };
    });

    return {
      settings: {
        defaultServiceFeePercent: parseFloat(String(settings.defaultServiceFeePercent)),
        allowSplitBill: settings.allowSplitBill,
      },
      menu: {
        settings: catalog.settings,
        categories,
        items,
      },
      tables,
    };
  }

  async getMenuPromoPrices(tenantId: string) {
    return this.campaignPricing.getPromoPricesRecord(tenantId);
  }

  async listTables(tenantId: string) {
    await this.ensureDefaultTables(tenantId);
    const tables = await this.tableRepository.find({
      where: { tenantId, active: true },
      relations: ['currentOrder', 'currentOrder.items', 'currentOrder.payments'],
      order: { number: 'ASC' },
    });
    return tables.map((t) => this.mapTable(t));
  }

  async openTable(tableId: string, tenantId: string, dto: OpenTableDto, userId: string) {
    const table = await this.getTableEntity(tableId, tenantId);
    if (table.currentOrderId) {
      throw new BadRequestException('Mesa já possui conta aberta');
    }

    const order = await this.ordersService.create(
      {
        type: OrderType.TABLET,
        tableId: table.id,
        tableLabel: `Mesa ${table.number}`,
        guestCount: dto.guestCount,
        waiterName: dto.waiterName,
        applyServiceFee: true,
      },
      tenantId,
      userId,
    );

    table.currentOrderId = order.id;
    await this.tableRepository.save(table);
    const mapped = this.mapTable(await this.reloadTable(table.id, tenantId));
    await this.notifyTablesUpdated(tenantId, 'openTable');
    return mapped;
  }

  async addItem(
    tableId: string,
    tenantId: string,
    dto: MobileAddItemDto,
    userId: string,
  ) {
    const table = await this.getTableEntity(tableId, tenantId);
    const orderId = table.currentOrderId;
    if (!orderId) throw new BadRequestException('Abra a mesa antes de lançar pedidos');
    await this.ordersService.addItem(orderId, tenantId, dto, userId);
    const mapped = this.mapTable(await this.reloadTable(tableId, tenantId));
    await this.notifyTablesUpdated(tenantId, 'addItem');
    return mapped;
  }

  async removeItem(tableId: string, itemId: string, tenantId: string, userId: string) {
    const table = await this.getTableEntity(tableId, tenantId);
    if (!table.currentOrderId) throw new BadRequestException('Mesa sem pedido');
    await this.ordersService.removeItem(table.currentOrderId, itemId, tenantId, userId);
    const mapped = this.mapTable(await this.reloadTable(tableId, tenantId));
    await this.notifyTablesUpdated(tenantId, 'removeItem');
    return mapped;
  }

  async sendToKitchen(tableId: string, tenantId: string, userId: string) {
    const table = await this.getTableEntity(tableId, tenantId);
    if (!table.currentOrderId) throw new BadRequestException('Mesa sem pedido');
    const sentCount = await this.ordersService.sendItemsToKitchen(
      table.currentOrderId,
      tenantId,
      userId,
    );
    if (sentCount === 0) {
      throw new BadRequestException(
        'Não há itens novos para enviar à cozinha',
      );
    }
    const mapped = this.mapTable(await this.reloadTable(tableId, tenantId));
    await this.notifyTablesUpdated(tenantId, 'sendToKitchen');
    await this.notifyKitchenUpdated(tenantId);
    return mapped;
  }

  async notifyKitchenUpdated(tenantId: string): Promise<void> {
    this.realtime.broadcast(tenantId, {
      event: 'kitchen.updated',
      data: { source: 'kitchen' },
    });
  }

  async getKitchenQueue(tenantId: string) {
    const items = await this.orderItemRepository
      .createQueryBuilder('item')
      .innerJoinAndSelect('item.order', 'order')
      .where('order.tenantId = :tenantId', { tenantId })
      .andWhere('item.kitchenStatus = :kitchenStatus', {
        kitchenStatus: OrderItemKitchenStatus.ENVIADO_COZINHA,
      })
      .andWhere('order.status NOT IN (:...closedStatuses)', {
        closedStatuses: [OrderStatus.FECHADO, OrderStatus.CANCELADO],
      })
      .orderBy('item.createdAt', 'ASC')
      .addOrderBy('item.sortOrder', 'ASC')
      .getMany();

    const tableIds = [
      ...new Set(items.map((i) => i.order.tableId).filter((id): id is string => Boolean(id))),
    ];
    const tables =
      tableIds.length > 0
        ? await this.tableRepository.find({
            where: { id: In(tableIds), tenantId },
          })
        : [];
    const tableById = new Map(tables.map((t) => [t.id, t]));

    return items.map((item) => {
      const table = item.order.tableId ? tableById.get(item.order.tableId) : undefined;
      return {
        id: item.id,
        orderId: item.orderId,
        orderNumber: item.order.orderNumber,
        tableNumber: table?.number ?? null,
        tableLabel: item.order.tableLabel,
        zone: table?.zone ?? null,
        productName: item.productName,
        quantity: parseFloat(item.quantity),
        notes: item.notes,
        sentAt: (item.kitchenSentAt ?? item.createdAt).toISOString(),
      };
    });
  }

  async markKitchenItemReady(itemId: string, tenantId: string, userId: string) {
    const item = await this.orderItemRepository.findOne({
      where: { id: itemId },
      relations: ['order'],
    });
    if (!item || item.order.tenantId !== tenantId) {
      throw new NotFoundException('Item não encontrado');
    }
    if (item.kitchenStatus !== OrderItemKitchenStatus.ENVIADO_COZINHA) {
      throw new BadRequestException('Item não está na fila da cozinha');
    }
    item.kitchenStatus = OrderItemKitchenStatus.ENTREGUE;
    await this.orderItemRepository.save(item);

    const order = item.order;
    let table: RestaurantTable | null = null;
    if (order.tableId) {
      table = await this.tableRepository.findOne({
        where: { id: order.tableId, tenantId },
      });
    }
    await this.waiterNotifications.createFromKitchenReady(
      tenantId,
      order,
      item,
      table,
    );

    await this.ordersService.logKitchenItemReady(
      item.orderId,
      tenantId,
      item.productName,
      userId,
    );
    await this.ordersService.syncOrderStatusAfterKitchenReady(
      item.orderId,
      tenantId,
    );
    await this.notifyKitchenUpdated(tenantId);
    if (item.order.tableId) {
      await this.notifyTablesUpdated(tenantId, 'kitchenReady');
    }
    return { id: item.id, status: 'ready' };
  }

  listWaiterNotifications(
    tenantId: string,
    userId: string,
    userRole: string,
    viewAllSalon = false,
  ) {
    return this.waiterNotifications.listPending(
      tenantId,
      userId,
      userRole,
      viewAllSalon,
    );
  }

  updateWaiterNotification(
    tenantId: string,
    userId: string,
    userRole: string,
    notificationId: string,
    status: WaiterNotificationStatus.READ | WaiterNotificationStatus.DELIVERED,
  ) {
    return this.waiterNotifications.updateStatus(
      notificationId,
      tenantId,
      userId,
      status,
      userRole,
    );
  }

  async registerPayment(
    tableId: string,
    tenantId: string,
    dto: MobilePaymentDto,
    userId: string,
  ) {
    const table = await this.getTableEntity(tableId, tenantId);
    if (!table.currentOrderId) throw new BadRequestException('Mesa sem conta aberta');
    const order = await this.ordersService.findOne(table.currentOrderId, tenantId);
    if (order.status === OrderStatus.FECHADO) {
      throw new BadRequestException('Conta já quitada');
    }
    if (!order.accountClosedAt) {
      throw new BadRequestException('Encerre a conta antes de registrar o pagamento');
    }
    await this.ordersService.addPayment(
      table.currentOrderId,
      tenantId,
      {
        method: this.mapPaymentMethod(dto.method),
        amount: dto.amount,
        pagBank: dto.pagBank,
      },
      userId,
    );
    const mapped = this.mapTable(await this.reloadTable(tableId, tenantId));
    await this.notifyTablesUpdated(tenantId, 'registerPayment');
    return mapped;
  }

  async applyServiceFee(tableId: string, tenantId: string, userId: string) {
    const table = await this.getTableEntity(tableId, tenantId);
    if (!table.currentOrderId) throw new BadRequestException('Mesa sem pedido');
    await this.ordersService.applyDefaultServiceFee(table.currentOrderId, tenantId, userId);
    const mapped = this.mapTable(await this.reloadTable(tableId, tenantId));
    await this.notifyTablesUpdated(tenantId, 'applyServiceFee');
    return mapped;
  }

  async closeAccount(tableId: string, tenantId: string, userId: string) {
    const table = await this.getTableEntity(tableId, tenantId);
    if (!table.currentOrderId) throw new BadRequestException('Conta não encontrada');
    const order = await this.ordersService.closeTableAccount(
      table.currentOrderId,
      tenantId,
      userId,
    );

    const total = parseFloat(order.total);
    const paidAmount = (order.payments ?? []).reduce(
      (s, p) => s + parseFloat(p.amount),
      0,
    );
    const remaining = Math.max(0, total - paidAmount);

    const receipt = {
      id: order.id,
      tableNumber: table.number,
      orderNumber: order.orderNumber,
      waiterName: order.waiterName,
      issuedAt: new Date().toISOString(),
      items: (order.items ?? []).map((i) => this.mapOrderItem(i)),
      subtotal: parseFloat(order.subtotal),
      serviceFee: parseFloat(order.serviceFee),
      total,
      paidAmount,
      remaining,
      receiptKind: 'account_preview' as const,
      payments: (order.payments ?? []).map((p) => ({
        method: p.method,
        amount: parseFloat(p.amount),
        pagBank: p.pagbankTransactionId
          ? {
              transactionId: p.pagbankTransactionId,
              transactionCode: p.pagbankTransactionCode,
              nsu: p.pagbankNsu,
              hostNsu: p.pagbankHostNsu,
            }
          : null,
      })),
    };

    const result = {
      table: this.mapTable(await this.reloadTable(tableId, tenantId)),
      receipt,
    };
    await this.notifyTablesUpdated(tenantId, 'closeAccount');
    return result;
  }

  async freeTable(tableId: string, tenantId: string, userId: string) {
    const table = await this.getTableEntity(tableId, tenantId);
    if (table.currentOrderId) {
      const orderId = table.currentOrderId;
      await this.waiterNotifications.dismissPendingForOrder(tenantId, orderId);
      const order = await this.ordersService.findOne(orderId, tenantId);
      if (![OrderStatus.FECHADO, OrderStatus.CANCELADO].includes(order.status)) {
        await this.ordersService.cancelOrder(orderId, tenantId, userId);
        const cancelled = await this.ordersService.findOne(orderId, tenantId);
        await this.ordersService.releaseRestaurantTableForOrder(tenantId, cancelled);
      } else {
        await this.ordersService.releaseRestaurantTableForOrder(tenantId, order);
      }
    }
    const mapped = this.mapTable(await this.reloadTable(tableId, tenantId));
    await this.notifyTablesUpdated(tenantId, 'freeTable');
    return mapped;
  }

  private mapPaymentMethod(method: MobilePaymentDto['method']): BackendPaymentMethod {
    const map: Record<MobilePaymentDto['method'], BackendPaymentMethod> = {
      cash: BackendPaymentMethod.DINHEIRO,
      credit: BackendPaymentMethod.CARTAO_CREDITO,
      debit: BackendPaymentMethod.CARTAO_DEBITO,
      pix: BackendPaymentMethod.PIX,
    };
    return map[method];
  }

  private async getTableEntity(id: string, tenantId: string): Promise<RestaurantTable> {
    await this.ensureDefaultTables(tenantId);
    const table = await this.tableRepository.findOne({ where: { id, tenantId } });
    if (!table) throw new NotFoundException('Mesa não encontrada');
    return table;
  }

  private async reloadTable(id: string, tenantId: string): Promise<RestaurantTable> {
    const table = await this.tableRepository.findOne({
      where: { id, tenantId },
      relations: ['currentOrder', 'currentOrder.items', 'currentOrder.payments'],
    });
    if (!table) throw new NotFoundException('Mesa não encontrada');
    return table;
  }

  private mapTable(table: RestaurantTable) {
    const order = table.currentOrder;
    const session = order ? this.mapSession(order) : null;
    let status: MobileTableStatus = 'free';
    if (order) {
      if (order.status === OrderStatus.FECHADO) status = 'closed';
      else if (order.accountClosedAt) status = 'payment_pending';
      else status = 'open';
    }

    return {
      id: table.id,
      number: table.number,
      capacity: table.capacity,
      zone: table.zone,
      status,
      session,
    };
  }

  private mapSession(order: Order) {
    const subtotal = parseFloat(order.subtotal);
    const serviceFee = parseFloat(order.serviceFee);
    const total = parseFloat(order.total);
    const paidAmount = (order.payments ?? []).reduce((s, p) => s + parseFloat(p.amount), 0);
    const remaining = Math.max(0, total - paidAmount);

    return {
      tableId: order.tableId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      openedAt: order.openedAt,
      guestCount: order.guestCount,
      waiterName: order.waiterName,
      serviceFeePercent: null as number | null,
      orderLines: (order.items ?? []).map((i) => this.mapOrderItem(i)),
      payments: (order.payments ?? []).map((p) => ({
        id: p.id,
        method: this.mapPaymentMethodToMobile(p.method),
        amount: parseFloat(p.amount),
        timestamp: p.paidAt,
        pagBank: p.pagbankTransactionId
          ? {
              transactionId: p.pagbankTransactionId,
              transactionCode: p.pagbankTransactionCode,
              hostNsu: p.pagbankHostNsu,
              nsu: p.pagbankNsu,
              autoCode: p.pagbankAutoCode,
              cardBrand: p.pagbankCardBrand,
              pixTxIdCode: p.pagbankPixTxId,
              plugPagPaymentType: p.pagbankPaymentType,
              processedOnTerminal: p.processedOnTerminal,
            }
          : null,
      })),
      subtotal,
      serviceFee,
      total,
      paidAmount,
      remaining,
      isFullyPaid: order.status === OrderStatus.FECHADO,
    };
  }

  private mapOrderItem(item: OrderItem) {
    const kitchenMap: Record<OrderItemKitchenStatus, string> = {
      [OrderItemKitchenStatus.PENDENTE]: 'pending',
      [OrderItemKitchenStatus.ENVIADO_COZINHA]: 'sent_to_kitchen',
      [OrderItemKitchenStatus.ENTREGUE]: 'delivered',
    };
    return {
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      quantity: parseFloat(item.quantity),
      unitPrice: parseFloat(item.unitPrice),
      total: parseFloat(item.total),
      notes: item.notes,
      status: kitchenMap[item.kitchenStatus] ?? 'pending',
    };
  }

  private mapPaymentMethodToMobile(method: BackendPaymentMethod): string {
    const map: Record<BackendPaymentMethod, string> = {
      [BackendPaymentMethod.DINHEIRO]: 'cash',
      [BackendPaymentMethod.PIX]: 'pix',
      [BackendPaymentMethod.CARTAO_DEBITO]: 'debit',
      [BackendPaymentMethod.CARTAO_CREDITO]: 'credit',
      [BackendPaymentMethod.VALE]: 'cash',
    };
    return map[method] ?? 'cash';
  }
}
