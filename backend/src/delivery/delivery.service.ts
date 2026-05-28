import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Not, Repository } from 'typeorm';
import { Order } from '../pdv/entities/order.entity';
import { OrderStatus, OrderType } from '../pdv/entities/pdv.enums';
import {
  AssignDeliveryDto,
  CreateCourierDto,
  CreateRouteDto,
  DeliveryOrdersQueryDto,
  UpdateAssignmentStatusDto,
  UpdateCourierDto,
  UpdateRouteDto,
} from './dto/delivery.dto';
import {
  DeliveryAssignment,
  DeliveryAssignmentStatus,
  DeliveryCourier,
  DeliveryCourierStatus,
  DeliveryRoute,
} from './entities/delivery.entities';

const OPEN_ORDER_STATUSES = [
  OrderStatus.CONFIRMADO,
  OrderStatus.PREPARANDO,
  OrderStatus.PRONTO,
  OrderStatus.EM_ENTREGA,
];

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(DeliveryCourier) private readonly couriersRepo: Repository<DeliveryCourier>,
    @InjectRepository(DeliveryRoute) private readonly routesRepo: Repository<DeliveryRoute>,
    @InjectRepository(DeliveryAssignment)
    private readonly assignmentsRepo: Repository<DeliveryAssignment>,
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
  ) {}

  // —— Motoboys ——
  listCouriers(tenantId: string) {
    return this.couriersRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  createCourier(tenantId: string, dto: CreateCourierDto) {
    return this.couriersRepo.save(
      this.couriersRepo.create({ tenantId, ...dto }),
    );
  }

  async updateCourier(tenantId: string, id: string, dto: UpdateCourierDto) {
    const row = await this.couriersRepo.findOne({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Motoboy não encontrado');
    Object.assign(row, dto);
    return this.couriersRepo.save(row);
  }

  async deleteCourier(tenantId: string, id: string) {
    const row = await this.couriersRepo.findOne({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Motoboy não encontrado');
    await this.couriersRepo.remove(row);
    return { ok: true };
  }

  // —— Rotas ——
  listRoutes(tenantId: string) {
    return this.routesRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  createRoute(tenantId: string, dto: CreateRouteDto) {
    return this.routesRepo.save(this.routesRepo.create({ tenantId, ...dto }));
  }

  async updateRoute(tenantId: string, id: string, dto: UpdateRouteDto) {
    const row = await this.routesRepo.findOne({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Rota não encontrada');
    Object.assign(row, dto);
    return this.routesRepo.save(row);
  }

  async deleteRoute(tenantId: string, id: string) {
    const row = await this.routesRepo.findOne({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Rota não encontrada');
    await this.routesRepo.remove(row);
    return { ok: true };
  }

  private async ensureAssignment(tenantId: string, order: Order) {
    let assignment = await this.assignmentsRepo.findOne({
      where: { orderId: order.id },
      relations: ['courier', 'route'],
    });
    if (!assignment) {
      assignment = await this.assignmentsRepo.save(
        this.assignmentsRepo.create({
          tenantId,
          orderId: order.id,
          status: DeliveryAssignmentStatus.PENDING,
        }),
      );
      assignment = await this.assignmentsRepo.findOne({
        where: { id: assignment.id },
        relations: ['courier', 'route'],
      });
    }
    return assignment!;
  }

  private async attachAssignments(orders: Order[]) {
    if (!orders.length) return orders;
    const assignments = await this.assignmentsRepo.find({
      where: { orderId: In(orders.map((o) => o.id)) },
      relations: ['courier', 'route'],
    });
    const byOrder = new Map(assignments.map((a) => [a.orderId, a]));
    for (const order of orders) {
      (order as Order & { deliveryAssignment?: DeliveryAssignment | null }).deliveryAssignment =
        byOrder.get(order.id) ?? null;
    }
    return orders;
  }

  async listDeliveryOrders(tenantId: string, query: DeliveryOrdersQueryDto) {
    const where: FindOptionsWhere<Order> = {
      tenantId,
      type: OrderType.DELIVERY,
    };
    if (query.openOnly === 'true') {
      where.status = In(OPEN_ORDER_STATUSES);
    } else {
      where.status = Not(OrderStatus.CANCELADO);
    }

    const orders = await this.ordersRepo.find({
      where,
      order: { openedAt: 'DESC' },
      take: 100,
    });

    for (const order of orders) {
      await this.ensureAssignment(tenantId, order);
    }

    const refreshed = await this.ordersRepo.find({
      where,
      order: { openedAt: 'DESC' },
      take: 100,
    });

    await this.attachAssignments(refreshed);

    if (query.assignmentStatus) {
      return refreshed.filter(
        (o) =>
          (o as Order & { deliveryAssignment?: DeliveryAssignment }).deliveryAssignment
            ?.status === query.assignmentStatus,
      );
    }
    return refreshed;
  }

  async assignCourier(tenantId: string, orderId: string, dto: AssignDeliveryDto) {
    const order = await this.ordersRepo.findOne({
      where: { id: orderId, tenantId, type: OrderType.DELIVERY },
    });
    if (!order) throw new NotFoundException('Pedido delivery não encontrado');

    const courier = await this.couriersRepo.findOne({
      where: { id: dto.courierId, tenantId, active: true },
    });
    if (!courier) throw new NotFoundException('Motoboy não encontrado');

    if (dto.routeId) {
      const route = await this.routesRepo.findOne({
        where: { id: dto.routeId, tenantId },
      });
      if (!route) throw new NotFoundException('Rota não encontrada');
    }

    const assignment = await this.ensureAssignment(tenantId, order);
    assignment.courierId = dto.courierId;
    assignment.routeId = dto.routeId ?? null;
    assignment.status = DeliveryAssignmentStatus.ASSIGNED;
    assignment.assignedAt = new Date();
    assignment.notes = dto.notes ?? assignment.notes;
    await this.assignmentsRepo.save(assignment);

    courier.status = DeliveryCourierStatus.BUSY;
    await this.couriersRepo.save(courier);

    if (order.status === OrderStatus.PRONTO) {
      order.status = OrderStatus.EM_ENTREGA;
      await this.ordersRepo.save(order);
    }

    return this.getDeliveryOrder(tenantId, orderId);
  }

  async updateAssignmentStatus(
    tenantId: string,
    orderId: string,
    dto: UpdateAssignmentStatusDto,
  ) {
    const order = await this.ordersRepo.findOne({
      where: { id: orderId, tenantId, type: OrderType.DELIVERY },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado');

    const assignment = await this.ensureAssignment(tenantId, order);
    assignment.status = dto.status;
    if (dto.notes !== undefined) assignment.notes = dto.notes;

    const now = new Date();
    if (dto.status === DeliveryAssignmentStatus.PICKED_UP) {
      assignment.pickedUpAt = now;
      order.status = OrderStatus.EM_ENTREGA;
    }
    if (dto.status === DeliveryAssignmentStatus.DELIVERED) {
      assignment.deliveredAt = now;
      order.status = OrderStatus.FECHADO;
      order.closedAt = now;
      if (assignment.courierId) {
        await this.couriersRepo.update(
          { id: assignment.courierId },
          { status: DeliveryCourierStatus.AVAILABLE },
        );
      }
    }
    if (dto.status === DeliveryAssignmentStatus.FAILED) {
      if (assignment.courierId) {
        await this.couriersRepo.update(
          { id: assignment.courierId },
          { status: DeliveryCourierStatus.AVAILABLE },
        );
      }
    }

    await this.assignmentsRepo.save(assignment);
    await this.ordersRepo.save(order);
    return this.getDeliveryOrder(tenantId, orderId);
  }

  async getDeliveryOrder(tenantId: string, orderId: string) {
    const order = await this.ordersRepo.findOne({
      where: { id: orderId, tenantId },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    await this.attachAssignments([order]);
    return order;
  }

  async getOverview(tenantId: string) {
    const [couriers, routes, pending, assigned, inTransit, deliveredToday] =
      await Promise.all([
        this.couriersRepo.count({ where: { tenantId, active: true } }),
        this.routesRepo.count({ where: { tenantId, active: true } }),
        this.assignmentsRepo.count({
          where: { tenantId, status: DeliveryAssignmentStatus.PENDING },
        }),
        this.assignmentsRepo.count({
          where: { tenantId, status: DeliveryAssignmentStatus.ASSIGNED },
        }),
        this.assignmentsRepo.count({
          where: {
            tenantId,
            status: In([
              DeliveryAssignmentStatus.PICKED_UP,
              DeliveryAssignmentStatus.ASSIGNED,
            ]),
          },
        }),
        this.assignmentsRepo
          .createQueryBuilder('a')
          .where('a.tenant_id = :tenantId', { tenantId })
          .andWhere('a.status = :st', { st: DeliveryAssignmentStatus.DELIVERED })
          .andWhere('DATE(a.delivered_at) = CURRENT_DATE')
          .getCount(),
      ]);

    const openOrders = await this.ordersRepo.count({
      where: { tenantId, type: OrderType.DELIVERY, status: In(OPEN_ORDER_STATUSES) },
    });

    return {
      couriers,
      routes,
      pending,
      assigned,
      inTransit,
      deliveredToday,
      openOrders,
    };
  }
}
