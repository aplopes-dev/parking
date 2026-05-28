import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { ParkingAccessDevice } from './entities/parking-access-device.entity';
import { ParkingAccessEvent } from './entities/parking-access-event.entity';
import { ParkingGateCommand } from './entities/parking-gate-command.entity';
import { ParkingSession } from './entities/parking-session.entity';
import { ParkingFacility } from './entities/parking-facility.entity';
import {
  ParkingAccessEventType,
  ParkingAccessType,
  ParkingDeviceDirection,
  ParkingGateCommandStatus,
  ParkingSessionStatus,
  VehicleType,
} from './entities/parking.enums';
import {
  CreateParkingDeviceDto,
  HardwareHeartbeatDto,
  HardwareLprReadDto,
  ListAccessEventsQueryDto,
  ManualGateOpenDto,
  UpdateParkingDeviceDto,
} from './dto/parking-hardware.dto';
import { ParkingCashService } from './parking-cash.service';
import { ParkingContractsService } from './parking-contracts.service';
import { ParkingService } from './parking.service';

export type HardwareActionResult = {
  allowed: boolean;
  action: 'open_gate' | 'deny' | 'none';
  reason: string;
  eventId: string;
  sessionId: string | null;
  accessType: string | null;
  amountDue: number | null;
  gateCommandId: string | null;
};

function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function generateApiKey(): string {
  return `pkhw_${randomBytes(24).toString('hex')}`;
}

@Injectable()
export class ParkingHardwareService {
  constructor(
    @InjectRepository(ParkingAccessDevice)
    private readonly devicesRepo: Repository<ParkingAccessDevice>,
    @InjectRepository(ParkingAccessEvent)
    private readonly eventsRepo: Repository<ParkingAccessEvent>,
    @InjectRepository(ParkingGateCommand)
    private readonly commandsRepo: Repository<ParkingGateCommand>,
    @InjectRepository(ParkingSession)
    private readonly sessionsRepo: Repository<ParkingSession>,
    @InjectRepository(ParkingFacility)
    private readonly facilitiesRepo: Repository<ParkingFacility>,
    private readonly parkingService: ParkingService,
    private readonly contractsService: ParkingContractsService,
    private readonly cashService: ParkingCashService,
  ) {}

  async listDevices(tenantId: string, facilityId?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (facilityId) where.facilityId = facilityId;
    return this.devicesRepo.find({
      where,
      relations: ['facility'],
      order: { name: 'ASC' },
    });
  }

  async createDevice(tenantId: string, dto: CreateParkingDeviceDto) {
    await this.getFacilityOrThrow(tenantId, dto.facilityId);
    const apiKey = generateApiKey();
    const device = await this.devicesRepo.save(
      this.devicesRepo.create({
        tenantId,
        facilityId: dto.facilityId,
        name: dto.name.trim(),
        code: dto.code?.trim() || null,
        type: dto.type,
        direction: dto.direction,
        vendor: dto.vendor?.trim() || null,
        ipAddress: dto.ipAddress?.trim() || null,
        apiKey,
        autoEntry: dto.autoEntry ?? true,
        autoExitWaived: dto.autoExitWaived ?? true,
        config: dto.config ?? null,
        active: true,
      }),
    );
    return { ...device, apiKeyPlain: apiKey };
  }

  async updateDevice(tenantId: string, id: string, dto: UpdateParkingDeviceDto) {
    const device = await this.getDeviceOrThrow(tenantId, id);
    if (dto.name !== undefined) device.name = dto.name.trim();
    if (dto.code !== undefined) device.code = dto.code.trim() || null;
    if (dto.type !== undefined) device.type = dto.type;
    if (dto.direction !== undefined) device.direction = dto.direction;
    if (dto.vendor !== undefined) device.vendor = dto.vendor.trim() || null;
    if (dto.ipAddress !== undefined) device.ipAddress = dto.ipAddress.trim() || null;
    if (dto.autoEntry !== undefined) device.autoEntry = dto.autoEntry;
    if (dto.autoExitWaived !== undefined) device.autoExitWaived = dto.autoExitWaived;
    if (dto.active !== undefined) device.active = dto.active;
    if (dto.config !== undefined) device.config = dto.config;
    return this.devicesRepo.save(device);
  }

