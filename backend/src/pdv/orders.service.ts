import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { RestaurantTable } from '../mobile/entities/restaurant-table.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderPayment } from './entities/order-payment.entity';
import { OrderLog } from './entities/order-log.entity';
import { BillSplit } from './entities/bill-split.entity';
import { Comanda } from './entities/comanda.entity';
import { Product } from '../products/entities/product.entity';
import { PdvSettings } from './entities/pdv-settings.entity';
import { OrderItemKitchenStatus } from './entities/order-item-kitchen.enums';
import { ComandaStatus, OrderStatus, OrderType, PaymentMethod } from './entities/pdv.enums';
import {
  AddOrderItemDto,
  CloseOrderDto,
  CreateOrderDto,
  AddOrderPaymentDto,
  SetBillSplitsDto,
  UpdateOrderDetailsDto,
  UpdateOrderFeesDto,
  UpdateOrderItemDto,
  UpdateOrderStatusDto,
} from './dto/pdv.dto';
import { CrmCampaignPricingService } from '../crm/crm-campaign-pricing.service';

const DEFAULT_RESTAURANT_TABLES: { number: number; capacity: number; zone: string }[] = [
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

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly itemRepository: Repository<OrderItem>,
    @InjectRepository(OrderLog)
    private readonly logRepository: Repository<OrderLog>,
    @InjectRepository(Comanda)
    private readonly comandaRepository: Repository<Comanda>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(PdvSettings)
    private readonly settingsRepository: Repository<PdvSettings>,
    @InjectRepository(RestaurantTable)
    private readonly tableRepository: Repository<RestaurantTable>,
    private readonly campaignPricing: CrmCampaignPricingService,
  ) {}

  async findAll(
    tenantId: string,
    filters?: {
      type?: OrderType;
      status?: OrderStatus;
      openOnly?: boolean;
      limit?: number;
    },
  ): Promise<Order[]> {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.comanda', 'comanda')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.openedByUser', 'openedByUser')
      .where('order.tenantId = :tenantId', { tenantId })
      .orderBy('order.createdAt', 'DESC')
      .take(filters?.limit ?? 100);

    if (filters?.type) qb.andWhere('order.type = :type', { type: filters.type });
    if (filters?.status) qb.andWhere('order.status = :status', { status: filters.status });
    if (filters?.openOnly) {
      qb.andWhere('order.status NOT IN (:...closed)', {
        closed: [OrderStatus.FECHADO, OrderStatus.CANCELADO],
      });
    }
    return qb.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id, tenantId },
      relations: [
        'items',
        'items.product',
        'comanda',
        'customer',
        'payments',
        'billSplits',
        'openedByUser',
        'closedByUser',
      ],
      order: { items: { sortOrder: 'ASC' } },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (this.orderItemsHaveDuplicateProducts(order.items)) {
      await this.consolidateDuplicateOrderItems(order.id);
      return this.findOne(id, tenantId);
    }
    return order;
  }

  async create(dto: CreateOrderDto, tenantId: string, userId: string): Promise<Order> {
    const orderNumber = await this.nextOrderNumber(tenantId);
    const settings = await this.getOrCreateSettings(tenantId);

    let comanda: Comanda | null = null;
    if (dto.comandaId) {
      comanda = await this.comandaRepository.findOne({
        where: { id: dto.comandaId, tenantId },
      });
      if (!comanda) throw new NotFoundException('Comanda não encontrada');
      if (comanda.status === ComandaStatus.OCUPADA && comanda.currentOrderId) {
        throw new BadRequestException('Comanda já possui pedido aberto');
      }
    }

    const serviceFeeAuto = Boolean(
      dto.applyServiceFee && dto.type !== OrderType.DELIVERY,
    );

    let orderId: string;

    await this.dataSource.transaction(async (manager) => {
      const order = await manager.save(
        manager.create(Order, {
          tenantId,
          orderNumber,
          type: dto.type,
          status: OrderStatus.ABERTO,
          comandaId: dto.comandaId ?? null,
          customerId: dto.customerId ?? null,
          tableLabel: dto.tableLabel ?? comanda?.label ?? null,
          tableId: dto.tableId ?? null,
          guestCount: dto.guestCount ?? null,
          waiterName: dto.waiterName?.trim() ?? null,
          subtotal: '0',
          discount: '0',
          serviceFee: '0.00',
          serviceFeeAuto,
          deliveryFee: (dto.deliveryFee ?? 0).toFixed(2),
          total: (dto.deliveryFee ?? 0).toFixed(2),
          notes: dto.notes?.trim() ?? null,
          deliveryAddress: dto.deliveryAddress?.trim() ?? null,
          deliveryLat: dto.deliveryLat != null ? String(dto.deliveryLat) : null,
          deliveryLng: dto.deliveryLng != null ? String(dto.deliveryLng) : null,
          openedByUserId: userId,
        }),
      );

      orderId = order.id;

      if (comanda) {
        comanda.status = ComandaStatus.OCUPADA;
        comanda.currentOrderId = order.id;
        await manager.save(comanda);
      }

      await this.occupyRestaurantTable(tenantId, order, manager);
    });

    await this.log(tenantId, orderId!, 'pedido_criado', `Pedido #${orderNumber} aberto`, userId);
    return this.findOne(orderId!, tenantId);
  }

  async updateDetails(
    id: string,
    tenantId: string,
    dto: UpdateOrderDetailsDto,
    userId: string,
  ): Promise<Order> {
    const order = await this.findOne(id, tenantId);
    this.ensureEditable(order);

    const changes: string[] = [];

    if (dto.customerId !== undefined) {
      order.customerId = dto.customerId || null;
      changes.push(dto.customerId ? 'cliente alterado' : 'cliente removido');
    }
    if (dto.tableLabel !== undefined) {
      order.tableLabel = dto.tableLabel || null;
      changes.push(`mesa: ${dto.tableLabel || 'removida'}`);
    }
    if (dto.tableId !== undefined) {
      const oldTableId = order.tableId;
      order.tableId = dto.tableId || null;

      if (oldTableId && oldTableId !== dto.tableId) {
        await this.tableRepository.update(oldTableId, { currentOrderId: null });
      }
      if (dto.tableId) {
        await this.occupyRestaurantTable(tenantId, order);
      }
    }
    if (dto.notes !== undefined) {
      order.notes = dto.notes || null;
      changes.push('observações atualizadas');
    }
    if (dto.deliveryAddress !== undefined) {
      order.deliveryAddress = dto.deliveryAddress || null;
      changes.push('endereço atualizado');
    }

    await this.orderRepository.save(order);
    if (changes.length) {
      await this.log(tenantId, id, 'detalhes_alterados', changes.join(', '), userId);
    }
    return this.findOne(id, tenantId);
  }

  async updateStatus(
    id: string,
    tenantId: string,
    dto: UpdateOrderStatusDto,
    userId: string,
  ): Promise<Order> {
    const order = await this.findOne(id, tenantId);
    if (order.status === OrderStatus.FECHADO) {
      throw new BadRequestException('Pedido já fechado');
    }
    order.status = dto.status;
    await this.orderRepository.save(order);
    await this.log(tenantId, id, 'status_alterado', `Status: ${dto.status}`, userId);
    return this.findOne(id, tenantId);
  }

  async addItem(
    id: string,
    tenantId: string,
    dto: AddOrderItemDto,
    userId: string,
  ): Promise<Order> {
    const order = await this.findOne(id, tenantId);
    this.ensureEditable(order);

    const product = await this.productRepository.findOne({
      where: { id: dto.productId, tenantId, active: true },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');

    const qty = dto.quantity;
    const priced = await this.campaignPricing.resolveUnitPrice(tenantId, product.id);
    const unitPrice = priced.unitPrice;
    const notes = dto.notes?.trim() ?? null;

    const existing = (order.items ?? []).find((i) => i.productId === product.id);
    if (existing) {
      const newQty = parseFloat(existing.quantity) + qty;
      const lineUnit = parseFloat(existing.unitPrice);
      existing.quantity = newQty.toFixed(4);
      existing.total = (newQty * lineUnit).toFixed(2);
      if (notes && !existing.notes?.trim()) {
        existing.notes = notes;
      }
      await this.itemRepository.save(existing);
    } else {
      const count = order.items?.length ?? 0;
      await this.itemRepository.save(
        this.itemRepository.create({
          orderId: order.id,
          productId: product.id,
          productName: product.name,
          quantity: qty.toFixed(4),
          unitPrice: unitPrice.toFixed(2),
          total: (qty * unitPrice).toFixed(2),
          notes,
          sortOrder: count,
        }),
      );
    }

    await this.recalculateTotals(order.id, tenantId);
    await this.log(
      tenantId,
      id,
      'item_adicionado',
      `${product.name} x${qty}`,
      userId,
    );
    return this.findOne(id, tenantId);
  }

  async updateItem(
    orderId: string,
    itemId: string,
    tenantId: string,
    dto: UpdateOrderItemDto,
    userId: string,
  ): Promise<Order> {
    const order = await this.findOne(orderId, tenantId);
    this.ensureEditable(order);

    const item = await this.itemRepository.findOne({ where: { id: itemId, orderId } });
    if (!item) throw new NotFoundException('Item não encontrado');

    if (dto.quantity !== undefined) {
      const unitPrice = parseFloat(item.unitPrice);
      item.quantity = dto.quantity.toFixed(4);
      item.total = (dto.quantity * unitPrice).toFixed(2);
    }
    if (dto.notes !== undefined) item.notes = dto.notes?.trim() ?? null;
    await this.itemRepository.save(item);
    await this.recalculateTotals(orderId, tenantId);
    await this.log(tenantId, orderId, 'item_atualizado', item.productName, userId);
    return this.findOne(orderId, tenantId);
  }

  async removeItem(
    orderId: string,
    itemId: string,
    tenantId: string,
    userId: string,
  ): Promise<Order> {
    const order = await this.findOne(orderId, tenantId);
    this.ensureEditable(order);
    const item = await this.itemRepository.findOne({ where: { id: itemId, orderId } });
    if (!item) throw new NotFoundException('Item não encontrado');
    await this.itemRepository.remove(item);
    await this.recalculateTotals(orderId, tenantId);
    await this.log(tenantId, orderId, 'item_removido', item.productName, userId);
    return this.findOne(orderId, tenantId);
  }

  async updateFees(
    id: string,
    tenantId: string,
    dto: UpdateOrderFeesDto,
    userId: string,
  ): Promise<Order> {
    const order = await this.findOne(id, tenantId);
    this.ensureEditable(order);
    if (dto.discount !== undefined) order.discount = dto.discount.toFixed(2);
    if (dto.serviceFee !== undefined) {
      order.serviceFee = dto.serviceFee.toFixed(2);
      order.serviceFeeAuto = false;
    }
    if (dto.deliveryFee !== undefined) order.deliveryFee = dto.deliveryFee.toFixed(2);
    await this.orderRepository.save(order);
    await this.recalculateTotals(id, tenantId, false);
    await this.log(tenantId, id, 'taxas_atualizadas', 'Taxas/descontos atualizados', userId);
    return this.findOne(id, tenantId);
  }

  async applyDefaultServiceFee(id: string, tenantId: string, userId: string): Promise<Order> {
    const order = await this.findOne(id, tenantId);
    this.ensureEditable(order);
    const settings = await this.getOrCreateSettings(tenantId);
    const subtotal = parseFloat(order.subtotal);
    const fee = subtotal * (parseFloat(settings.defaultServiceFeePercent) / 100);
    order.serviceFee = fee.toFixed(2);
    order.serviceFeeAuto = true;
    await this.orderRepository.save(order);
    await this.recalculateTotals(id, tenantId, false);
    await this.log(tenantId, id, 'taxa_servico', `Taxa ${settings.defaultServiceFeePercent}%`, userId);
    return this.findOne(id, tenantId);
  }

  async setBillSplits(
    id: string,
    tenantId: string,
    dto: SetBillSplitsDto,
    userId: string,
  ): Promise<Order> {
    const order = await this.findOne(id, tenantId);
    const total = parseFloat(order.total);
    const splitSum = dto.splits.reduce((s, x) => s + x.amount, 0);
    if (Math.abs(splitSum - total) > 0.05) {
      throw new BadRequestException(
        `Soma das divisões (R$ ${splitSum.toFixed(2)}) deve igualar o total (R$ ${total.toFixed(2)})`,
      );
    }

    await this.dataSource.getRepository(BillSplit).delete({ orderId: id });
    await this.dataSource.getRepository(BillSplit).save(
      dto.splits.map((s) =>
        this.dataSource.getRepository(BillSplit).create({
          orderId: id,
          label: s.label.trim(),
          amount: s.amount.toFixed(2),
          paid: false,
        }),
      ),
    );
    await this.log(tenantId, id, 'divisao_conta', `${dto.splits.length} parte(s)`, userId);
    return this.findOne(id, tenantId);
  }

  async addPayment(
    id: string,
    tenantId: string,
    dto: AddOrderPaymentDto,
    userId: string,
  ): Promise<Order> {
    const order = await this.findOne(id, tenantId);
    if ([OrderStatus.FECHADO, OrderStatus.CANCELADO].includes(order.status)) {
      throw new BadRequestException('Pedido já encerrado');
    }
    if (!order.items?.length) {
      throw new BadRequestException('Pedido sem itens');
    }

    await this.dataSource.getRepository(OrderPayment).save(
      this.dataSource.getRepository(OrderPayment).create({
        orderId: id,
        method: dto.method,
        amount: dto.amount.toFixed(2),
        createdByUserId: userId,
        pagbankTransactionId: dto.pagBank?.transactionId ?? null,
        pagbankTransactionCode: dto.pagBank?.transactionCode ?? null,
        pagbankNsu: dto.pagBank?.nsu ?? null,
        pagbankHostNsu: dto.pagBank?.hostNsu ?? null,
        pagbankAutoCode: dto.pagBank?.autoCode ?? null,
        pagbankCardBrand: dto.pagBank?.cardBrand ?? null,
        pagbankPixTxId: dto.pagBank?.pixTxIdCode ?? null,
        pagbankPaymentType: dto.pagBank?.plugPagPaymentType ?? null,
        processedOnTerminal: dto.pagBank?.processedOnTerminal ?? false,
      }),
    );

    const refreshed = await this.findOne(id, tenantId);
    const paid = (refreshed.payments ?? []).reduce((s, p) => s + parseFloat(p.amount), 0);
    const total = parseFloat(refreshed.total);

    await this.log(
      tenantId,
      id,
      'pagamento_registrado',
      `${dto.method} R$ ${dto.amount.toFixed(2)}`,
      userId,
    );

    if (
      paid >= total - 0.05 &&
      refreshed.accountClosedAt &&
      refreshed.status !== OrderStatus.FECHADO
    ) {
      const payments = (refreshed.payments ?? []).map((p) => ({
        method: p.method,
        amount: parseFloat(p.amount),
      }));
      return this.closeOrder(id, tenantId, { payments }, userId);
    }

    return this.findOne(id, tenantId);
  }

  /**
   * Registra pagamento no PDV após confirmação PagBank (webhook ou refresh).
   * Idempotente: ignora se já existir pagamento com o mesmo id PagBank.
   */
  async registerPagbankApiPayment(
    orderId: string,
    tenantId: string,
    meta: {
      localTransactionId: string;
      pagbankOrderId: string | null;
      chargeId: string | null;
      amountCents: number;
      paymentMethodType: string | null;
      pixTxId?: string | null;
    },
  ): Promise<{ registered: boolean; order: Order }> {
    const order = await this.findOne(orderId, tenantId);
    if ([OrderStatus.FECHADO, OrderStatus.CANCELADO].includes(order.status)) {
      return { registered: false, order };
    }
    if (!order.items?.length) {
      return { registered: false, order };
    }

    const total = parseFloat(order.total);
    const paid = (order.payments ?? []).reduce((s, p) => s + parseFloat(p.amount), 0);
    const remaining = total - paid;
    if (remaining < 0.01) {
      return { registered: false, order };
    }

    const amount = Math.min(remaining, meta.amountCents / 100);
    const method = this.mapPagbankMethodToPdv(meta.paymentMethodType);

    const paymentRepo = this.dataSource.getRepository(OrderPayment);
    await paymentRepo.save(
      paymentRepo.create({
        orderId,
        method,
        amount: amount.toFixed(2),
        createdByUserId: null,
        pagbankTransactionId: meta.pagbankOrderId ?? meta.localTransactionId,
        pagbankTransactionCode: meta.chargeId,
        pagbankPixTxId: meta.pixTxId ?? null,
        processedOnTerminal: false,
      }),
    );

    const refreshed = await this.findOne(orderId, tenantId);
    const paidAfter = (refreshed.payments ?? []).reduce((s, p) => s + parseFloat(p.amount), 0);
    if (
      paidAfter >= total - 0.05 &&
      refreshed.accountClosedAt &&
      refreshed.status !== OrderStatus.FECHADO &&
      refreshed.openedByUserId
    ) {
      const payments = (refreshed.payments ?? []).map((p) => ({
        method: p.method,
        amount: parseFloat(p.amount),
      }));
      return {
        registered: true,
        order: await this.closeOrder(
          orderId,
          tenantId,
          { payments },
          refreshed.openedByUserId,
        ),
      };
    }

    await this.log(
      tenantId,
      orderId,
      'pagamento_pagbank_api',
      `${method} R$ ${amount.toFixed(2)} (API PagBank)`,
      null,
    );

    return { registered: true, order: await this.findOne(orderId, tenantId) };
  }

  private mapPagbankMethodToPdv(pagbankType: string | null): PaymentMethod {
    const t = (pagbankType ?? 'PIX').toUpperCase();
    if (t === 'CREDIT_CARD') return PaymentMethod.CARTAO_CREDITO;
    if (t === 'DEBIT_CARD') return PaymentMethod.CARTAO_DEBITO;
    if (t === 'BOLETO') return PaymentMethod.PIX;
    return PaymentMethod.PIX;
  }

  /** Encerra a conta para pagamento (mesa): bloqueia novos itens, mantém pedido aberto até quitar. */
  async closeTableAccount(id: string, tenantId: string, userId: string): Promise<Order> {
    const order = await this.findOne(id, tenantId);
    if (order.status === OrderStatus.FECHADO) {
      throw new BadRequestException('Pedido já fechado');
    }
    if (!order.items?.length) {
      throw new BadRequestException('Pedido sem itens');
    }
    if (!order.accountClosedAt) {
      order.accountClosedAt = new Date();
      await this.orderRepository.save(order);
    }
    await this.log(
      tenantId,
      id,
      'conta_encerrada',
      'Conta encerrada — aguardando pagamento',
      userId,
    );
    return this.findOne(id, tenantId);
  }

  async sendItemsToKitchen(
    id: string,
    tenantId: string,
    userId: string,
  ): Promise<number> {
    const order = await this.findOne(id, tenantId);
    this.ensureEditable(order);

    const sentAt = new Date();
    const sent = await this.itemRepository.update(
      { orderId: id, kitchenStatus: OrderItemKitchenStatus.PENDENTE },
      {
        kitchenStatus: OrderItemKitchenStatus.ENVIADO_COZINHA,
        kitchenSentAt: sentAt,
      },
    );

    const sentCount = sent.affected ?? 0;

    if (sentCount > 0) {
      if (
        order.status === OrderStatus.ABERTO ||
        order.status === OrderStatus.CONFIRMADO ||
        order.status === OrderStatus.PRONTO
      ) {
        order.status = OrderStatus.PREPARANDO;
        await this.orderRepository.save(order);
      }
      await this.log(tenantId, id, 'enviado_cozinha', 'Itens enviados à cozinha', userId);
    }

    return sentCount;
  }

  async closeOrder(
    id: string,
    tenantId: string,
    dto: CloseOrderDto,
    userId: string,
  ): Promise<Order> {
    const order = await this.findOne(id, tenantId);
    if (order.status === OrderStatus.FECHADO) {
      throw new BadRequestException('Pedido já fechado');
    }
    if (!order.items?.length) {
      throw new BadRequestException('Pedido sem itens');
    }

    const total = parseFloat(order.total);
    const paid = dto.payments.reduce((s, p) => s + p.amount, 0);
    if (Math.abs(paid - total) > 0.05) {
      throw new BadRequestException(
        `Pagamentos (R$ ${paid.toFixed(2)}) devem igualar o total (R$ ${total.toFixed(2)})`,
      );
    }

    const closedAt = new Date();
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(OrderPayment, { orderId: id });
      for (const p of dto.payments) {
        await manager.save(
          manager.create(OrderPayment, {
            orderId: id,
            method: p.method,
            amount: p.amount.toFixed(2),
            createdByUserId: userId,
          }),
        );
      }
      await manager.update(
        Order,
        { id, tenantId },
        {
          status: OrderStatus.FECHADO,
          closedAt,
          closedByUserId: userId,
        },
      );

      if (order.comandaId) {
        const comanda = await manager.findOne(Comanda, { where: { id: order.comandaId } });
        if (comanda) {
          comanda.status = ComandaStatus.LIVRE;
          comanda.currentOrderId = null;
          await manager.save(comanda);
        }
      }

      await this.releaseRestaurantTableForOrder(tenantId, order, manager);
    });

    const tableNote = order.tableLabel?.trim()
      ? ` — mesa liberada (${order.tableLabel.trim()})`
      : order.tableId
        ? ' — mesa liberada'
        : '';
    await this.log(
      tenantId,
      id,
      'pedido_fechado',
      `Total R$ ${total.toFixed(2)}${tableNote}`,
      userId,
    );
    return this.findOne(id, tenantId);
  }

  async cancelOrder(id: string, tenantId: string, userId: string): Promise<Order> {
    const order = await this.findOne(id, tenantId);
    if (order.status === OrderStatus.FECHADO) {
      throw new BadRequestException('Não é possível cancelar pedido fechado');
    }
    order.status = OrderStatus.CANCELADO;
    await this.orderRepository.save(order);
    if (order.comandaId) {
      const comanda = await this.comandaRepository.findOne({ where: { id: order.comandaId } });
      if (comanda) {
        comanda.status = ComandaStatus.LIVRE;
        comanda.currentOrderId = null;
        await this.comandaRepository.save(comanda);
      }
    }
    await this.releaseRestaurantTableForOrder(tenantId, order);
    await this.log(tenantId, id, 'pedido_cancelado', 'Pedido cancelado', userId);
    return this.findOne(id, tenantId);
  }

  private async recalculateTotals(
    orderId: string,
    tenantId: string,
    recalcServiceFromSettings = true,
  ): Promise<void> {
    const order = await this.findOne(orderId, tenantId);
    const items = order.items ?? [];
    const subtotal = items.reduce((s, i) => s + parseFloat(i.total), 0);
    order.subtotal = subtotal.toFixed(2);

    if (recalcServiceFromSettings && order.serviceFeeAuto && order.type !== OrderType.DELIVERY) {
      const settings = await this.getOrCreateSettings(tenantId);
      const pct = parseFloat(settings.defaultServiceFeePercent) / 100;
      order.serviceFee =
        subtotal > 0 ? (subtotal * pct).toFixed(2) : '0.00';
    }

    const total =
      subtotal -
      parseFloat(order.discount) +
      parseFloat(order.serviceFee) +
      parseFloat(order.deliveryFee);
    order.total = Math.max(0, total).toFixed(2);
    await this.orderRepository.save(order);
  }

  private async nextOrderNumber(tenantId: string): Promise<number> {
    const last = await this.orderRepository
      .createQueryBuilder('o')
      .select('MAX(o.orderNumber)', 'max')
      .where('o.tenantId = :tenantId', { tenantId })
      .getRawOne<{ max: string | null }>();
    return (last?.max ? parseInt(last.max, 10) : 0) + 1;
  }

  private async getOrCreateSettings(tenantId: string): Promise<PdvSettings> {
    let settings = await this.settingsRepository.findOne({ where: { tenantId } });
    if (!settings) {
      settings = await this.settingsRepository.save(
        this.settingsRepository.create({ tenantId }),
      );
    }
    return settings;
  }

  private parseTableNumberFromLabel(label: string): number | null {
    const digits = label.replace(/\D/g, '');
    if (!digits) return null;
    const n = parseInt(digits, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private async ensureDefaultRestaurantTables(tenantId: string): Promise<void> {
    const count = await this.tableRepository.count({ where: { tenantId } });
    if (count > 0) return;
    await this.tableRepository.save(
      DEFAULT_RESTAURANT_TABLES.map((t) =>
        this.tableRepository.create({ tenantId, ...t }),
      ),
    );
  }

  /** Vincula pedido à mesa cadastrada (número em tableLabel ou tableId). */
  private async occupyRestaurantTable(
    tenantId: string,
    order: Order,
    manager?: EntityManager,
  ): Promise<void> {
    await this.ensureDefaultRestaurantTables(tenantId);

    const tableRepo = manager
      ? manager.getRepository(RestaurantTable)
      : this.tableRepository;
    const orderRepo = manager
      ? manager.getRepository(Order)
      : this.orderRepository;

    let table: RestaurantTable | null = null;

    if (order.tableId) {
      table = await tableRepo.findOne({ where: { id: order.tableId, tenantId } });
      if (!table) {
        this.logger.warn(`occupyRestaurantTable: table not found for id=${order.tableId}, tenant=${tenantId}`);
      }
    } else if (order.tableLabel?.trim()) {
      const num = this.parseTableNumberFromLabel(order.tableLabel);
      if (num != null) {
        table = await tableRepo.findOne({
          where: { tenantId, number: num, active: true },
        });
        if (table) {
          await orderRepo.update(
            { id: order.id, tenantId },
            { tableId: table.id },
          );
          order.tableId = table.id;
        }
      }
    }

    if (!table) return;

    if (table.currentOrderId && table.currentOrderId !== order.id) {
      throw new BadRequestException(
        `Mesa ${table.number} já possui pedido em aberto`,
      );
    }

    table.currentOrderId = order.id;
    await tableRepo.save(table);

    if (!order.tableLabel) {
      order.tableLabel = `Mesa ${table.number}`;
      await orderRepo.update(
        { id: order.id, tenantId },
        { tableLabel: order.tableLabel },
      );
    }

    this.logger.log(`Mesa ${table.number} vinculada ao pedido ${order.id}`);
  }

  /** Libera mesa(s) vinculadas ao pedido encerrado (Painel geral / PDV). */
  async releaseRestaurantTableForOrder(
    tenantId: string,
    order: Order,
    manager?: EntityManager,
  ): Promise<boolean> {
    const repo = manager
      ? manager.getRepository(RestaurantTable)
      : this.tableRepository;

    const candidates = await repo.find({
      where: { tenantId, currentOrderId: order.id },
    });

    if (order.tableId) {
      const linked = await repo.findOne({ where: { id: order.tableId, tenantId } });
      if (linked && !candidates.some((t) => t.id === linked.id)) {
        candidates.push(linked);
      }
    }

    if (order.tableLabel?.trim()) {
      const num = this.parseTableNumberFromLabel(order.tableLabel);
      if (num != null) {
        const byNumber = await repo.findOne({ where: { tenantId, number: num } });
        if (byNumber && !candidates.some((t) => t.id === byNumber.id)) {
          candidates.push(byNumber);
        }
      }
    }

    let freed = false;
    for (const table of candidates) {
      if (table.currentOrderId === order.id) {
        table.currentOrderId = null;
        await repo.save(table);
        freed = true;
      }
    }

    return freed;
  }

  private orderItemsHaveDuplicateProducts(items: OrderItem[] | undefined): boolean {
    const seen = new Set<string>();
    for (const item of items ?? []) {
      if (seen.has(item.productId)) return true;
      seen.add(item.productId);
    }
    return false;
  }

  /** Une linhas do mesmo produto (legado ou cliques repetidos antes do merge). */
  private async consolidateDuplicateOrderItems(orderId: string): Promise<void> {
    const items = await this.itemRepository.find({
      where: { orderId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    const groups = new Map<string, OrderItem[]>();
    for (const item of items) {
      const list = groups.get(item.productId) ?? [];
      list.push(item);
      groups.set(item.productId, list);
    }
    for (const group of groups.values()) {
      if (group.length <= 1) continue;
      const [primary, ...duplicates] = group;
      let qty = 0;
      let lineTotal = 0;
      for (const row of group) {
        qty += parseFloat(row.quantity);
        lineTotal += parseFloat(row.total);
      }
      primary.quantity = qty.toFixed(4);
      primary.total = lineTotal.toFixed(2);
      await this.itemRepository.save(primary);
      if (duplicates.length > 0) {
        await this.itemRepository.remove(duplicates);
      }
    }
  }

  private ensureEditable(order: Order): void {
    if (order.accountClosedAt) {
      throw new BadRequestException(
        'Conta já encerrada — não é possível alterar itens',
      );
    }
    if ([OrderStatus.FECHADO, OrderStatus.CANCELADO].includes(order.status)) {
      throw new BadRequestException('Pedido não pode ser alterado');
    }
  }

  async logKitchenItemReady(
    orderId: string,
    tenantId: string,
    productName: string,
    userId: string,
  ): Promise<void> {
    await this.log(
      tenantId,
      orderId,
      'item_pronto_cozinha',
      `${productName} marcado como pronto na cozinha`,
      userId,
    );
  }

  /** Marca o pedido como pronto quando a cozinha libera um item. */
  async syncOrderStatusAfterKitchenReady(
    orderId: string,
    tenantId: string,
  ): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, tenantId },
    });
    if (!order || order.status !== OrderStatus.PREPARANDO) {
      return;
    }
    order.status = OrderStatus.PRONTO;
    await this.orderRepository.save(order);
  }

  private async log(
    tenantId: string,
    orderId: string,
    action: string,
    message: string,
    userId: string | null,
  ): Promise<void> {
    await this.logRepository.save(
      this.logRepository.create({
        tenantId,
        orderId,
        action,
        message,
        createdByUserId: userId,
      }),
    );
  }
}
