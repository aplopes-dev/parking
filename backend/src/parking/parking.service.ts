import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, Repository } from 'typeorm';
import { ParkingFacility } from './entities/parking-facility.entity';
import { ParkingSpot } from './entities/parking-spot.entity';
import { ParkingSession } from './entities/parking-session.entity';
import { ParkingTariff } from './entities/parking-tariff.entity';
import {
  ParkingAccessType,
  ParkingSegment,
  ParkingSessionStatus,
  ParkingSpotStatus,
  ParkingSystemType,
  TariffBillingType,
  VehicleType,
} from './entities/parking.enums';
import { ParkingContractsService } from './parking-contracts.service';
import {
  calculateTariffAmount,
  vehicleTypeMatches,
} from './parking-tariff.util';
import {
  BulkCreateParkingSpotsDto,
  CloseParkingSessionDto,
  CreateParkingEntryDto,
  CreateParkingFacilityDto,
  CreateParkingSpotDto,
  CreateParkingTariffDto,
  ListParkingSessionsQueryDto,
  ListParkingTariffsQueryDto,
  TariffQuoteQueryDto,
  UpdateParkingFacilityDto,
  UpdateParkingSpotStatusDto,
  UpdateParkingTariffDto,
} from './dto/parking.dto';

function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function generateTicketCode(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PK-${date}-${rand}`;
}

export type SessionExitQuote = {
  amount: number;
  durationMinutes: number;
  tariffId: string | null;
  tariffName: string | null;
  breakdown: string;
  accessType: ParkingAccessType;
  waived: boolean;
  discountNote: string | null;
};

@Injectable()
export class ParkingService {
  constructor(
    @InjectRepository(ParkingFacility)
    private readonly facilitiesRepo: Repository<ParkingFacility>,
    @InjectRepository(ParkingSpot)
    private readonly spotsRepo: Repository<ParkingSpot>,
    @InjectRepository(ParkingSession)
    private readonly sessionsRepo: Repository<ParkingSession>,
    @InjectRepository(ParkingTariff)
    private readonly tariffsRepo: Repository<ParkingTariff>,
    private readonly contractsService: ParkingContractsService,
  ) {}

  getMeta() {
    return {
      systemTypes: [
        { value: ParkingSystemType.VALET, label: 'Valet Parking' },
        { value: ParkingSystemType.GARAGE, label: 'Estacionamentos e Garagens' },
        { value: ParkingSystemType.PUBLIC, label: 'Estacionamentos Públicos' },
      ],
      segments: [
        { value: ParkingSegment.COMMERCIAL, label: 'Estacionamentos comerciais' },
        { value: ParkingSegment.HOTEL, label: 'Hotéis' },
        { value: ParkingSegment.AIRPORT, label: 'Aeroportos' },
        { value: ParkingSegment.SHOPPING, label: 'Shoppings' },
        { value: ParkingSegment.EVENT, label: 'Eventos' },
        { value: ParkingSegment.AUTOMOTIVE, label: 'Serviços automotivos' },
        { value: ParkingSegment.STADIUM, label: 'Estádio e arena' },
        { value: ParkingSegment.DEALERSHIP, label: 'Concessionárias' },
        { value: ParkingSegment.HOSPITAL, label: 'Hospitais e clínicas' },
        { value: ParkingSegment.NETWORK, label: 'Redes' },
      ],
      vehicleTypes: [
        { value: VehicleType.CAR, label: 'Automóvel' },
        { value: VehicleType.MOTORCYCLE, label: 'Motocicleta' },
        { value: VehicleType.TRUCK, label: 'Caminhão' },
        { value: VehicleType.BUS, label: 'Ônibus' },
        { value: VehicleType.OTHER, label: 'Outro' },
      ],
      spotStatuses: [
        { value: ParkingSpotStatus.AVAILABLE, label: 'Disponível' },
        { value: ParkingSpotStatus.OCCUPIED, label: 'Ocupada' },
        { value: ParkingSpotStatus.RESERVED, label: 'Reservada' },
        { value: ParkingSpotStatus.MAINTENANCE, label: 'Manutenção' },
      ],
      billingTypes: [
        { value: TariffBillingType.HOURLY, label: 'Por hora (rotativo)' },
        { value: TariffBillingType.DAILY, label: 'Diária' },
        { value: TariffBillingType.MONTHLY, label: 'Mensalista' },
      ],
    };
  }

  private async getFacilityOrThrow(tenantId: string, facilityId: string) {
    const facility = await this.facilitiesRepo.findOne({
      where: { id: facilityId, tenantId },
    });
    if (!facility) throw new NotFoundException('Unidade de estacionamento não encontrada');
    return facility;
  }

  async listFacilities(tenantId: string) {
    return this.facilitiesRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async createFacility(tenantId: string, dto: CreateParkingFacilityDto) {
    return this.facilitiesRepo.save(
      this.facilitiesRepo.create({
        tenantId,
        name: dto.name.trim(),
        systemType: dto.systemType,
        segment: dto.segment,
        address: dto.address?.trim() || null,
        totalSpots: dto.totalSpots ?? 0,
        notes: dto.notes?.trim() || null,
        active: true,
      }),
    );
  }

  async updateFacility(tenantId: string, id: string, dto: UpdateParkingFacilityDto) {
    const facility = await this.getFacilityOrThrow(tenantId, id);
    if (dto.name !== undefined) facility.name = dto.name.trim();
    if (dto.systemType !== undefined) facility.systemType = dto.systemType;
    if (dto.segment !== undefined) facility.segment = dto.segment;
    if (dto.address !== undefined) facility.address = dto.address.trim() || null;
    if (dto.totalSpots !== undefined) facility.totalSpots = dto.totalSpots;
    if (dto.active !== undefined) facility.active = dto.active;
    if (dto.notes !== undefined) facility.notes = dto.notes.trim() || null;
    return this.facilitiesRepo.save(facility);
  }

  async listSpots(tenantId: string, facilityId?: string) {
    return this.spotsRepo.find({
      where: {
        tenantId,
        ...(facilityId ? { facilityId } : {}),
      },
      relations: ['facility'],
      order: { code: 'ASC' },
    });
  }

  async createSpot(tenantId: string, dto: CreateParkingSpotDto) {
    await this.getFacilityOrThrow(tenantId, dto.facilityId);
    const code = dto.code.trim().toUpperCase();
    const exists = await this.spotsRepo.findOne({
      where: { tenantId, facilityId: dto.facilityId, code },
    });
    if (exists) throw new ConflictException('Já existe uma vaga com este código nesta unidade');

    return this.spotsRepo.save(
      this.spotsRepo.create({
        tenantId,
        facilityId: dto.facilityId,
        code,
        floor: dto.floor?.trim() || null,
        zone: dto.zone?.trim() || null,
        status: ParkingSpotStatus.AVAILABLE,
        active: true,
      }),
    );
  }

  async bulkCreateSpots(tenantId: string, dto: BulkCreateParkingSpotsDto) {
    await this.getFacilityOrThrow(tenantId, dto.facilityId);
    const prefix = dto.prefix.trim().toUpperCase();
    const created: ParkingSpot[] = [];

    for (let i = 1; i <= dto.count; i += 1) {
      const code = `${prefix}${String(i).padStart(3, '0')}`;
      const exists = await this.spotsRepo.findOne({
        where: { tenantId, facilityId: dto.facilityId, code },
      });
      if (exists) continue;
      created.push(
        await this.spotsRepo.save(
          this.spotsRepo.create({
            tenantId,
            facilityId: dto.facilityId,
            code,
            floor: dto.floor?.trim() || null,
            zone: dto.zone?.trim() || null,
            status: ParkingSpotStatus.AVAILABLE,
            active: true,
          }),
        ),
      );
    }

    await this.syncFacilityTotalSpots(tenantId, dto.facilityId);
    return { created: created.length, spots: created };
  }

  async updateSpotStatus(tenantId: string, spotId: string, dto: UpdateParkingSpotStatusDto) {
    const spot = await this.spotsRepo.findOne({ where: { id: spotId, tenantId } });
    if (!spot) throw new NotFoundException('Vaga não encontrada');
    spot.status = dto.status;
    return this.spotsRepo.save(spot);
  }

  private async syncFacilityTotalSpots(tenantId: string, facilityId: string) {
    const count = await this.spotsRepo.count({ where: { tenantId, facilityId, active: true } });
    await this.facilitiesRepo.update({ id: facilityId, tenantId }, { totalSpots: count });
  }

  async listSessions(tenantId: string, query: ListParkingSessionsQueryDto) {
    const where: Record<string, unknown> = { tenantId };
    if (query.facilityId) where.facilityId = query.facilityId;
    if (query.status) where.status = query.status;
    if (query.plate) where.plate = ILike(`%${normalizePlate(query.plate)}%`);

    return this.sessionsRepo.find({
      where,
      relations: ['facility', 'spot', 'tariff', 'customer', 'subscription', 'agreement'],
      order: { entryAt: 'DESC' },
      take: 200,
    });
  }

  async registerEntry(tenantId: string, dto: CreateParkingEntryDto) {
    await this.getFacilityOrThrow(tenantId, dto.facilityId);
    const plate = normalizePlate(dto.plate);
    if (plate.length < 5) throw new BadRequestException('Placa inválida');

    const activeSamePlate = await this.sessionsRepo.findOne({
      where: {
        tenantId,
        facilityId: dto.facilityId,
        plate,
        status: ParkingSessionStatus.ACTIVE,
      },
    });
    if (activeSamePlate) {
      throw new ConflictException('Já existe uma sessão ativa para esta placa nesta unidade');
    }

    let spot: ParkingSpot | null = null;
    if (dto.spotId) {
      spot = await this.spotsRepo.findOne({
        where: { id: dto.spotId, tenantId, facilityId: dto.facilityId },
      });
      if (!spot) throw new NotFoundException('Vaga não encontrada');
      if (spot.status !== ParkingSpotStatus.AVAILABLE) {
        throw new BadRequestException('A vaga selecionada não está disponível');
      }
    }

    const access = await this.contractsService.resolveAccess(
      tenantId,
      dto.facilityId,
      plate,
    );

    const session = await this.sessionsRepo.save(
      this.sessionsRepo.create({
        tenantId,
        facilityId: dto.facilityId,
        spotId: spot?.id ?? null,
        plate,
        vehicleType: dto.vehicleType ?? VehicleType.CAR,
        ticketCode: generateTicketCode(),
        driverName: dto.driverName?.trim() || access.customerName || null,
        status: ParkingSessionStatus.ACTIVE,
        entryAt: new Date(),
        notes: dto.notes?.trim() || null,
        customerId: access.customerId,
        subscriptionId: access.subscriptionId,
        agreementId: access.agreementId,
        accessType: access.accessType,
      }),
    );

    if (spot) {
      spot.status = ParkingSpotStatus.OCCUPIED;
      await this.spotsRepo.save(spot);
    }

    return this.sessionsRepo.findOne({
      where: { id: session.id },
      relations: ['facility', 'spot', 'customer', 'subscription', 'agreement'],
    });
  }

  async registerExit(tenantId: string, sessionId: string, dto: CloseParkingSessionDto) {
    const session = await this.sessionsRepo.findOne({
      where: { id: sessionId, tenantId },
      relations: ['spot', 'agreement'],
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');
    if (session.status !== ParkingSessionStatus.ACTIVE) {
      throw new BadRequestException('Esta sessão já foi encerrada');
    }

    const exitAt = new Date();
    const quote = await this.computeExitQuoteForSession(
      tenantId,
      session,
      dto.tariffId,
      exitAt,
    );

    session.status = ParkingSessionStatus.CLOSED;
    session.exitAt = exitAt;
    if (dto.notes?.trim()) {
      session.notes = [session.notes, dto.notes.trim()].filter(Boolean).join('\n');
    }

    session.durationMinutes = quote.durationMinutes;
    session.amountCharged = quote.amount.toFixed(2);
    session.tariffId = quote.tariffId;

    if (quote.discountNote) {
      session.notes = [session.notes, quote.discountNote].filter(Boolean).join('\n');
    }
    if (quote.waived) {
      session.notes = [session.notes, 'Cobrança isenta — mensalista'].filter(Boolean).join('\n');
    }

    await this.sessionsRepo.save(session);

    if (session.spotId && session.spot) {
      session.spot.status = ParkingSpotStatus.AVAILABLE;
      await this.spotsRepo.save(session.spot);
    }

    return this.sessionsRepo.findOne({
      where: { id: session.id },
      relations: ['facility', 'spot', 'tariff', 'customer', 'subscription', 'agreement'],
    });
  }

  async computeSessionExitQuote(
    tenantId: string,
    sessionId: string,
    tariffId?: string,
    exitAt = new Date(),
  ): Promise<SessionExitQuote> {
    const session = await this.sessionsRepo.findOne({
      where: { id: sessionId, tenantId },
      relations: ['agreement'],
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');
    if (session.status !== ParkingSessionStatus.ACTIVE) {
      throw new BadRequestException('Sessão não está ativa');
    }
    return this.computeExitQuoteForSession(tenantId, session, tariffId, exitAt);
  }

  private async computeExitQuoteForSession(
    tenantId: string,
    session: ParkingSession,
    tariffId: string | undefined,
    exitAt: Date,
  ): Promise<SessionExitQuote> {
    const durationMinutes = Math.max(
      0,
      Math.floor((exitAt.getTime() - session.entryAt.getTime()) / 60000),
    );

    if (session.accessType === ParkingAccessType.MENSALISTA) {
      return {
        amount: 0,
        durationMinutes,
        tariffId: null,
        tariffName: null,
        breakdown: 'Isento — mensalista',
        accessType: session.accessType,
        waived: true,
        discountNote: null,
      };
    }

    const tariff = await this.resolveTariffForExit(
      tenantId,
      session.facilityId,
      session.vehicleType,
      tariffId,
    );

    if (!tariff) {
      return {
        amount: 0,
        durationMinutes,
        tariffId: null,
        tariffName: null,
        breakdown: 'Sem tarifa configurada',
        accessType: session.accessType,
        waived: false,
        discountNote: null,
      };
    }

    const quote = calculateTariffAmount(tariff, {
      entryAt: session.entryAt,
      exitAt,
      vehicleType: session.vehicleType,
    });

    let amount = quote.amount;
    let discountNote: string | null = null;
    if (
      session.accessType === ParkingAccessType.CONVENIO &&
      session.agreement?.discountPercent
    ) {
      const discount = Number(session.agreement.discountPercent);
      amount = Math.round(amount * (1 - discount / 100) * 100) / 100;
      discountNote = `Desconto convênio ${discount}%`;
    }

    return {
      amount,
      durationMinutes: quote.durationMinutes,
      tariffId: tariff.id,
      tariffName: tariff.name,
      breakdown: quote.breakdown,
      accessType: session.accessType,
      waived: false,
      discountNote,
    };
  }

  async listTariffs(tenantId: string, query: ListParkingTariffsQueryDto) {
    const qb = this.tariffsRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.facility', 'facility')
      .where('t.tenant_id = :tenantId', { tenantId })
      .orderBy('t.sort_order', 'ASC')
      .addOrderBy('t.name', 'ASC');

    if (query.facilityId) {
      qb.andWhere('(t.facility_id = :facilityId OR t.facility_id IS NULL)', {
        facilityId: query.facilityId,
      });
    }
    if (query.billingType) {
      qb.andWhere('t.billing_type = :billingType', { billingType: query.billingType });
    }

    return qb.getMany();
  }

  async createTariff(tenantId: string, dto: CreateParkingTariffDto) {
    if (dto.facilityId) {
      await this.getFacilityOrThrow(tenantId, dto.facilityId);
    }
    this.validateTariffFields(dto.billingType, dto);

    if (dto.isDefault) {
      await this.clearDefaultTariff(tenantId, dto.facilityId ?? null, dto.billingType);
    }

    return this.tariffsRepo.save(
      this.tariffsRepo.create({
        tenantId,
        facilityId: dto.facilityId ?? null,
        name: dto.name.trim(),
        billingType: dto.billingType,
        vehicleType: dto.vehicleType ?? null,
        price: dto.price.toFixed(2),
        graceMinutes: dto.graceMinutes ?? 0,
        blockMinutes: dto.blockMinutes ?? 60,
        maxDailyPrice:
          dto.maxDailyPrice != null ? dto.maxDailyPrice.toFixed(2) : null,
        description: dto.description?.trim() || null,
        active: true,
        isDefault: dto.isDefault ?? false,
        sortOrder: dto.sortOrder ?? 0,
      }),
    );
  }

  async updateTariff(tenantId: string, id: string, dto: UpdateParkingTariffDto) {
    const tariff = await this.getTariffOrThrow(tenantId, id);
    const nextBilling = dto.billingType ?? tariff.billingType;

    if (dto.facilityId) {
      await this.getFacilityOrThrow(tenantId, dto.facilityId);
    }

    this.validateTariffFields(nextBilling, {
      graceMinutes: dto.graceMinutes ?? tariff.graceMinutes,
      blockMinutes: dto.blockMinutes ?? tariff.blockMinutes,
    });

    if (dto.isDefault) {
      await this.clearDefaultTariff(
        tenantId,
        dto.facilityId === undefined ? tariff.facilityId : dto.facilityId,
        nextBilling,
        id,
      );
    }

    if (dto.name !== undefined) tariff.name = dto.name.trim();
    if (dto.facilityId !== undefined) tariff.facilityId = dto.facilityId;
    if (dto.billingType !== undefined) tariff.billingType = dto.billingType;
    if (dto.vehicleType !== undefined) tariff.vehicleType = dto.vehicleType;
    if (dto.price !== undefined) tariff.price = dto.price.toFixed(2);
    if (dto.graceMinutes !== undefined) tariff.graceMinutes = dto.graceMinutes;
    if (dto.blockMinutes !== undefined) tariff.blockMinutes = dto.blockMinutes;
    if (dto.maxDailyPrice !== undefined) {
      tariff.maxDailyPrice =
        dto.maxDailyPrice == null ? null : dto.maxDailyPrice.toFixed(2);
    }
    if (dto.description !== undefined) tariff.description = dto.description.trim() || null;
    if (dto.active !== undefined) tariff.active = dto.active;
    if (dto.isDefault !== undefined) tariff.isDefault = dto.isDefault;
    if (dto.sortOrder !== undefined) tariff.sortOrder = dto.sortOrder;

    return this.tariffsRepo.save(tariff);
  }

  async quoteTariff(tenantId: string, query: TariffQuoteQueryDto) {
    const tariff = await this.getTariffOrThrow(tenantId, query.tariffId);
    const quote = calculateTariffAmount(tariff, {
      entryAt: query.entryAt,
      exitAt: query.exitAt,
      vehicleType: query.vehicleType,
    });
    return { tariff, ...quote };
  }

  private validateTariffFields(
    billingType: TariffBillingType,
    fields: { graceMinutes?: number; blockMinutes?: number },
  ) {
    if (billingType !== TariffBillingType.HOURLY) return;
    if ((fields.blockMinutes ?? 60) < 1) {
      throw new BadRequestException('blockMinutes deve ser >= 1 para tarifa horária');
    }
  }

  private async getTariffOrThrow(tenantId: string, id: string) {
    const tariff = await this.tariffsRepo.findOne({ where: { id, tenantId } });
    if (!tariff) throw new NotFoundException('Tarifa não encontrada');
    return tariff;
  }

  private async clearDefaultTariff(
    tenantId: string,
    facilityId: string | null,
    billingType: TariffBillingType,
    exceptId?: string,
  ) {
    const qb = this.tariffsRepo
      .createQueryBuilder()
      .update(ParkingTariff)
      .set({ isDefault: false })
      .where('tenant_id = :tenantId', { tenantId })
      .andWhere('billing_type = :billingType', { billingType });

    if (facilityId) {
      qb.andWhere('facility_id = :facilityId', { facilityId });
    } else {
      qb.andWhere('facility_id IS NULL');
    }
    if (exceptId) qb.andWhere('id != :exceptId', { exceptId });
    await qb.execute();
  }

  private async resolveTariffForExit(
    tenantId: string,
    facilityId: string,
    vehicleType: VehicleType,
    tariffId?: string,
  ): Promise<ParkingTariff | null> {
    if (tariffId) {
      const selected = await this.getTariffOrThrow(tenantId, tariffId);
      if (
        selected.billingType !== TariffBillingType.HOURLY &&
        selected.billingType !== TariffBillingType.DAILY
      ) {
        throw new BadRequestException(
          'Na saída rotativa use tarifa por hora ou diária',
        );
      }
      return selected;
    }

    const tariffs = await this.tariffsRepo.find({
      where: {
        tenantId,
        active: true,
        billingType: TariffBillingType.HOURLY,
      },
      order: { isDefault: 'DESC', sortOrder: 'ASC' },
    });

    const matching = tariffs.filter(
      (t) =>
        (!t.facilityId || t.facilityId === facilityId) &&
        vehicleTypeMatches(t.vehicleType, vehicleType),
    );

    const facilityDefault = matching.find((t) => t.facilityId === facilityId && t.isDefault);
    if (facilityDefault) return facilityDefault;

    const facilityAny = matching.find((t) => t.facilityId === facilityId);
    if (facilityAny) return facilityAny;

    const globalDefault = matching.find((t) => !t.facilityId && t.isDefault);
    if (globalDefault) return globalDefault;

    return matching.find((t) => !t.facilityId) ?? matching[0] ?? null;
  }

  async getDashboard(tenantId: string, facilityId?: string) {
    const facilities = await this.listFacilities(tenantId);
    const targetFacilityId = facilityId ?? facilities[0]?.id;

    const spotWhere: Record<string, unknown> = { tenantId, active: true };
    if (targetFacilityId) spotWhere.facilityId = targetFacilityId;

    const spots = await this.spotsRepo.find({ where: spotWhere });
    const occupied = spots.filter((s) => s.status === ParkingSpotStatus.OCCUPIED).length;
    const available = spots.filter((s) => s.status === ParkingSpotStatus.AVAILABLE).length;
    const reserved = spots.filter((s) => s.status === ParkingSpotStatus.RESERVED).length;

    const sessionWhere: Record<string, unknown> = { tenantId };
    if (targetFacilityId) sessionWhere.facilityId = targetFacilityId;

    const activeSessions = await this.sessionsRepo.count({
      where: { ...sessionWhere, status: ParkingSessionStatus.ACTIVE },
    });

    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const entriesToday = await this.sessionsRepo.count({
      where: {
        ...sessionWhere,
        entryAt: Between(start, end),
      },
    });

    const exitsToday = await this.sessionsRepo.count({
      where: {
        ...sessionWhere,
        status: ParkingSessionStatus.CLOSED,
        exitAt: Between(start, end),
      },
    });

    const recentSessions = await this.sessionsRepo.find({
      where: sessionWhere,
      relations: ['facility', 'spot'],
      order: { entryAt: 'DESC' },
      take: 8,
    });

    return {
      facilityId: targetFacilityId ?? null,
      facilities,
      summary: {
        totalSpots: spots.length,
        occupied,
        available,
        reserved,
        occupancyRate: spots.length ? Math.round((occupied / spots.length) * 100) : 0,
        activeSessions,
        entriesToday,
        exitsToday,
      },
      recentSessions,
    };
  }
}