  async regenerateApiKey(tenantId: string, id: string) {
    const device = await this.getDeviceOrThrow(tenantId, id);
    const apiKey = generateApiKey();
    device.apiKey = apiKey;
    await this.devicesRepo.save(device);
    return { ...device, apiKeyPlain: apiKey };
  }

  async listEvents(tenantId: string, query: ListAccessEventsQueryDto) {
    const qb = this.eventsRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.device', 'device')
      .leftJoinAndSelect('e.facility', 'facility')
      .leftJoinAndSelect('e.session', 'session')
      .where('e.tenant_id = :tenantId', { tenantId })
      .orderBy('e.created_at', 'DESC')
      .take(200);

    if (query.facilityId) {
      qb.andWhere('e.facility_id = :facilityId', { facilityId: query.facilityId });
    }
    if (query.deviceId) {
      qb.andWhere('e.device_id = :deviceId', { deviceId: query.deviceId });
    }
    if (query.plate?.trim()) {
      qb.andWhere('e.plate ILIKE :plate', { plate: `%${normalizePlate(query.plate)}%` });
    }

    return qb.getMany();
  }

  async manualOpenGate(tenantId: string, deviceId: string, dto: ManualGateOpenDto) {
    const device = await this.getDeviceOrThrow(tenantId, deviceId);
    const event = await this.logEvent({
      tenantId,
      device,
      eventType: ParkingAccessEventType.MANUAL_OVERRIDE,
      plate: null,
      allowed: true,
      message: dto.reason?.trim() || 'Abertura manual',
      gateAction: 'open_gate',
    });
    const command = await this.queueGateCommand(
      device,
      dto.reason ?? 'manual',
      dto.durationMs ?? 5000,
    );
    return { event, command, allowed: true, action: 'open_gate' as const };
  }

  async simulateLpr(tenantId: string, deviceId: string, dto: HardwareLprReadDto) {
    const device = await this.getDeviceOrThrow(tenantId, deviceId);
    return this.processLprRead(device, dto);
  }

  async handleDeviceLprRead(device: ParkingAccessDevice, dto: HardwareLprReadDto) {
    device.lastSeenAt = new Date();
    await this.devicesRepo.save(device);
    return this.processLprRead(device, dto);
  }

  async handleHeartbeat(device: ParkingAccessDevice, dto: HardwareHeartbeatDto) {
    device.lastSeenAt = new Date();
    if (dto.status || dto.firmwareVersion) {
      device.config = {
        ...(device.config ?? {}),
        lastHeartbeat: {
          at: new Date().toISOString(),
          firmwareVersion: dto.firmwareVersion ?? null,
          status: dto.status ?? null,
        },
      };
    }
    await this.devicesRepo.save(device);

    const event = await this.logEvent({
      tenantId: device.tenantId,
      device,
      eventType: ParkingAccessEventType.HEARTBEAT,
      plate: null,
      allowed: true,
      message: 'Heartbeat',
      gateAction: null,
      rawPayload: dto as unknown as Record<string, unknown>,
    });

    return { ok: true, eventId: event.id, serverTime: new Date().toISOString() };
  }

  async pollCommands(device: ParkingAccessDevice) {
    device.lastSeenAt = new Date();
    await this.devicesRepo.save(device);

    const pending = await this.commandsRepo.findOne({
      where: {
        tenantId: device.tenantId,
        deviceId: device.id,
        status: ParkingGateCommandStatus.PENDING,
      },
      order: { createdAt: 'ASC' },
    });

    if (!pending) return { command: null };

    pending.status = ParkingGateCommandStatus.SENT;
    await this.commandsRepo.save(pending);

    return {
      command: {
        id: pending.id,
        action: pending.command,
        durationMs: pending.durationMs,
        reason: pending.reason,
      },
    };
  }

