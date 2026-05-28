import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { FinanceReportsService } from '../finance/finance-reports.service';
import { FinanceTransaction } from '../finance/entities/finance.entities';
import { Order } from '../pdv/entities/order.entity';
import { OrderItem } from '../pdv/entities/order-item.entity';
import { OrderPayment } from '../pdv/entities/order-payment.entity';
import { OrderStatus, OrderType } from '../pdv/entities/pdv.enums';
import { Product } from '../products/entities/product.entity';
import { StockBalance } from '../stock/entities/stock-balance.entity';
import { StockMinimum } from '../stock/entities/stock-minimum.entity';
import { StockMovement } from '../stock/entities/stock-movement.entity';
import { PeriodQueryDto, LogOnlineAccessDto, UpsertKpiTargetDto } from './dto/analytics-reports.dto';
import { AnalyticsKpiTarget, AnalyticsOnlineAccessLog } from './entities/analytics.entities';

@Injectable()
export class AnalyticsReportsService {
  constructor(
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    @InjectRepository(OrderPayment) private readonly paymentsRepo: Repository<OrderPayment>,
    @InjectRepository(OrderItem) private readonly orderItemsRepo: Repository<OrderItem>,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
    @InjectRepository(StockBalance) private readonly balancesRepo: Repository<StockBalance>,
    @InjectRepository(StockMinimum) private readonly minimumsRepo: Repository<StockMinimum>,
    @InjectRepository(StockMovement) private readonly movementsRepo: Repository<StockMovement>,
    @InjectRepository(FinanceTransaction)
    private readonly financeTxRepo: Repository<FinanceTransaction>,
    @InjectRepository(AnalyticsOnlineAccessLog)
    private readonly accessLogRepo: Repository<AnalyticsOnlineAccessLog>,
    @InjectRepository(AnalyticsKpiTarget)
    private readonly kpiRepo: Repository<AnalyticsKpiTarget>,
    private readonly financeReports: FinanceReportsService,
  ) {}

  private defaultPeriod(query: PeriodQueryDto) {
    const to = query.to ?? new Date().toISOString().slice(0, 10);
    const d = new Date(to);
    d.setDate(d.getDate() - 29);
    const from = query.from ?? d.toISOString().slice(0, 10);
    return { from, to };
  }

  private async sumPayments(tenantId: string, from: string, to: string) {
    const row = await this.paymentsRepo
      .createQueryBuilder('p')
      .innerJoin('p.order', 'o')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('DATE(p.paid_at) BETWEEN :from AND :to', { from, to })
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }

  async getRealtime(tenantId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const openStatuses = [
      OrderStatus.ABERTO,
      OrderStatus.CONFIRMADO,
      OrderStatus.PREPARANDO,
      OrderStatus.PRONTO,
      OrderStatus.EM_ENTREGA,
    ];

    const [openOrders, todayClosed, todayRevenue, byStatus, lastHourPayments] = await Promise.all([
      this.ordersRepo.count({ where: { tenantId, status: In(openStatuses) } }),
      this.ordersRepo.count({
        where: { tenantId, status: OrderStatus.FECHADO, closedAt: Between(new Date(today), new Date(`${today}T23:59:59`)) },
      }),
      this.sumPayments(tenantId, today, today),
      this.ordersRepo
        .createQueryBuilder('o')
        .select('o.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('o.tenant_id = :tenantId', { tenantId })
        .groupBy('o.status')
        .getRawMany<{ status: string; count: string }>(),
      this.paymentsRepo
        .createQueryBuilder('p')
        .innerJoin('p.order', 'o')
        .where('o.tenant_id = :tenantId', { tenantId })
        .andWhere('p.paid_at >= NOW() - INTERVAL \'1 hour\'')
        .select('COALESCE(SUM(p.amount), 0)', 'total')
        .getRawOne<{ total: string }>(),
    ]);

    const last7: { date: string; revenue: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().slice(0, 10);
      const revenue = await this.sumPayments(tenantId, date, date);
      const orders = await this.ordersRepo.count({
        where: {
          tenantId,
          status: OrderStatus.FECHADO,
          closedAt: Between(new Date(date), new Date(`${date}T23:59:59`)),
        },
      });
      last7.push({ date, revenue, orders });
    }

    return {
      asOf: new Date().toISOString(),
      openOrders,
      todayClosed,
      todayRevenue,
      lastHourRevenue: Number(lastHourPayments?.total ?? 0),
      ordersByStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
      last7Days: last7,
    };
  }

  async getIndicators(tenantId: string, query: PeriodQueryDto) {
    const { from, to } = this.defaultPeriod(query);
    const periodDays =
      Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1);
    const prevTo = new Date(from);
    prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - periodDays + 1);
    const prevFromStr = prevFrom.toISOString().slice(0, 10);
    const prevToStr = prevTo.toISOString().slice(0, 10);

