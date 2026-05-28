import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { IsOptional, IsString } from 'class-validator';
import {
  PaginationQueryDto,
  buildPaginatedMeta,
  resolvePagination,
} from '../common/dto/pagination-query.dto';

export class CustomerListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly repository: Repository<Customer>,
  ) {}

  private resolveSortField(sortBy?: string): string {
    const allowed = ['name', 'email', 'phone', 'active', 'createdAt', 'sortOrder'];
    if (sortBy && allowed.includes(sortBy)) return sortBy;
    return 'sortOrder';
  }

  async findAll(tenantId: string, search?: string): Promise<Customer[]> {
    const qb = this.repository
      .createQueryBuilder('customer')
      .where('customer.tenant_id = :tenantId', { tenantId })
      .orderBy('customer.sort_order', 'ASC')
      .addOrderBy('customer.name', 'ASC');

    if (search?.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(customer.name) LIKE :term OR LOWER(customer.email) LIKE :term OR customer.phone LIKE :phone)`,
        { term, phone: `%${search.trim()}%` },
      );
    }

    return qb.getMany();
  }

  async findAllPaginated(tenantId: string, query: CustomerListQueryDto) {
    const { page, limit, skip, sortOrder: resolvedOrder } = resolvePagination(query);
    const sortBy = this.resolveSortField(query.sortBy);
    const sortOrder = query.sortOrder
      ? resolvedOrder
      : sortBy === 'sortOrder'
        ? 'ASC'
        : resolvedOrder;

    const qb = this.repository
      .createQueryBuilder('customer')
      .where('customer.tenant_id = :tenantId', { tenantId });

    if (query.search?.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(customer.name) LIKE :term OR LOWER(customer.email) LIKE :term OR customer.phone LIKE :phone OR customer.document LIKE :phone)`,
        { term, phone: `%${query.search.trim()}%` },
      );
    }

    const total = await qb.getCount();

    if (sortBy === 'sortOrder') {
      qb.orderBy('customer.sort_order', sortOrder);
      qb.addOrderBy('customer.name', 'ASC');
    } else {
      qb.orderBy(`customer.${sortBy}`, sortOrder);
      if (sortBy !== 'name') qb.addOrderBy('customer.name', 'ASC');
    }

    const data = await qb.skip(skip).take(limit).getMany();

    const result = buildPaginatedMeta(data, total, page, limit, sortBy, sortOrder);

    const active = await this.repository.count({ where: { tenantId, active: true } });
    const inactive = await this.repository.count({ where: { tenantId, active: false } });

    return {
      data: result.data,
      meta: { ...result.meta, counts: { active, inactive } },
    };
  }

  async findOne(id: string, tenantId: string): Promise<Customer> {
    const customer = await this.repository.findOne({ where: { id, tenantId } });
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }
    return customer;
  }

  async create(dto: CreateCustomerDto, tenantId: string): Promise<Customer> {
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const last = await this.repository.findOne({
        where: { tenantId },
        order: { sortOrder: 'DESC' },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const entity = this.repository.create({
      tenantId,
      name: dto.name.trim(),
      email: dto.email?.trim().toLowerCase() ?? null,
      phone: dto.phone?.trim() ?? null,
      document: dto.document?.trim() ?? null,
      birthDate: dto.birthDate ?? null,
      address: dto.address?.trim() ?? null,
      city: dto.city?.trim() ?? null,
      state: dto.state?.trim().toUpperCase() ?? null,
      zipCode: dto.zipCode?.trim() ?? null,
      allergyNotes: dto.allergyNotes?.trim() ?? null,
      notes: dto.notes?.trim() ?? null,
      active: dto.active ?? true,
      sortOrder,
    });
    return this.repository.save(entity);
  }

  async update(id: string, tenantId: string, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id, tenantId);

    if (dto.name !== undefined) customer.name = dto.name.trim();
    if (dto.email !== undefined) customer.email = dto.email?.trim().toLowerCase() ?? null;
    if (dto.phone !== undefined) customer.phone = dto.phone?.trim() ?? null;
    if (dto.document !== undefined) customer.document = dto.document?.trim() ?? null;
    if (dto.birthDate !== undefined) customer.birthDate = dto.birthDate ?? null;
    if (dto.address !== undefined) customer.address = dto.address?.trim() ?? null;
    if (dto.city !== undefined) customer.city = dto.city?.trim() ?? null;
    if (dto.state !== undefined) customer.state = dto.state?.trim().toUpperCase() ?? null;
    if (dto.zipCode !== undefined) customer.zipCode = dto.zipCode?.trim() ?? null;
    if (dto.allergyNotes !== undefined) {
      customer.allergyNotes = dto.allergyNotes?.trim() ?? null;
    }
    if (dto.notes !== undefined) customer.notes = dto.notes?.trim() ?? null;
    if (dto.active !== undefined) customer.active = dto.active;
    if (dto.sortOrder !== undefined) customer.sortOrder = dto.sortOrder;

    return this.repository.save(customer);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const customer = await this.findOne(id, tenantId);
    await this.repository.remove(customer);
  }
}
