import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { CrmCustomersService } from '../crm/crm-customers.service';
import { CrmSegment } from '../crm/entities/crm.enums';
import { ParkingAgreement } from './entities/parking-agreement.entity';
import { ParkingAgreementVehicle } from './entities/parking-agreement-vehicle.entity';
import { ParkingSubscription } from './entities/parking-subscription.entity';
import { ParkingSubscriptionVehicle } from './entities/parking-subscription-vehicle.entity';
import { ParkingTariff } from './entities/parking-tariff.entity';
import {
  ContractStatus,
  ParkingAccessType,
  TariffBillingType,
  VehicleType,
} from './entities/parking.enums';
import {
  AddAgreementVehicleDto,
  AddSubscriptionVehicleDto,
  CreateParkingAgreementDto,
  CreateParkingSubscriptionDto,
  ListContractsQueryDto,
  PlateLookupQueryDto,
  UpdateContractVehicleDto,
  UpdateParkingAgreementDto,
  UpdateParkingSubscriptionDto,
} from './dto/parking-contracts.dto';
import { ParkingVehiclesService } from './parking-vehicles.service';

export type PlateAccessResult = {
  plate: string;
  accessType: ParkingAccessType;
  customerId: string | null;
  customerName: string | null;
  subscriptionId: string | null;
  agreementId: string | null;
  label: string;
  discountPercent: number | null;
};

function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isContractValid(startDate: string, endDate: string | null, status: ContractStatus): boolean {
  if (status !== ContractStatus.ACTIVE) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (startDate > today) return false;
  if (endDate && endDate < today) return false;
  return true;
}

@Injectable()
export class ParkingContractsService {
  constructor(
    @InjectRepository(ParkingSubscription)
    private readonly subscriptionsRepo: Repository<ParkingSubscription>,
    @InjectRepository(ParkingSubscriptionVehicle)
    private readonly subscriptionVehiclesRepo: Repository<ParkingSubscriptionVehicle>,
    @InjectRepository(ParkingAgreement)
    private readonly agreementsRepo: Repository<ParkingAgreement>,
    @InjectRepository(ParkingAgreementVehicle)
    private readonly agreementVehiclesRepo: Repository<ParkingAgreementVehicle>,
    @InjectRepository(Customer)
    private readonly customersRepo: Repository<Customer>,
    @InjectRepository(ParkingTariff)
    private readonly tariffsRepo: Repository<ParkingTariff>,
    private readonly crmService: CrmCustomersService,
    private readonly vehiclesService: ParkingVehiclesService,
  ) {}

  async lookupByPlate(
    tenantId: string,
    query: PlateLookupQueryDto,
  ): Promise<PlateAccessResult> {
    const plate = normalizePlate(query.plate);
    const access = await this.resolveAccess(tenantId, query.facilityId, plate);
    return { plate, ...access };
  }

  async resolveAccess(
    tenantId: string,
    facilityId: string | undefined,
    plate: string,
  ): Promise<Omit<PlateAccessResult, 'plate'>> {
    const normalized = normalizePlate(plate);

    const subVehicle = await this.subscriptionVehiclesRepo.findOne({
      where: { tenantId, plate: normalized, active: true },
      relations: ['subscription', 'subscription.customer', 'subscription.facility'],
    });

    if (
      subVehicle?.subscription &&
      isContractValid(
        subVehicle.subscription.startDate,
        subVehicle.subscription.endDate,
        subVehicle.subscription.status,
      ) &&
      (!facilityId || subVehicle.subscription.facilityId === facilityId)
    ) {
      return {
        accessType: ParkingAccessType.MENSALISTA,
        customerId: subVehicle.subscription.customerId,
        customerName: subVehicle.subscription.customer?.name ?? null,
        subscriptionId: subVehicle.subscription.id,
        agreementId: null,
        label: `Mensalista — ${subVehicle.subscription.customer?.name ?? subVehicle.subscription.code ?? 'contrato'}`,
        discountPercent: null,
      };
    }

    const agrVehicle = await this.agreementVehiclesRepo.findOne({
      where: { tenantId, plate: normalized, active: true },
      relations: ['agreement', 'agreement.customer'],
    });

    if (
      agrVehicle?.agreement &&
      isContractValid(
        agrVehicle.agreement.startDate,
        agrVehicle.agreement.endDate,
        agrVehicle.agreement.status,
      ) &&
      (!facilityId ||
        !agrVehicle.agreement.facilityId ||
        agrVehicle.agreement.facilityId === facilityId)
    ) {
      return {
        accessType: ParkingAccessType.CONVENIO,
        customerId: agrVehicle.agreement.customerId,
        customerName: agrVehicle.agreement.customer?.name ?? null,
        subscriptionId: null,
        agreementId: agrVehicle.agreement.id,
        label: `Convênio — ${agrVehicle.agreement.name}`,
        discountPercent: agrVehicle.agreement.discountPercent
          ? Number(agrVehicle.agreement.discountPercent)
          : null,
      };
    }

    return {
      accessType: ParkingAccessType.ROTATIVO,
      customerId: null,
      customerName: null,
      subscriptionId: null,
      agreementId: null,
      label: 'Rotativo',
      discountPercent: null,
    };
  }

