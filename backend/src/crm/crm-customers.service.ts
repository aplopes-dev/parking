import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { CrmCustomerProfile } from './entities/crm-customer-profile.entity';
import { CrmInteraction } from './entities/crm-interaction.entity';
import { CrmLoyaltyAccount } from './entities/crm-loyalty-account.entity';
import { CrmSegment, CrmInteractionType } from './entities/crm.enums';
import {
  CRM_CUSTOMER_SORT_FIELDS,
  CrmCustomersQueryDto,
  CrmCustomerSortField,
  CreateCrmInteractionDto,
  UpdateCrmProfileDto,
} from './dto/crm.dto';
import {
  buildPaginatedMeta,
  resolvePagination,
} from '../common/dto/pagination-query.dto';

export type CrmCustomerListItem = Customer & {
  profile: CrmCustomerProfile | null;
  loyaltyAccount: CrmLoyaltyAccount | null;
  interactionsCount: number;
};

@Injectable()
export class CrmCustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(CrmCustomerProfile)
    private readonly profileRepository: Repository<CrmCustomerProfile>,
    @InjectRepository(CrmInteraction)
    private readonly interactionRepository: Repository<CrmInteraction>,
    @InjectRepository(CrmLoyaltyAccount)
    private readonly loyaltyAccountRepository: Repository<CrmLoyaltyAccount>,
  ) {}

  async findAll(tenantId: string, query: CrmCustomersQueryDto) {
    const { page, limit, skip, sortOrder } = resolvePagination(query);
    const sortBy: CrmCustomerSortField = CRM_CUSTOMER_SORT_FIELDS.includes(
      query.sortBy as CrmCustomerSortField,
    )
      ? (query.sortBy as CrmCustomerSortField)
      : 'name';

    const qb = this.customerRepository
      .createQueryBuilder('customer')
      .leftJoin(CrmCustomerProfile, 'profile', 'profile.customerId = customer.id AND profile.tenantId = :tenantId', { tenantId })
      .where('customer.tenantId = :tenantId', { tenantId });

    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        '(customer.name ILIKE :term OR customer.email ILIKE :term OR customer.phone ILIKE :term OR customer.document ILIKE :term)',
        { term },
      );
    }
    if (query.segment) {
      qb.andWhere('COALESCE(profile.segment, :defaultSegment) = :segment', {
        segment: query.segment,
        defaultSegment: CrmSegment.NOVO,
      });
    }

    const sortColumns: Record<CrmCustomerSortField, string> = {
      name: 'customer.name',
      email: 'customer.email',
      phone: 'customer.phone',
      createdAt: 'customer.createdAt',
      segment: 'profile.segment',
    };

    const total = await qb.getCount();
    qb.orderBy(sortColumns[sortBy], sortOrder)
      .addOrderBy('customer.name', 'ASC')
      .skip(skip)
      .take(limit);

    const customers = await qb.getMany();
    const customerIds = customers.map((c) => c.id);

    if (!customerIds.length) return buildPaginatedMeta([], total, page, limit, sortBy, sortOrder);

    const profiles = await this.profileRepository.find({
      where: customerIds.map((id) => ({ tenantId, customerId: id })),
    });
    const profileMap = new Map(profiles.map((p) => [p.customerId, p]));

    const accounts = await this.loyaltyAccountRepository.find({
      where: customerIds.map((id) => ({ tenantId, customerId: id })),
      relations: ['program'],
    });
    const accountMap = new Map(accounts.map((a) => [a.customerId, a]));

    const interactionCounts = await this.interactionRepository
      .createQueryBuilder('i')
      .select('i.customerId', 'customerId')
      .addSelect('COUNT(*)', 'count')
      .where('i.tenantId = :tenantId', { tenantId })
      .andWhere('i.customerId IN (:...ids)', { ids: customerIds })
      .groupBy('i.customerId')
      .getRawMany<{ customerId: string; count: string }>();
    const countMap = new Map(interactionCounts.map((r) => [r.customerId, Number(r.count)]));

    const result: CrmCustomerListItem[] = customers.map((customer) => ({
      ...customer,
      profile: profileMap.get(customer.id) ?? null,
      loyaltyAccount: accountMap.get(customer.id) ?? null,
      interactionsCount: countMap.get(customer.id) ?? 0,
    }));
    return buildPaginatedMeta(result, total, page, limit, sortBy, sortOrder);
  }

  async findOne(tenantId: string, customerId: string) {
    const customer = await this.customerRepository.findOne({ where: { id: customerId, tenantId } });
    if (!customer) throw new NotFoundException('Cliente não encontrado');

    const profile = await this.getOrCreateProfile(tenantId, customerId);
    const interactions = await this.interactionRepository.find({
      where: { tenantId, customerId },
      relations: ['createdByUser'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
    const loyaltyAccounts = await this.loyaltyAccountRepository.find({
      where: { tenantId, customerId },
      relations: ['program'],
    });

    return { customer, profile, interactions, loyaltyAccounts };
  }

  async updateProfile(
    tenantId: string,
    customerId: string,
    dto: UpdateCrmProfileDto,
  ): Promise<CrmCustomerProfile> {
    const profile = await this.getOrCreateProfile(tenantId, customerId);
    if (dto.segment !== undefined) profile.segment = dto.segment;
    if (dto.tags !== undefined) profile.tags = dto.tags;
    if (dto.preferredChannel !== undefined) profile.preferredChannel = dto.preferredChannel ?? null;
    if (dto.marketingOptIn !== undefined) profile.marketingOptIn = dto.marketingOptIn;
    if (dto.crmNotes !== undefined) profile.crmNotes = dto.crmNotes?.trim() ?? null;
    return this.profileRepository.save(profile);
  }

  async addInteraction(
    dto: CreateCrmInteractionDto,
    tenantId: string,
    userId: string,
  ): Promise<CrmInteraction> {
    const customer = await this.customerRepository.findOne({
      where: { id: dto.customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado');

    const interaction = await this.interactionRepository.save(
      this.interactionRepository.create({
        tenantId,
        customerId: dto.customerId,
        type: dto.type,
        subject: dto.subject.trim(),
        notes: dto.notes?.trim() ?? null,
        createdByUserId: userId,
      }),
    );

    const profile = await this.getOrCreateProfile(tenantId, dto.customerId);
    profile.lastContactAt = new Date();
    await this.profileRepository.save(profile);

    return this.interactionRepository.findOne({
      where: { id: interaction.id },
      relations: ['createdByUser', 'customer'],
    }) as Promise<CrmInteraction>;
  }

  private async getOrCreateProfile(
    tenantId: string,
    customerId: string,
  ): Promise<CrmCustomerProfile> {
    let profile = await this.profileRepository.findOne({ where: { tenantId, customerId } });
    if (!profile) {
      profile = await this.profileRepository.save(
        this.profileRepository.create({
          tenantId,
          customerId,
          segment: CrmSegment.NOVO,
          marketingOptIn: true,
        }),
      );
    }
    return profile;
  }

  async mergeProfileTags(
    tenantId: string,
    customerId: string,
    add: string[],
    remove: string[] = [],
  ): Promise<CrmCustomerProfile> {
    const profile = await this.getOrCreateProfile(tenantId, customerId);
    const current = (profile.tags ?? '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const addSet = new Set(add.map((t) => t.trim().toLowerCase()).filter(Boolean));
    const removeSet = new Set(remove.map((t) => t.trim().toLowerCase()).filter(Boolean));
    const merged = [...new Set([...current.filter((t) => !removeSet.has(t)), ...addSet])];
    profile.tags = merged.length ? merged.join(', ') : null;
    return this.profileRepository.save(profile);
  }

  async recordParkingEvent(
    tenantId: string,
    customerId: string,
    userId: string | null,
    subject: string,
    notes?: string,
  ): Promise<void> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId, tenantId },
    });
    if (!customer) return;

    await this.interactionRepository.save(
      this.interactionRepository.create({
        tenantId,
        customerId,
        type: CrmInteractionType.OBSERVACAO,
        subject: subject.trim(),
        notes: notes?.trim() ?? null,
        createdByUserId: userId,
      }),
    );

    const profile = await this.getOrCreateProfile(tenantId, customerId);
    profile.lastContactAt = new Date();
    await this.profileRepository.save(profile);
  }
}
