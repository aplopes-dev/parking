import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { ParkingAgreementVehicle } from './entities/parking-agreement-vehicle.entity';
import { ParkingSession } from './entities/parking-session.entity';
import { ParkingSubscriptionVehicle } from './entities/parking-subscription-vehicle.entity';
import { ParkingVehicle } from './entities/parking-vehicle.entity';
import { ContractStatus } from './entities/parking.enums';
import {
  CreateParkingVehicleDto,
  ListParkingVehiclesQueryDto,
  UpdateParkingVehicleDto,
} from './dto/parking-vehicles.dto';

export function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

@Injectable()
export class ParkingVehiclesService {
  constructor(
    @InjectRepository(ParkingVehicle)
    private readonly vehiclesRepo: Repository<ParkingVehicle>,
    @InjectRepository(ParkingSession)
    private readonly sessionsRepo: Repository<ParkingSession>,
    @InjectRepository(ParkingSubscriptionVehicle)
    private readonly subVehiclesRepo: Repository<ParkingSubscriptionVehicle>,
    @InjectRepository(ParkingAgreementVehicle)
    private readonly agrVehiclesRepo: Repository<ParkingAgreementVehicle>,
    @InjectRepository(Customer)
    private readonly customersRepo: Repository<Customer>,
  ) {}

