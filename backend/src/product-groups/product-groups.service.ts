import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  buildPaginatedMeta,
  resolvePagination,
} from '../common/dto/pagination-query.dto';
import { ProductGroup } from './entities/product-group.entity';
import { CreateProductGroupDto, UpdateProductGroupDto } from './dto/product-group.dto';
import {
  ProductGroupListQueryDto,
  ProductGroupSortField,
  PRODUCT_GROUP_SORT_FIELDS,
} from './dto/product-group-list-query.dto';

const DEFAULT_SORT: ProductGroupSortField = 'sortOrder';

@Injectable()
export class ProductGroupsService {
  constructor(
    @InjectRepository(ProductGroup)
    private readonly repository: Repository<ProductGroup>,
  ) {}

  private resolveSortField(sortBy?: string): ProductGroupSortField {
    if (sortBy && PRODUCT_GROUP_SORT_FIELDS.includes(sortBy as ProductGroupSortField)) {
      return sortBy as ProductGroupSortField;
    }
    return DEFAULT_SORT;
  }

  async findAllPaginated(tenantId: string, query: ProductGroupListQueryDto) {
    const { page, limit, skip, sortOrder } = resolvePagination(query);
    const sortBy = this.resolveSortField(query.sortBy);

    const qb = this.repository
      .createQueryBuilder('g')
      .where('g.tenant_id = :tenantId', { tenantId });

    const total = await qb.getCount();

    qb.orderBy(`g.${sortBy}`, sortOrder);
    if (sortBy !== 'sortOrder') {
      qb.addOrderBy('g.sortOrder', 'ASC');
    }
    if (sortBy !== 'name') {
      qb.addOrderBy('g.name', 'ASC');
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

  /** Lista completa para selects (produtos, filtros). */
  async findAllOptions(tenantId: string): Promise<Pick<ProductGroup, 'id' | 'name' | 'sortOrder' | 'active'>[]> {
    return this.repository.find({
      where: { tenantId },
      select: ['id', 'name', 'sortOrder', 'active'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<ProductGroup> {
    const group = await this.repository.findOne({ where: { id, tenantId } });
    if (!group) {
      throw new NotFoundException('Grupo de produtos não encontrado');
    }
    return group;
  }

  async create(dto: CreateProductGroupDto, tenantId: string): Promise<ProductGroup> {
    await this.ensureNameAvailable(dto.name, tenantId);
    const entity = this.repository.create({
      tenantId,
      name: dto.name.trim(),
      description: dto.description?.trim() ?? null,
      sortOrder: dto.sortOrder ?? 0,
      active: dto.active ?? true,
    });
    return this.repository.save(entity);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateProductGroupDto,
  ): Promise<ProductGroup> {
    const group = await this.findOne(id, tenantId);
    if (dto.name && dto.name !== group.name) {
      await this.ensureNameAvailable(dto.name, tenantId, id);
      group.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      group.description = dto.description?.trim() ?? null;
    }
    if (dto.sortOrder !== undefined) {
      group.sortOrder = dto.sortOrder;
    }
    if (dto.active !== undefined) {
      group.active = dto.active;
    }
    return this.repository.save(group);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const group = await this.findOne(id, tenantId);
    try {
      await this.repository.remove(group);
    } catch {
      throw new BadRequestException(
        'Não foi possível excluir o grupo. Verifique se há produtos vinculados.',
      );
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
      throw new ConflictException('Já existe um grupo com este nome');
    }
  }
}