  async ackCommand(device: ParkingAccessDevice, commandId: string, success = true) {
    const command = await this.commandsRepo.findOne({
      where: { id: commandId, deviceId: device.id, tenantId: device.tenantId },
    });
    if (!command) throw new NotFoundException('Comando não encontrado');

    command.status = success ? ParkingGateCommandStatus.ACKED : ParkingGateCommandStatus.FAILED;
    command.ackedAt = new Date();
    await this.commandsRepo.save(command);
    return { ok: true };
  }

  private async processLprRead(
    device: ParkingAccessDevice,
    dto: HardwareLprReadDto,
  ): Promise<HardwareActionResult> {
    const plate = normalizePlate(dto.plate);
    if (plate.length < 5) {
      throw new BadRequestException('Placa inválida');
    }

    await this.logEvent({
      tenantId: device.tenantId,
      device,
      eventType: ParkingAccessEventType.PLATE_READ,
      plate,
      confidence: dto.confidence?.toFixed(2) ?? null,
      allowed: false,
      message: 'Leitura LPR recebida',
      gateAction: null,
      rawPayload: dto.raw ?? (dto as unknown as Record<string, unknown>),
    });

    const activeSession = await this.sessionsRepo.findOne({
      where: {
        tenantId: device.tenantId,
        facilityId: device.facilityId,
        plate,
        status: ParkingSessionStatus.ACTIVE,
      },
      relations: ['agreement'],
    });

    const isExitLane =
      device.direction === ParkingDeviceDirection.EXIT ||
      (device.direction === ParkingDeviceDirection.BIDIRECTIONAL && !!activeSession);

    if (isExitLane && activeSession) {
      return this.processExit(device, plate, activeSession, dto);
    }

    const isEntryLane =
      device.direction === ParkingDeviceDirection.ENTRY ||
      device.direction === ParkingDeviceDirection.BIDIRECTIONAL;

    if (isEntryLane && !activeSession) {
      return this.processEntry(device, plate, dto);
    }

    if (activeSession && device.direction === ParkingDeviceDirection.ENTRY) {
      return this.deny(
        device,
        plate,
        ParkingAccessEventType.ENTRY_DENIED,
        'Veículo já possui sessão ativa nesta unidade',
        activeSession.id,
      );
    }

    return this.deny(
      device,
      plate,
      ParkingAccessEventType.EXIT_DENIED,
      'Nenhuma sessão ativa encontrada para saída',
      null,
    );
  }

  private async processEntry(
    device: ParkingAccessDevice,
    plate: string,
    dto: HardwareLprReadDto,
  ): Promise<HardwareActionResult> {
    if (!device.autoEntry) {
      return this.deny(
        device,
        plate,
        ParkingAccessEventType.ENTRY_DENIED,
        'Entrada automática desabilitada neste dispositivo',
        null,
      );
    }

    const access = await this.contractsService.resolveAccess(
      device.tenantId,
      device.facilityId,
      plate,
    );

    const session = await this.parkingService.registerEntry(device.tenantId, {
      facilityId: device.facilityId,
      plate,
      vehicleType: VehicleType.CAR,
      driverName: access.customerName ?? undefined,
      notes: `Entrada LPR — ${device.name}`,
    });

    const message =
      access.accessType === ParkingAccessType.MENSALISTA
        ? `Entrada liberada — mensalista (${access.label})`
        : access.accessType === ParkingAccessType.CONVENIO
          ? `Entrada liberada — convênio (${access.label})`
          : 'Entrada registrada — rotativo';

    const command = await this.queueGateCommand(device, message);
    const event = await this.logEvent({
      tenantId: device.tenantId,
      device,
      eventType: ParkingAccessEventType.ENTRY_ALLOWED,
      plate,
      confidence: dto.confidence?.toFixed(2) ?? null,
      allowed: true,
      message,
      sessionId: session?.id ?? null,
      gateAction: 'open_gate',
      rawPayload: dto.raw ?? null,
    });

    return {
      allowed: true,
      action: 'open_gate',
      reason: message,
      eventId: event.id,
      sessionId: session?.id ?? null,
      accessType: access.accessType,
      amountDue: null,
      gateCommandId: command.id,
    };
  }