  async list(tenantId: string, query: ListParkingVehiclesQueryDto) {
    const qb = this.vehiclesRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.customer', 'customer')
      .where('v.tenant_id = :tenantId', { tenantId })
      .orderBy('v.plate', 'ASC');

    if (query.active !== undefined) {
      qb.andWhere('v.active = :active', { active: query.active });
    }
    if (query.customerId) {
      qb.andWhere('v.customer_id = :customerId', { customerId: query.customerId });
    }
    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        '(v.plate ILIKE :term OR v.holder_name ILIKE :term OR v.rfid_tag ILIKE :term OR customer.name ILIKE :term)',
        { term },
      );
    }

    const vehicles = await qb.getMany();
    return Promise.all(vehicles.map((v) => this.enrichVehicle(tenantId, v)));
  }

  async getByPlate(tenantId: string, plate: string) {
    const normalized = normalizePlate(plate);
    const vehicle = await this.vehiclesRepo.findOne({
      where: { tenantId, plate: normalized },
      relations: ['customer'],
    });
    if (!vehicle) throw new NotFoundException('Veículo não encontrado');

    const sessions = await this.sessionsRepo.find({
      where: { tenantId, plate: normalized },
      order: { entryAt: 'DESC' },
      take: 20,
      relations: ['facility'],
    });

    const enriched = await this.enrichVehicle(tenantId, vehicle);
    return { ...enriched, recentSessions: sessions };
  }

  async create(tenantId: string, dto: CreateParkingVehicleDto) {
    const plate = normalizePlate(dto.plate);
    const existing = await this.vehiclesRepo.findOne({ where: { tenantId, plate } });
    if (existing) {
      throw new ConflictException(`Placa ${plate} já cadastrada`);
    }

    if (dto.customerId) {
      await this.assertCustomer(tenantId, dto.customerId);
    }

    const saved = await this.vehiclesRepo.save(
      this.vehiclesRepo.create({
        tenantId,
        plate,
        vehicleType: dto.vehicleType,
        customerId: dto.customerId ?? null,
        holderName: dto.holderName ?? null,
        brand: dto.brand ?? null,
        model: dto.model ?? null,
        color: dto.color ?? null,
        rfidTag: dto.rfidTag ?? null,
        notes: dto.notes ?? null,
        active: true,
      }),
    );

    return this.enrichVehicle(tenantId, saved);
  }

  async update(tenantId: string, id: string, dto: UpdateParkingVehicleDto) {
    const vehicle = await this.vehiclesRepo.findOne({ where: { id, tenantId } });
    if (!vehicle) throw new NotFoundException('Veículo não encontrado');

    if (dto.customerId) {
      await this.assertCustomer(tenantId, dto.customerId);
    }

    if (dto.vehicleType !== undefined) vehicle.vehicleType = dto.vehicleType;
    if (dto.customerId !== undefined) vehicle.customerId = dto.customerId;
    if (dto.holderName !== undefined) vehicle.holderName = dto.holderName;
    if (dto.brand !== undefined) vehicle.brand = dto.brand;
    if (dto.model !== undefined) vehicle.model = dto.model;
    if (dto.color !== undefined) vehicle.color = dto.color;
    if (dto.rfidTag !== undefined) vehicle.rfidTag = dto.rfidTag;
    if (dto.notes !== undefined) vehicle.notes = dto.notes;
    if (dto.active !== undefined) vehicle.active = dto.active;

    const saved = await this.vehiclesRepo.save(vehicle);
    return this.enrichVehicle(tenantId, saved);
  }

  /** Sincroniza cadastro master a partir de contrato (mensalista/convênio). */
  async upsertFromContract(
    tenantId: string,
    data: {
      plate: string;
      vehicleType?: string;
      holderName?: string | null;
      customerId?: string | null;
      rfidTag?: string | null;
    },
  ) {
    const plate = normalizePlate(data.plate);
    let vehicle = await this.vehiclesRepo.findOne({ where: { tenantId, plate } });
    if (!vehicle) {
      vehicle = this.vehiclesRepo.create({
        tenantId,
        plate,
        vehicleType: (data.vehicleType as ParkingVehicle['vehicleType']) ?? undefined,
        customerId: data.customerId ?? null,
        holderName: data.holderName ?? null,
        rfidTag: data.rfidTag ?? null,
        active: true,
      });
    } else {
      if (data.customerId && !vehicle.customerId) vehicle.customerId = data.customerId;
      if (data.holderName && !vehicle.holderName) vehicle.holderName = data.holderName;
      if (data.rfidTag && !vehicle.rfidTag) vehicle.rfidTag = data.rfidTag;
    }
    await this.vehiclesRepo.save(vehicle);
  }

  private async enrichVehicle(tenantId: string, vehicle: ParkingVehicle) {
    const plate = vehicle.plate;
    const withCustomer = vehicle.customer
      ? vehicle
      : await this.vehiclesRepo.findOne({
          where: { id: vehicle.id },
          relations: ['customer'],
        });

    const subVehicle = await this.subVehiclesRepo.findOne({
      where: { tenantId, plate, active: true },
      relations: ['subscription', 'subscription.customer', 'subscription.facility'],
    });

    const agrVehicle = await this.agrVehiclesRepo.findOne({
      where: { tenantId, plate, active: true },
      relations: ['agreement', 'agreement.customer', 'agreement.facility'],
    });

    const contracts: Array<{
      type: 'mensalista' | 'convenio';
      id: string;
      label: string;
      status: string;
      facilityName: string | null;
    }> = [];

    if (subVehicle?.subscription) {
      contracts.push({
        type: 'mensalista',
        id: subVehicle.subscription.id,
        label: subVehicle.subscription.customer?.name ?? subVehicle.subscription.code ?? 'Mensalista',
        status: subVehicle.subscription.status,
        facilityName: subVehicle.subscription.facility?.name ?? null,
      });
    }

    if (agrVehicle?.agreement) {
      contracts.push({
        type: 'convenio',
        id: agrVehicle.agreement.id,
        label: agrVehicle.agreement.name,
        status: agrVehicle.agreement.status,
        facilityName: agrVehicle.agreement.facility?.name ?? null,
      });
    }

    const sessionCount = await this.sessionsRepo.count({ where: { tenantId, plate } });

    return {
      ...withCustomer,
      contracts,
      sessionCount,
      accessLabel:
        contracts.find((c) => c.status === ContractStatus.ACTIVE)?.label ?? 'Rotativo',
    };
  }

  private async assertCustomer(tenantId: string, customerId: string) {
    const customer = await this.customersRepo.findOne({ where: { id: customerId, tenantId } });
    if (!customer) throw new NotFoundException('Cliente não encontrado');
    return customer;
  }
}