    const [revenue, prevRevenue, closedOrders, prevClosed, targets] = await Promise.all([
      this.sumPayments(tenantId, from, to),
      this.sumPayments(tenantId, prevFromStr, prevToStr),
      this.ordersRepo.count({
        where: {
          tenantId,
          status: OrderStatus.FECHADO,
          closedAt: Between(new Date(from), new Date(`${to}T23:59:59`)),
        },
      }),
      this.ordersRepo.count({
        where: {
          tenantId,
          status: OrderStatus.FECHADO,
          closedAt: Between(new Date(prevFromStr), new Date(`${prevToStr}T23:59:59`)),
        },
      }),
      this.kpiRepo.find({ where: { tenantId, active: true } }),
    ]);

    const avgTicket = closedOrders > 0 ? revenue / closedOrders : 0;
    const prevAvgTicket = prevClosed > 0 ? prevRevenue / prevClosed : 0;

    const byType = await this.ordersRepo
      .createQueryBuilder('o')
      .select('o.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(o.total)', 'total')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.status = :st', { st: OrderStatus.FECHADO })
      .andWhere('DATE(o.closed_at) BETWEEN :from AND :to', { from, to })
      .groupBy('o.type')
      .getRawMany<{ type: string; count: string; total: string }>();

    const metrics = [
      {
        key: 'revenue',
        label: 'Faturamento',
        value: revenue,
        previousValue: prevRevenue,
        changePct: prevRevenue ? ((revenue - prevRevenue) / prevRevenue) * 100 : null,
      },
      {
        key: 'orders_closed',
        label: 'Pedidos fechados',
        value: closedOrders,
        previousValue: prevClosed,
        changePct: prevClosed ? ((closedOrders - prevClosed) / prevClosed) * 100 : null,
      },
      {
        key: 'avg_ticket',
        label: 'Ticket médio',
        value: avgTicket,
        previousValue: prevAvgTicket,
        changePct: prevAvgTicket ? ((avgTicket - prevAvgTicket) / prevAvgTicket) * 100 : null,
      },
    ];

    const withTargets = metrics.map((m) => {
      const t = targets.find((x) => x.metricKey === m.key);
      return {
        ...m,
        target: t ? Number(t.targetValue) : null,
        targetLabel: t?.label ?? null,
        progressPct: t && Number(t.targetValue) > 0 ? (m.value / Number(t.targetValue)) * 100 : null,
      };
    });

