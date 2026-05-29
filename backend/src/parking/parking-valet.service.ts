import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ParkingFacility } from './entities/parking-facility.entity';
import { ParkingSpot } from './entities/parking-spot.entity';
import { ParkingValetTicket } from './entities/parking-valet-ticket.entity';
import { ValetTicketStatus, VehicleType, ParkingSpotStatus } from './entities/parking.enums';
import { ParkingService } from './parking.service';
import { ParkingCashService } from './parking-cash.service';
import {
  CreateValetTicketDto,
  DeliverValetTicketDto,
  ListValetTicketsQueryDto,
  ParkValetVehicleDto,
  UpdateValetTicketDto,
} from './dto/parking-valet.dto';

const ACTIVE_VALET_STATUSES: ValetTicketStatus[] = [
  ValetTicketStatus.RECEIVED,
  ValetTicketStatus.PARKING,
  ValetTicketStatus.PARKED,
  ValetTicketStatus.REQUESTED,
  ValetTicketStatus.RETRIEVING,
  ValetTicketStatus.READY,
];

const INTAKE_STATUSES: ValetTicketStatus[] = [
  ValetTicketStatus.RECEIVED,
  ValetTicketStatus.PARKING,
];

const DELIVERY_STATUSES: ValetTicketStatus[] = [
  ValetTicketStatus.REQUESTED,
  ValetTicketStatus.RETRIEVING,
  ValetTicketStatus.READY,
];

function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function generateValetTicketCode(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `VL-${date}-${rand}`;
}

@Injectable()
export class ParkingValetService {
  constructor(
    @InjectRepository(ParkingValetTicket)
    private readonly ticketsRepo: Repository<ParkingValetTicket>,
    @InjectRepository(ParkingFacility)
    private readonly facilitiesRepo: Repository<ParkingFacility>,
    @InjectRepository(ParkingSpot)
    private readonly spotsRepo: Repository<ParkingSpot>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly parkingService: ParkingService,
    private readonly cashService: ParkingCashService,
  ) {}