  private async processExit(
    device: ParkingAccessDevice,
    plate: string,
    session: ParkingSession,
    dto: HardwareLprReadDto,
  ): Promise<HardwareActionResult> {
    const quote = await this.parkingService.computeSessionExitQuote(
      device.tenantId,
      session.id,
    );

    if (quote.amount > 0) {
      return this.deny(
        device,
        plate,
        ParkingAccessEventType.EXIT_DENIED,
        `Pagamento pendente: R$ ${quote.amount.toFixed(2)}. Dirija-se ao caixa.`,
        session.id,
        quote.amount,
      );
    }

    if (!device.autoExitWaived) {
      return this.deny(
        device,
        plate,
        ParkingAccessEventType.EXIT_DENIED,
        'Saída automática desabilitada — liberar manualmente ou no caixa',
        session.id,
      );
    }

    await this.cashService.checkout(device.tenantId, null, session.id, {
      notes: `Saída LPR — ${device.name}`,
    });

    const message = `Saída liberada — ${quote.breakdown}`;
    const command = await this.queueGateCommand(device, message);
    const event = await this.logEvent({
      tenantId: device.tenantId,
      device,
      eventType: ParkingAccessEventType.EXIT_ALLOWED,
      plate,
      confidence: dto.confidence?.toFixed(2) ?? null,
      allowed: true,
      message,
      sessionId: session.id,
      gateAction: 'open_gate',
      rawPayload: dto.raw ?? null,
    });

    return {
      allowed: true,
      action: 'open_gate',
      reason: message,
      eventId: event.id,
      sessionId: session.id,
      accessType: quote.accessType,
      amountDue: 0,
      gateCommandId: command.id,
    };
  }

  private async deny(
    device: ParkingAccessDevice,
    plate: string,
    eventType: ParkingAccessEventType,
    message: string,
    sessionId: string | null,
    amountDue: number | null = null,
  ): Promise<HardwareActionResult> {
    const event = await this.logEvent({
      tenantId: device.tenantId,
      device,
      eventType,
      plate,
      allowed: false,
      message,
      sessionId,
      gateAction: 'deny',
    });

    return {
      allowed: false,
      action: 'deny',
      reason: message,
      eventId: event.id,
      sessionId,
      accessType: null,
      amountDue,
      gateCommandId: null,
    };
  }

  private async queueGateCommand(
    device: ParkingAccessDevice,
    reason: string,
    durationMs = 5000,
  ) {
    return this.commandsRepo.save(
      this.commandsRepo.create({
        tenantId: device.tenantId,
        deviceId: device.id,
        command: 'open',
        status: ParkingGateCommandStatus.PENDING,
        durationMs,
        reason,
      }),
    );
  }

  private async logEvent(input: {
    tenantId: string;
    device: ParkingAccessDevice;
    eventType: ParkingAccessEventType;
    plate: string | null;
    confidence?: string | null;
    allowed: boolean;
    message: string;
    sessionId?: string | null;
    gateAction?: string | null;
    rawPayload?: Record<string, unknown> | null;
  }) {
    return this.eventsRepo.save(
      this.eventsRepo.create({
        tenantId: input.tenantId,
        deviceId: input.device.id,
        facilityId: input.device.facilityId,
        eventType: input.eventType,
        plate: input.plate,
        confidence: input.confidence ?? null,
        allowed: input.allowed,
        message: input.message,
        sessionId: input.sessionId ?? null,
        gateAction: input.gateAction ?? null,
        rawPayload: input.rawPayload ?? null,
      }),
    );
  }

  private async getFacilityOrThrow(tenantId: string, facilityId: string) {
    const facility = await this.facilitiesRepo.findOne({ where: { id: facilityId, tenantId } });
    if (!facility) throw new NotFoundException('Unidade não encontrada');
    return facility;
  }

  private async getDeviceOrThrow(tenantId: string, id: string) {
    const device = await this.devicesRepo.findOne({
      where: { id, tenantId },
      relations: ['facility'],
    });
    if (!device) throw new NotFoundException('Dispositivo não encontrado');
    return device;
  }
}