  async listSubscriptions(tenantId: string, query: ListContractsQueryDto) {
    const qb = this.subscriptionsRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.customer', 'customer')
      .leftJoinAndSelect('s.facility', 'facility')
      .leftJoinAndSelect('s.tariff', 'tariff')
      .leftJoinAndSelect('s.vehicles', 'vehicles')
      .where('s.tenant_id = :tenantId', { tenantId })
      .orderBy('s.created_at', 'DESC');

    if (query.facilityId) {
      qb.andWhere('s.facility_id = :facilityId', { facilityId: query.facilityId });
    }
    if (query.status) {
      qb.andWhere('s.status = :status', { status: query.status });
    }
    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        '(customer.name ILIKE :term OR customer.document ILIKE :term OR s.code ILIKE :term)',
        { term },
      );
    }

    return qb.getMany();
  }

  async createSubscription(
    tenantId: string,
    dto: CreateParkingSubscriptionDto,
    userId: string | null,
  ) {
    const customer = await this.customersRepo.findOne({
      where: { id: dto.customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado');

    if (dto.tariffId) {
      const tariff = await this.tariffsRepo.findOne({
        where: { id: dto.tariffId, tenantId, billingType: TariffBillingType.MONTHLY },
      });
      if (!tariff) throw new BadRequestException('Tarifa mensalista inválida');
    }

    const subscription = await this.subscriptionsRepo.save(
      this.subscriptionsRepo.create({
        tenantId,
        customerId: dto.customerId,
        facilityId: dto.facilityId,
        tariffId: dto.tariffId ?? null,
        code: dto.code?.trim() || null,
        status: ContractStatus.ACTIVE,
        startDate: dto.startDate,
        endDate: dto.endDate ?? null,
        monthlyPrice: dto.monthlyPrice.toFixed(2),
        notes: dto.notes?.trim() || null,
      }),
    );

    await this.crmService.mergeProfileTags(tenantId, dto.customerId, ['mensalista'], []);
    await this.crmService.updateProfile(tenantId, dto.customerId, {
      segment: CrmSegment.REGULAR,
    });
    await this.crmService.recordParkingEvent(
      tenantId,
      dto.customerId,
      userId,
      'Contrato mensalista criado',
      `Plano R$ ${dto.monthlyPrice.toFixed(2)}/mês`,
    );

    return this.subscriptionsRepo.findOne({
      where: { id: subscription.id },
      relations: ['customer', 'facility', 'tariff', 'vehicles'],
    });
  }

  async updateSubscription(
    tenantId: string,
    id: string,
    dto: UpdateParkingSubscriptionDto,
    userId: string | null,
  ) {
    const subscription = await this.getSubscriptionOrThrow(tenantId, id);
    if (dto.status !== undefined) subscription.status = dto.status;
    if (dto.endDate !== undefined) subscription.endDate = dto.endDate;
    if (dto.monthlyPrice !== undefined) {
      subscription.monthlyPrice = dto.monthlyPrice.toFixed(2);
    }
    if (dto.notes !== undefined) subscription.notes = dto.notes.trim() || null;
    if (dto.tariffId !== undefined) subscription.tariffId = dto.tariffId;

    await this.subscriptionsRepo.save(subscription);

    if (dto.status === ContractStatus.CANCELED || dto.status === ContractStatus.EXPIRED) {
      await this.crmService.mergeProfileTags(
        tenantId,
        subscription.customerId,
        [],
        ['mensalista'],
      );
      await this.crmService.recordParkingEvent(
        tenantId,
        subscription.customerId,
        userId,
        'Contrato mensalista encerrado',
        `Status: ${dto.status}`,
      );
    }

    return this.subscriptionsRepo.findOne({
      where: { id },
      relations: ['customer', 'facility', 'tariff', 'vehicles'],
    });
  }

  async addSubscriptionVehicle(
    tenantId: string,
    subscriptionId: string,
    dto: AddSubscriptionVehicleDto,
  ) {
    const subscription = await this.getSubscriptionOrThrow(tenantId, subscriptionId);
    const plate = normalizePlate(dto.plate);

    const conflict = await this.subscriptionVehiclesRepo.findOne({
      where: { tenantId, plate, active: true },
      relations: ['subscription'],
    });
    if (conflict && conflict.subscriptionId !== subscriptionId) {
      throw new ConflictException('Placa já vinculada a outro contrato mensalista ativo');
    }

    const saved = await this.subscriptionVehiclesRepo.save(
      this.subscriptionVehiclesRepo.create({
        tenantId,
        subscriptionId: subscription.id,
        plate,
        vehicleType: dto.vehicleType ?? VehicleType.CAR,
        holderName: dto.holderName?.trim() || null,
        rfidTag: dto.rfidTag?.trim() || null,
        active: true,
      }),
    );

    await this.vehiclesService.upsertFromContract(tenantId, {
      plate,
      vehicleType: dto.vehicleType,
      holderName: dto.holderName,
      customerId: subscription.customerId,
      rfidTag: dto.rfidTag,
    });

    return saved;
  }

  async updateSubscriptionVehicle(
    tenantId: string,
    vehicleId: string,
    dto: UpdateContractVehicleDto,
  ) {
    const vehicle = await this.subscriptionVehiclesRepo.findOne({
      where: { id: vehicleId, tenantId },
    });
    if (!vehicle) throw new NotFoundException('Veículo não encontrado');
    if (dto.active !== undefined) vehicle.active = dto.active;
    return this.subscriptionVehiclesRepo.save(vehicle);
  }

  async listAgreements(tenantId: string, query: ListContractsQueryDto) {
    const qb = this.agreementsRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.customer', 'customer')
      .leftJoinAndSelect('a.facility', 'facility')
      .leftJoinAndSelect('a.vehicles', 'vehicles')
      .where('a.tenant_id = :tenantId', { tenantId })
      .orderBy('a.created_at', 'DESC');

    if (query.facilityId) {
      qb.andWhere('(a.facility_id = :facilityId OR a.facility_id IS NULL)', {
        facilityId: query.facilityId,
      });
    }
    if (query.status) {
      qb.andWhere('a.status = :status', { status: query.status });
    }
    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        '(a.name ILIKE :term OR customer.name ILIKE :term OR a.code ILIKE :term)',
        { term },
      );
    }

    return qb.getMany();
  }

  async createAgreement(
    tenantId: string,
    dto: CreateParkingAgreementDto,
    userId: string | null,
  ) {
    const customer = await this.customersRepo.findOne({
      where: { id: dto.customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado');

    const agreement = await this.agreementsRepo.save(
      this.agreementsRepo.create({
        tenantId,
        customerId: dto.customerId,
        facilityId: dto.facilityId ?? null,
        name: dto.name.trim(),
        code: dto.code?.trim() || null,
        status: ContractStatus.ACTIVE,
        discountPercent:
          dto.discountPercent != null ? dto.discountPercent.toFixed(2) : null,
        fixedMonthlyFee:
          dto.fixedMonthlyFee != null ? dto.fixedMonthlyFee.toFixed(2) : null,
        vehicleLimit: dto.vehicleLimit ?? null,
        startDate: dto.startDate,
        endDate: dto.endDate ?? null,
        notes: dto.notes?.trim() || null,
      }),
    );

    await this.crmService.mergeProfileTags(tenantId, dto.customerId, ['convênio'], []);
    await this.crmService.updateProfile(tenantId, dto.customerId, {
      segment: CrmSegment.VIP,
    });
    await this.crmService.recordParkingEvent(
      tenantId,
      dto.customerId,
      userId,
      'Convênio corporativo criado',
      dto.name,
    );

    return this.agreementsRepo.findOne({
      where: { id: agreement.id },
      relations: ['customer', 'facility', 'vehicles'],
    });
  }

  async updateAgreement(
    tenantId: string,
    id: string,
    dto: UpdateParkingAgreementDto,
    userId: string | null,
  ) {
    const agreement = await this.getAgreementOrThrow(tenantId, id);
    if (dto.name !== undefined) agreement.name = dto.name.trim();
    if (dto.status !== undefined) agreement.status = dto.status;
    if (dto.discountPercent !== undefined) {
      agreement.discountPercent =
        dto.discountPercent == null ? null : dto.discountPercent.toFixed(2);
    }
    if (dto.fixedMonthlyFee !== undefined) {
      agreement.fixedMonthlyFee =
        dto.fixedMonthlyFee == null ? null : dto.fixedMonthlyFee.toFixed(2);
    }
    if (dto.vehicleLimit !== undefined) agreement.vehicleLimit = dto.vehicleLimit;
    if (dto.endDate !== undefined) agreement.endDate = dto.endDate;
    if (dto.notes !== undefined) agreement.notes = dto.notes.trim() || null;

    await this.agreementsRepo.save(agreement);

    if (dto.status === ContractStatus.CANCELED || dto.status === ContractStatus.EXPIRED) {
      await this.crmService.mergeProfileTags(
        tenantId,
        agreement.customerId,
        [],
        ['convênio'],
      );
      await this.crmService.recordParkingEvent(
        tenantId,
        agreement.customerId,
        userId,
        'Convênio encerrado',
        agreement.name,
      );
    }

    return this.agreementsRepo.findOne({
      where: { id },
      relations: ['customer', 'facility', 'vehicles'],
    });
  }

  async addAgreementVehicle(
    tenantId: string,
    agreementId: string,
    dto: AddAgreementVehicleDto,
  ) {
    const agreement = await this.getAgreementOrThrow(tenantId, agreementId);
    const plate = normalizePlate(dto.plate);

    if (agreement.vehicleLimit) {
      const count = await this.agreementVehiclesRepo.count({
        where: { agreementId, tenantId, active: true },
      });
      if (count >= agreement.vehicleLimit) {
        throw new BadRequestException('Limite de veículos do convênio atingido');
      }
    }

    const existing = await this.agreementVehiclesRepo.findOne({
      where: { tenantId, agreementId, plate },
    });
    if (existing) {
      existing.active = true;
      existing.vehicleType = dto.vehicleType ?? existing.vehicleType;
      existing.driverName = dto.driverName?.trim() || existing.driverName;
      existing.department = dto.department?.trim() || existing.department;
      const saved = await this.agreementVehiclesRepo.save(existing);
      await this.vehiclesService.upsertFromContract(tenantId, {
        plate,
        vehicleType: dto.vehicleType,
        holderName: dto.driverName,
        customerId: agreement.customerId,
      });
      return saved;
    }

    const saved = await this.agreementVehiclesRepo.save(
      this.agreementVehiclesRepo.create({
        tenantId,
        agreementId,
        plate,
        vehicleType: dto.vehicleType ?? VehicleType.CAR,
        driverName: dto.driverName?.trim() || null,
        department: dto.department?.trim() || null,
        active: true,
      }),
    );

    await this.vehiclesService.upsertFromContract(tenantId, {
      plate,
      vehicleType: dto.vehicleType,
      holderName: dto.driverName,
      customerId: agreement.customerId,
    });

    return saved;
  }

  async updateAgreementVehicle(
    tenantId: string,
    vehicleId: string,
    dto: UpdateContractVehicleDto,
  ) {
    const vehicle = await this.agreementVehiclesRepo.findOne({
      where: { id: vehicleId, tenantId },
    });
    if (!vehicle) throw new NotFoundException('Veículo não encontrado');
    if (dto.active !== undefined) vehicle.active = dto.active;
    return this.agreementVehiclesRepo.save(vehicle);
  }

  private async getSubscriptionOrThrow(tenantId: string, id: string) {
    const sub = await this.subscriptionsRepo.findOne({ where: { id, tenantId } });
    if (!sub) throw new NotFoundException('Contrato mensalista não encontrado');
    return sub;
  }

  private async getAgreementOrThrow(tenantId: string, id: string) {
    const agr = await this.agreementsRepo.findOne({ where: { id, tenantId } });
    if (!agr) throw new NotFoundException('Convênio não encontrado');
    return agr;
  }
}