  async listValets(tenantId: string) {
    const users = await this.usersRepo.find({
      where: { tenantId, active: true },
      order: { name: 'ASC' },
      select: ['id', 'name', 'email', 'role'],
    });
    return users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }));
  }

  async getActiveQueuePayload(tenantId: string, facilityId?: string) {
    const [queue, tickets, valets] = await Promise.all([
      this.getQueueSummary(tenantId, facilityId),
      this.listTickets(tenantId, { facilityId, queue: 'active' }),
      this.listValets(tenantId),
    ]);
    return { queue, tickets, valets };
  }

  async getQueueSummary(tenantId: string, facilityId?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (facilityId) where.facilityId = facilityId;

    const tickets = await this.ticketsRepo.find({
      where: { ...where, status: In(ACTIVE_VALET_STATUSES) },
    });

    const count = (statuses: ValetTicketStatus[]) =>
      tickets.filter((t) => statuses.includes(t.status)).length;

    return {
      facilityId: facilityId ?? null,
      intake: count(INTAKE_STATUSES),
      parked: count([ValetTicketStatus.PARKED]),
      delivery: count(DELIVERY_STATUSES),
      totalActive: tickets.length,
    };
  }

  async listTickets(tenantId: string, query: ListValetTicketsQueryDto) {
    const qb = this.ticketsRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.facility', 'facility')
      .leftJoinAndSelect('t.assignedValet', 'assignedValet')
      .leftJoinAndSelect('t.parkedSpot', 'parkedSpot')
      .where('t.tenantId = :tenantId', { tenantId });

    if (query.facilityId) {
      qb.andWhere('t.facilityId = :facilityId', { facilityId: query.facilityId });
    }
    if (query.status) {
      qb.andWhere('t.status = :status', { status: query.status });
    }
    if (query.plate?.trim()) {
      qb.andWhere('t.plate ILIKE :plate', { plate: `%${normalizePlate(query.plate)}%` });
    }

    if (query.queue === 'intake') {
      qb.andWhere('t.status IN (:...intake)', { intake: INTAKE_STATUSES });
      qb.orderBy('t.receivedAt', 'ASC');
    } else if (query.queue === 'delivery') {
      qb.andWhere('t.status IN (:...delivery)', { delivery: DELIVERY_STATUSES });
      qb.orderBy('t.requestedAt', 'ASC', 'NULLS LAST');
      qb.addOrderBy('t.receivedAt', 'ASC');
    } else if (query.queue === 'parked') {
      qb.andWhere('t.status = :parked', { parked: ValetTicketStatus.PARKED });
      qb.orderBy('t.parkedAt', 'DESC');
    } else if (query.queue === 'active') {
      qb.andWhere('t.status IN (:...active)', { active: ACTIVE_VALET_STATUSES });
      qb.orderBy('t.receivedAt', 'DESC');
    } else {
      qb.orderBy('t.receivedAt', 'DESC');
    }

    return qb.take(200).getMany();
  }

  async receiveVehicle(tenantId: string, dto: CreateValetTicketDto) {
    await this.getFacilityOrThrow(tenantId, dto.facilityId);
    const plate = normalizePlate(dto.plate);
    if (plate.length < 5) throw new BadRequestException('Placa inválida');

    const existing = await this.ticketsRepo.findOne({
      where: {
        tenantId,
        facilityId: dto.facilityId,
        plate,
        status: In(ACTIVE_VALET_STATUSES),
      },
    });
    if (existing) {
      throw new ConflictException('Já existe um ticket valet ativo para esta placa');
    }

    const session = await this.parkingService.registerEntry(tenantId, {
      facilityId: dto.facilityId,
      plate,
      vehicleType: dto.vehicleType ?? VehicleType.CAR,
      driverName: dto.customerName,
      notes: dto.notes ? `Valet: ${dto.notes.trim()}` : 'Recebimento valet',
    });

    const ticket = await this.ticketsRepo.save(
      this.ticketsRepo.create({
        tenantId,
        facilityId: dto.facilityId,
        sessionId: session?.id ?? null,
        ticketCode: generateValetTicketCode(),
        plate,
        vehicleType: dto.vehicleType ?? VehicleType.CAR,
        customerName: dto.customerName?.trim() || null,
        customerPhone: dto.customerPhone?.trim() || null,
        keyTag: dto.keyTag?.trim() || null,
        status: ValetTicketStatus.RECEIVED,
        receivedAt: new Date(),
        notes: dto.notes?.trim() || null,
      }),
    );

    return this.getTicketOrThrow(tenantId, ticket.id);
  }

  async startParking(tenantId: string, ticketId: string, assignedValetId?: string) {
    const ticket = await this.getTicketOrThrow(tenantId, ticketId);
    this.assertStatus(ticket, [ValetTicketStatus.RECEIVED]);
    if (assignedValetId) await this.assertValet(tenantId, assignedValetId);
    ticket.status = ValetTicketStatus.PARKING;
    ticket.assignedValetId = assignedValetId ?? ticket.assignedValetId;
    await this.ticketsRepo.save(ticket);
    return this.getTicketOrThrow(tenantId, ticketId);
  }

  async markParked(tenantId: string, ticketId: string, dto: ParkValetVehicleDto) {
    const ticket = await this.getTicketOrThrow(tenantId, ticketId);
    this.assertStatus(ticket, [ValetTicketStatus.RECEIVED, ValetTicketStatus.PARKING]);

    if (dto.assignedValetId) await this.assertValet(tenantId, dto.assignedValetId);
    if (dto.parkedSpotId) {
      const spot = await this.spotsRepo.findOne({
        where: { id: dto.parkedSpotId, tenantId, facilityId: ticket.facilityId },
      });
      if (!spot) throw new NotFoundException('Vaga não encontrada');
      if (spot.status !== ParkingSpotStatus.AVAILABLE) {
        throw new BadRequestException('A vaga selecionada não está disponível');
      }
      ticket.parkedSpotId = spot.id;
      if (!dto.parkedLocation) ticket.parkedLocation = spot.code;
      spot.status = ParkingSpotStatus.OCCUPIED;
      await this.spotsRepo.save(spot);
    }
    if (dto.parkedLocation?.trim()) {
      ticket.parkedLocation = dto.parkedLocation.trim();
    }
    if (dto.assignedValetId) ticket.assignedValetId = dto.assignedValetId;

    ticket.status = ValetTicketStatus.PARKED;
    ticket.parkedAt = new Date();
    await this.ticketsRepo.save(ticket);
    return this.getTicketOrThrow(tenantId, ticketId);
  }

  async requestRetrieval(tenantId: string, ticketId: string) {
    const ticket = await this.getTicketOrThrow(tenantId, ticketId);
    this.assertStatus(ticket, [ValetTicketStatus.PARKED]);
    ticket.status = ValetTicketStatus.REQUESTED;
    ticket.requestedAt = new Date();
    await this.ticketsRepo.save(ticket);
    return this.getTicketOrThrow(tenantId, ticketId);
  }

  async startRetrieval(tenantId: string, ticketId: string, assignedValetId?: string) {
    const ticket = await this.getTicketOrThrow(tenantId, ticketId);
    this.assertStatus(ticket, [ValetTicketStatus.REQUESTED]);
    if (assignedValetId) await this.assertValet(tenantId, assignedValetId);
    ticket.status = ValetTicketStatus.RETRIEVING;
    ticket.assignedValetId = assignedValetId ?? ticket.assignedValetId;
    await this.ticketsRepo.save(ticket);
    return this.getTicketOrThrow(tenantId, ticketId);
  }

  async markReady(tenantId: string, ticketId: string) {
    const ticket = await this.getTicketOrThrow(tenantId, ticketId);
    this.assertStatus(ticket, [ValetTicketStatus.REQUESTED, ValetTicketStatus.RETRIEVING]);
    ticket.status = ValetTicketStatus.READY;
    ticket.readyAt = new Date();
    await this.ticketsRepo.save(ticket);
    return this.getTicketOrThrow(tenantId, ticketId);
  }

  async deliverVehicle(
    tenantId: string,
    ticketId: string,
    dto: DeliverValetTicketDto,
    user: User,
  ) {
    const ticket = await this.getTicketOrThrow(tenantId, ticketId);
    this.assertStatus(ticket, [ValetTicketStatus.READY]);

    if (ticket.sessionId) {
      await this.cashService.checkoutWithAutoCash(user, ticket.sessionId, {
        tariffId: dto.tariffId,
        paymentMethod: dto.paymentMethod,
        accountId: dto.accountId,
        notes: dto.notes?.trim() || 'Entrega valet',
      }, ticket.facilityId);
    }

    await this.releaseParkedSpot(tenantId, ticket.parkedSpotId);

    ticket.status = ValetTicketStatus.DELIVERED;
    ticket.deliveredAt = new Date();
    if (dto.notes?.trim()) {
      ticket.notes = [ticket.notes, dto.notes.trim()].filter(Boolean).join('\n');
    }
    await this.ticketsRepo.save(ticket);
    return this.getTicketOrThrow(tenantId, ticketId);
  }

  async updateTicket(tenantId: string, ticketId: string, dto: UpdateValetTicketDto) {
    const ticket = await this.getTicketOrThrow(tenantId, ticketId);
    if (
      ticket.status === ValetTicketStatus.DELIVERED ||
      ticket.status === ValetTicketStatus.CANCELED
    ) {
      throw new BadRequestException('Ticket encerrado não pode ser alterado');
    }

    if (dto.assignedValetId !== undefined) {
      if (dto.assignedValetId) await this.assertValet(tenantId, dto.assignedValetId);
      ticket.assignedValetId = dto.assignedValetId;
    }
    if (dto.parkedSpotId !== undefined) ticket.parkedSpotId = dto.parkedSpotId;
    if (dto.parkedLocation !== undefined) ticket.parkedLocation = dto.parkedLocation.trim() || null;
    if (dto.notes !== undefined) ticket.notes = dto.notes.trim() || null;

    if (dto.status) {
      this.validateTransition(ticket.status, dto.status);
      ticket.status = dto.status;
      if (dto.status === ValetTicketStatus.PARKED && !ticket.parkedAt) {
        ticket.parkedAt = new Date();
      }
      if (dto.status === ValetTicketStatus.REQUESTED && !ticket.requestedAt) {
        ticket.requestedAt = new Date();
      }
      if (dto.status === ValetTicketStatus.READY && !ticket.readyAt) {
        ticket.readyAt = new Date();
      }
    }

    await this.ticketsRepo.save(ticket);
    return this.getTicketOrThrow(tenantId, ticketId);
  }

  async cancelTicket(tenantId: string, ticketId: string) {
    const ticket = await this.getTicketOrThrow(tenantId, ticketId);
    if (
      ticket.status === ValetTicketStatus.DELIVERED ||
      ticket.status === ValetTicketStatus.CANCELED
    ) {
      throw new BadRequestException('Ticket já encerrado');
    }
    ticket.status = ValetTicketStatus.CANCELED;
    await this.releaseParkedSpot(tenantId, ticket.parkedSpotId);
    await this.ticketsRepo.save(ticket);
    return this.getTicketOrThrow(tenantId, ticketId);
  }

  private async releaseParkedSpot(tenantId: string, spotId: string | null) {
    if (!spotId) return;
    const spot = await this.spotsRepo.findOne({ where: { id: spotId, tenantId } });
    if (!spot) return;
    spot.status = ParkingSpotStatus.AVAILABLE;
    await this.spotsRepo.save(spot);
  }

  private validateTransition(from: ValetTicketStatus, to: ValetTicketStatus) {
    const allowed: Record<ValetTicketStatus, ValetTicketStatus[]> = {
      [ValetTicketStatus.RECEIVED]: [
        ValetTicketStatus.PARKING,
        ValetTicketStatus.PARKED,
        ValetTicketStatus.CANCELED,
      ],
      [ValetTicketStatus.PARKING]: [ValetTicketStatus.PARKED, ValetTicketStatus.CANCELED],
      [ValetTicketStatus.PARKED]: [ValetTicketStatus.REQUESTED, ValetTicketStatus.CANCELED],
      [ValetTicketStatus.REQUESTED]: [
        ValetTicketStatus.RETRIEVING,
        ValetTicketStatus.READY,
        ValetTicketStatus.CANCELED,
      ],
      [ValetTicketStatus.RETRIEVING]: [ValetTicketStatus.READY, ValetTicketStatus.CANCELED],
      [ValetTicketStatus.READY]: [ValetTicketStatus.DELIVERED, ValetTicketStatus.CANCELED],
      [ValetTicketStatus.DELIVERED]: [],
      [ValetTicketStatus.CANCELED]: [],
    };
    if (!allowed[from]?.includes(to)) {
      throw new BadRequestException(`Transição inválida: ${from} → ${to}`);
    }
  }

  private assertStatus(ticket: ParkingValetTicket, allowed: ValetTicketStatus[]) {
    if (!allowed.includes(ticket.status)) {
      throw new BadRequestException(
        `Ação não permitida no status "${ticket.status}"`,
      );
    }
  }

  private async getFacilityOrThrow(tenantId: string, facilityId: string) {
    const facility = await this.facilitiesRepo.findOne({ where: { id: facilityId, tenantId } });
    if (!facility) throw new NotFoundException('Unidade não encontrada');
    return facility;
  }

  private async assertValet(tenantId: string, userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId, tenantId, active: true } });
    if (!user) throw new NotFoundException('Manobrista não encontrado');
    return user;
  }

  private async getTicketOrThrow(tenantId: string, id: string) {
    const ticket = await this.ticketsRepo.findOne({
      where: { id, tenantId },
      relations: ['facility', 'assignedValet', 'parkedSpot'],
    });
    if (!ticket) throw new NotFoundException('Ticket valet não encontrado');
    return ticket;
  }
}