    return { period: { from, to }, metrics: withTargets, salesByChannel: byType };
  }

  async logOnlineAccess(tenantId: string, dto: LogOnlineAccessDto) {
    return this.accessLogRepo.save(
      this.accessLogRepo.create({
        tenantId,
        channel: dto.channel,
        source: dto.source ?? 'menu',
      }),
    );
  }

  async getOnlineAccess(tenantId: string, query: PeriodQueryDto) {
    const { from, to } = this.defaultPeriod(query);

    const hits = await this.accessLogRepo
      .createQueryBuilder('a')
      .select('a.channel', 'channel')
      .addSelect('COUNT(*)', 'hits')
      .where('a.tenant_id = :tenantId', { tenantId })
      .andWhere('DATE(a.accessed_at) BETWEEN :from AND :to', { from, to })
      .groupBy('a.channel')
      .getRawMany<{ channel: string; hits: string }>();

    const onlineOrders = await this.ordersRepo
      .createQueryBuilder('o')
      .select('o.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(o.total)', 'total')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.type IN (:...types)', { types: [OrderType.ONLINE, OrderType.TABLET] })
      .andWhere('o.status = :st', { st: OrderStatus.FECHADO })
      .andWhere('DATE(o.closed_at) BETWEEN :from AND :to', { from, to })
      .groupBy('o.type')
      .getRawMany();

    const timeline = await this.accessLogRepo
      .createQueryBuilder('a')
      .select("TO_CHAR(a.accessed_at, 'YYYY-MM-DD')", 'day')
      .addSelect('COUNT(*)', 'hits')
      .where('a.tenant_id = :tenantId', { tenantId })
      .andWhere('DATE(a.accessed_at) BETWEEN :from AND :to', { from, to })
      .groupBy("TO_CHAR(a.accessed_at, 'YYYY-MM-DD')")
      .orderBy('day', 'ASC')
      .getRawMany<{ day: string; hits: string }>();

    return {
      period: { from, to },
      accessByChannel: hits.map((h) => ({ channel: h.channel, hits: Number(h.hits) })),
      ordersOnline: onlineOrders,
      timeline: timeline.map((t) => ({ date: t.day, hits: Number(t.hits) })),
    };
  }

  listKpiTargets(tenantId: string) {
    return this.kpiRepo.find({ where: { tenantId }, order: { metricKey: 'ASC' } });
  }

  async upsertKpiTarget(tenantId: string, dto: UpsertKpiTargetDto) {
    let row = await this.kpiRepo.findOne({
      where: { tenantId, metricKey: dto.metricKey },
    });
    if (!row) {
      row = this.kpiRepo.create({ tenantId, metricKey: dto.metricKey, label: dto.label });
    }
    row.label = dto.label;
    row.targetValue = dto.targetValue;
    row.period = dto.period ?? row.period ?? 'monthly';
    if (dto.active !== undefined) row.active = dto.active;
    return this.kpiRepo.save(row);
  }

  async getReportsOverview(tenantId: string, query: PeriodQueryDto) {
    const { from, to } = this.defaultPeriod(query);
    const [sales, stockAlerts, financeDash] = await Promise.all([
      this.getSalesReport(tenantId, query),
      this.getStockReport(tenantId),
      this.financeReports.getFinanceDashboard(tenantId, { from, to }),
    ]);
    return { period: { from, to }, sales: sales.summary, stock: stockAlerts.summary, finance: financeDash };
  }

  async getSalesReport(tenantId: string, query: PeriodQueryDto) {
    const { from, to } = this.defaultPeriod(query);

    const revenue = await this.sumPayments(tenantId, from, to);
    const closedOrders = await this.ordersRepo.count({
      where: {
        tenantId,
        status: OrderStatus.FECHADO,
        closedAt: Between(new Date(from), new Date(`${to}T23:59:59`)),
      },
    });

    const byType = await this.ordersRepo
      .createQueryBuilder('o')
      .select('o.type', 'type')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('SUM(o.total)', 'total')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.status = :st', { st: OrderStatus.FECHADO })
      .andWhere('DATE(o.closed_at) BETWEEN :from AND :to', { from, to })
      .groupBy('o.type')
      .getRawMany();

    const byPayment = await this.paymentsRepo
      .createQueryBuilder('p')
      .innerJoin('p.order', 'o')
      .select('p.method', 'method')
      .addSelect('SUM(p.amount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('DATE(p.paid_at) BETWEEN :from AND :to', { from, to })
      .groupBy('p.method')
      .getRawMany();

    const daily = await this.paymentsRepo
      .createQueryBuilder('p')
      .innerJoin('p.order', 'o')
      .select("TO_CHAR(p.paid_at, 'YYYY-MM-DD')", 'date')
      .addSelect('SUM(p.amount)', 'revenue')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('DATE(p.paid_at) BETWEEN :from AND :to', { from, to })
      .groupBy("TO_CHAR(p.paid_at, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany();

    const topProducts = await this.orderItemsRepo
      .createQueryBuilder('i')
      .innerJoin('i.order', 'o')
      .select('i.product_name', 'name')
      .addSelect('SUM(i.quantity)', 'qty')
      .addSelect('SUM(i.total)', 'total')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.status = :st', { st: OrderStatus.FECHADO })
      .andWhere('DATE(o.closed_at) BETWEEN :from AND :to', { from, to })
      .groupBy('i.product_name')
      .orderBy('total', 'DESC')
      .limit(15)
      .getRawMany();

    return {
      period: { from, to },
      summary: {
        revenue,
        closedOrders,
        avgTicket: closedOrders > 0 ? revenue / closedOrders : 0,
      },
      byType: byType.map((r) => ({
        type: r.type,
        orders: Number(r.orders),
        total: Number(r.total),
      })),
      byPayment: byPayment.map((r) => ({
        method: r.method,
        total: Number(r.total),
        count: Number(r.count),
      })),
      daily: daily.map((r) => ({ date: r.date, revenue: Number(r.revenue) })),
      topProducts: topProducts.map((r) => ({
        name: r.name,
        quantity: Number(r.qty),
        total: Number(r.total),
      })),
    };
  }

  async getStockReport(tenantId: string) {
    const balances = await this.balancesRepo.find({
      where: { tenantId },
      relations: ['product', 'location'],
      order: { updatedAt: 'DESC' },
      take: 200,
    });

    const minimums = await this.minimumsRepo.find({
      where: { tenantId },
      relations: ['product', 'location'],
    });

    const belowMinimum = minimums
      .map((m) => {
        const bal = balances.find(
          (b) => b.productId === m.productId && b.locationId === m.locationId,
        );
        const qty = Number(bal?.quantity ?? 0);
        const min = Number(m.minimumQuantity);
        if (qty < min) {
          return {
            productName: m.product?.name ?? 'Produto',
            locationName: m.location?.name ?? 'Local',
            quantity: qty,
            minimum: min,
          };
        }
        return null;
      })
      .filter(Boolean);

    const recentMovements = await this.movementsRepo.find({
      where: { tenantId },
      relations: ['product', 'location'],
      order: { createdAt: 'DESC' },
      take: 30,
    });

    const totalSkus = await this.productsRepo.count({ where: { tenantId, active: true } });

    return {
      summary: {
        totalSkus,
        locationsWithStock: balances.length,
        belowMinimumCount: belowMinimum.length,
      },
      balances: balances.map((b) => ({
        product: b.product?.name ?? b.productId,
        location: b.location?.name ?? b.locationId,
        quantity: Number(b.quantity),
      })),
      belowMinimum,
      recentMovements: recentMovements.map((m) => ({
        type: m.type,
        product: m.product?.name,
        location: m.location?.name,
        quantity: Number(m.quantity),
        createdAt: m.createdAt,
      })),
    };
  }

  getFinanceReport(tenantId: string, query: PeriodQueryDto) {
    return this.financeReports.getFinanceDashboard(tenantId, this.defaultPeriod(query));
  }

  async seedDefaultKpiTargets(tenantId: string) {
    const defaults: UpsertKpiTargetDto[] = [
      { metricKey: 'revenue', label: 'Meta de faturamento', targetValue: 50000, period: 'monthly' },
      { metricKey: 'orders_closed', label: 'Meta de pedidos', targetValue: 800, period: 'monthly' },
      { metricKey: 'avg_ticket', label: 'Ticket médio alvo', targetValue: 65, period: 'monthly' },
    ];
    for (const d of defaults) {
      const exists = await this.kpiRepo.findOne({
        where: { tenantId, metricKey: d.metricKey },
      });
      if (!exists) await this.upsertKpiTarget(tenantId, d);
    }
    return this.listKpiTargets(tenantId);
  }
}
