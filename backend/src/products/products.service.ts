import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Product } from './entities/product.entity';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import {
  ProductListQueryDto,
  ProductSortField,
  PRODUCT_SORT_FIELDS,
} from './dto/product-list-query.dto';
import { ProductGroup } from '../product-groups/entities/product-group.entity';
import { MinioService } from '../minio/minio.service';
import { buildPaginatedMeta, resolvePagination } from '../common/dto/pagination-query.dto';

export interface UploadedProductPhoto {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repository: Repository<Product>,
    @InjectRepository(ProductGroup)
    private readonly groupsRepository: Repository<ProductGroup>,
    private readonly minioService: MinioService,
  ) {}

  async findAll(tenantId: string, groupId?: string): Promise<Product[]> {
    return this.repository.find({
      where: {
        tenantId,
        ...(groupId ? { groupId } : {}),
      },
      relations: ['group'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  private resolveSortField(sortBy?: string): ProductSortField {
    if (sortBy && PRODUCT_SORT_FIELDS.includes(sortBy as ProductSortField)) {
      return sortBy as ProductSortField;
    }
    return 'sortOrder';
  }

  async findAllPaginated(tenantId: string, query: ProductListQueryDto) {
    const { page, limit, skip, sortOrder } = resolvePagination(query);
    const sortBy = this.resolveSortField(query.sortBy);

    const qb = this.repository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.group', 'g')
      .where('p.tenant_id = :tenantId', { tenantId });

    if (query.activeOnly) {
      qb.andWhere('p.active = :active', { active: true });
    }

    if (query.groupId) {
      qb.andWhere('p.group_id = :groupId', { groupId: query.groupId });
    }

    if (query.search?.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(p.name) LIKE :term OR LOWER(p.sku) LIKE :term OR LOWER(g.name) LIKE :term)',
        { term },
      );
    }

    const total = await qb.getCount();

    if (sortBy === 'salePrice') {
      qb.orderBy('p.sale_price', sortOrder);
    } else {
      qb.orderBy(`p.${sortBy}`, sortOrder);
    }
    if (sortBy !== 'sortOrder') qb.addOrderBy('p.sortOrder', 'ASC');
    if (sortBy !== 'name') qb.addOrderBy('p.name', 'ASC');

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
        counts: { active: activeCount, inactive: inactiveCount },
      },
    };
  }

  async findOne(id: string, tenantId: string): Promise<Product> {
    const product = await this.repository.findOne({
      where: { id, tenantId },
      relations: ['group'],
    });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    return product;
  }

  async findOneWithPhoto(id: string): Promise<Product> {
    const product = await this.repository.findOne({
      where: { id },
      select: ['id', 'photoKey', 'photoMimeType', 'updatedAt'],
    });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    return product;
  }

  async create(
    dto: CreateProductDto,
    tenantId: string,
    photo?: UploadedProductPhoto,
  ): Promise<Product> {
    await this.ensureNameAvailable(dto.name, tenantId);
    if (dto.sku) {
      await this.ensureSkuAvailable(dto.sku, tenantId);
    }
    if (dto.groupId) {
      await this.ensureGroupInTenant(dto.groupId, tenantId);
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
      groupId: dto.groupId ?? null,
      description: dto.description?.trim() ?? null,
      sku: dto.sku?.trim() ?? null,
      costPrice: dto.costPrice.toFixed(2),
      salePrice: dto.salePrice.toFixed(2),
      unit: dto.unit,
      active: dto.active ?? true,
      sortOrder,
    });

    if (photo) {
      Object.assign(entity, await this.uploadPhoto(photo));
    }

    const saved = await this.repository.save(entity);
    return this.findOne(saved.id, tenantId);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateProductDto,
    photo?: UploadedProductPhoto,
  ): Promise<Product> {
    const product = await this.findOne(id, tenantId);

    if (dto.name && dto.name !== product.name) {
      await this.ensureNameAvailable(dto.name, tenantId, id);
      product.name = dto.name.trim();
    }
    if (dto.sku !== undefined) {
      const sku = dto.sku?.trim() ?? null;
      if (sku && sku !== product.sku) {
        await this.ensureSkuAvailable(sku, tenantId, id);
      }
      product.sku = sku;
    }
    if (dto.groupId !== undefined) {
      if (dto.groupId) {
        await this.ensureGroupInTenant(dto.groupId, tenantId);
      }
      product.groupId = dto.groupId;
    }
    if (dto.description !== undefined) {
      product.description = dto.description?.trim() ?? null;
    }
    if (dto.costPrice !== undefined) {
      product.costPrice = dto.costPrice.toFixed(2);
    }
    if (dto.salePrice !== undefined) {
      product.salePrice = dto.salePrice.toFixed(2);
    }
    if (dto.unit !== undefined) {
      product.unit = dto.unit;
    }
    if (dto.active !== undefined) {
      product.active = dto.active;
    }
    if (dto.sortOrder !== undefined) {
      product.sortOrder = dto.sortOrder;
    }

    if (photo) {
      if (product.photoKey) {
        await this.removePhotoFromStorage(product.photoKey);
      }
      Object.assign(product, await this.uploadPhoto(photo));
    }

    await this.repository.save(product);
    return this.findOne(id, tenantId);
  }

  async removePhoto(id: string, tenantId: string): Promise<Product> {
    const product = await this.findOne(id, tenantId);
    if (product.photoKey) {
      await this.removePhotoFromStorage(product.photoKey);
      product.photoKey = null;
      product.photoMimeType = null;
      await this.repository.save(product);
    }
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const product = await this.findOne(id, tenantId);
    if (product.photoKey) {
      await this.removePhotoFromStorage(product.photoKey);
    }
    await this.repository.remove(product);
  }

  private async uploadPhoto(
    photo: UploadedProductPhoto,
  ): Promise<Pick<Product, 'photoKey' | 'photoMimeType'>> {
    this.validatePhoto(photo);

    const extension =
      extname(photo.originalname) ||
      this.getExtensionFromMimeType(photo.mimetype);
    const photoKey = `products/${randomUUID()}${extension}`;

    await this.minioService.uploadFile(photoKey, photo.buffer);

    return {
      photoKey,
      photoMimeType: photo.mimetype,
    };
  }

  private validatePhoto(photo: UploadedProductPhoto): void {
    const isImage = photo.mimetype?.startsWith('image/');
    if (!isImage) {
      throw new BadRequestException(
        'Envie uma imagem válida (JPEG, PNG ou WebP).',
      );
    }

    const maxSizeInBytes = 5 * 1024 * 1024;
    if (photo.size > maxSizeInBytes) {
      throw new BadRequestException('A foto deve ter no máximo 5 MB.');
    }
  }

  private getExtensionFromMimeType(mimeType?: string): string {
    switch (mimeType) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      default:
        return '';
    }
  }

  private async removePhotoFromStorage(photoKey: string): Promise<void> {
    try {
      await this.minioService.deleteFile(photoKey);
    } catch (error) {
      console.error('Erro ao remover foto do produto no MinIO:', error);
    }
  }

  private async ensureGroupInTenant(groupId: string, tenantId: string): Promise<void> {
    const group = await this.groupsRepository.findOne({ where: { id: groupId, tenantId } });
    if (!group) {
      throw new NotFoundException('Grupo de produtos não encontrado');
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
      throw new ConflictException('Já existe um produto com este nome');
    }
  }

  private async ensureSkuAvailable(
    sku: string,
    tenantId: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.repository.findOne({
      where: { tenantId, sku: sku.trim() },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Já existe um produto com este SKU/código');
    }
  }
}
