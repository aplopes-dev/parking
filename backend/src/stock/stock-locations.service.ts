import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  buildPaginatedMeta,
  resolvePagination,
} from '../common/dto/pagination-query.dto';
import { StockLocation } from './entities/stock-location.entity';
import { CreateStockLocationDto, UpdateStockLocationDto } from './dto/stock.dto';
import {
  StockLocationListQueryDto,
  StockLocationSortField,
  STOCK_LOCATION_SORT_FIELDS,
} from './dto/stock-location-list-query.dto';

const DEFAULT_SORT: StockLocationSortField = 'sortOrder';

@Injectable()
export class StockLocationsService {
  constructor(
    @InjectRepository(StockLocation)
    private readonly repository: Repository<StockLocation>,
  ) {}

  private resolveSortField(sortBy?: string): StockLocationSortField {
    if (sortBy && STOCK_LOCATION_SORT_FIELDS.includes(sortBy as StockLocationSortField)) {
      return sortBy as StockLocationSortField;
    }
    return DEFAULT_SORT;
  }

  async findAllPaginated(tenantId: string, query: StockLocationListQueryDto) {
    const { page, limit, skip, sortOrder } = resolvePagination(query);
    const sortBy = this.resolveSortField(query.sortBy);

    const qb = this.repository
      .createQueryBuilder('loc')
      .where('loc.tenant_id = :tenantId', { tenantId });

    const total = await qb.getCount();

    qb.orderBy(`loc.${sortBy}`, sortOrder);
    if (sortBy !== 'sortOrder') {
      qb.addOrderBy('loc.sortOrder', 'ASC');
    }
    if (sortBy !== 'name') {
      qb.addOrderBy('loc.name', 'ASC');
    }

    const data = await qb.skip(skip).take(limit).getMany();

    const [activeCount, inactiveCount] = await Promise.all([
      this.repository.count({ where: { tenantId, active: true } }),
      this.repository.count({ where: { tenantId, active: false } }),
    ]);

    const result = buildPaginatedMeta(data, total, page, limit, sortBy, sortOrder);
    return {
      ...result,
      meta: {
        ...result.meta,
        counts: {
          active: activeCount,
          inactive: inactiveCount,
        },
      },
    };
  }

  findAll(tenantId: string): Promise<StockLocation[]> {
    return this.repository.find({
      where: { tenantId },
      order: { sortOrder: 'ASC', isDefault: 'DESC', name: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<StockLocation> {
    const location = await this.repository.findOne({ where: { id, tenantId } });
    if (!location) {
      throw new NotFoundException('Local de estoque não encontrado');
    }
    return location;
  }

  async create(dto: CreateStockLocationDto, tenantId: string): Promise<StockLocation> {
    await this.ensureNameAvailable(dto.name, tenantId);
    if (dto.isDefault) {
      await this.clearDefault(tenantId);
    }
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
      description: dto.description?.trim() ?? null,
      isDefault: dto.isDefault ?? false,
      active: dto.active ?? true,
      sortOrder,
    });
    return this.repository.save(entity);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateStockLocationDto,
  ): Promise<StockLocation> {
    const location = await this.findOne(id, tenantId);
    if (dto.name && dto.name !== location.name) {
      await this.ensureNameAvailable(dto.name, tenantId, id);
      location.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      location.description = dto.description?.trim() ?? null;
    }
    if (dto.isDefault === true) {
      await this.clearDefault(tenantId, id);
      location.isDefault = true;
    } else if (dto.isDefault === false) {
      location.isDefault = false;
    }
    if (dto.active !== undefined) {
      location.active = dto.active;
    }
    if (dto.sortOrder !== undefined) {
      location.sortOrder = dto.sortOrder;
    }
    return this.repository.save(location);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const location = await this.findOne(id, tenantId);
    await this.repository.remove(location);
  }

  async getDefaultLocation(tenantId: string): Promise<StockLocation | null> {
    return this.repository.findOne({
      where: { tenantId, isDefault: true, active: true },
    });
  }

  private async clearDefault(tenantId: string, exceptId?: string): Promise<void> {
    const locations = await this.repository.find({ where: { tenantId, isDefault: true } });
    for (const loc of locations) {
      if (loc.id !== exceptId) {
        loc.isDefault = false;
        await this.repository.save(loc);
      }
    }
  }

  private async ensureNameAvailable(
    name: string,
    tenantId: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.repository.findOne({
      where: { tenantId, name: name.trim() },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Já existe um local com este nome');
    }
  }
}
