import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockMinimum } from './entities/stock-minimum.entity';
import { StockBalance } from './entities/stock-balance.entity';
import { Product } from '../products/entities/product.entity';
import { StockLocation } from './entities/stock-location.entity';
import { CreateStockMinimumDto, UpdateStockMinimumDto } from './dto/stock.dto';

export type MinimumAlert = StockMinimum & {
  currentQuantity: number;
  belowMinimum: boolean;
};

@Injectable()
export class StockMinimumsService {
  constructor(
    @InjectRepository(StockMinimum)
    private readonly repository: Repository<StockMinimum>,
    @InjectRepository(StockBalance)
    private readonly balanceRepository: Repository<StockBalance>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(StockLocation)
    private readonly locationRepository: Repository<StockLocation>,
  ) {}

  findAll(tenantId: string): Promise<StockMinimum[]> {
    return this.repository.find({
      where: { tenantId },
      relations: ['product', 'location'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAlerts(tenantId: string): Promise<MinimumAlert[]> {
    const minimums = await this.repository.find({
      where: { tenantId, active: true },
      relations: ['product', 'location'],
    });

    const alerts: MinimumAlert[] = [];
    for (const minimum of minimums) {
      const minQty = parseFloat(minimum.minimumQuantity);
      let currentQuantity = 0;

      if (minimum.locationId) {
        const balance = await this.balanceRepository.findOne({
          where: {
            tenantId,
            productId: minimum.productId,
            locationId: minimum.locationId,
          },
        });
        currentQuantity = balance ? parseFloat(balance.quantity) : 0;
      } else {
        const balances = await this.balanceRepository.find({
          where: { tenantId, productId: minimum.productId },
        });
        currentQuantity = balances.reduce((sum, b) => sum + parseFloat(b.quantity), 0);
      }

      if (currentQuantity < minQty) {
        alerts.push(
          Object.assign(minimum, {
            currentQuantity,
            belowMinimum: true,
          }),
        );
      }
    }
    return alerts;
  }

  async findOne(id: string, tenantId: string): Promise<StockMinimum> {
    const minimum = await this.repository.findOne({
      where: { id, tenantId },
      relations: ['product', 'location'],
    });
    if (!minimum) {
      throw new NotFoundException('Estoque mínimo não encontrado');
    }
    return minimum;
  }

  async create(dto: CreateStockMinimumDto, tenantId: string): Promise<StockMinimum> {
    await this.ensureProduct(dto.productId, tenantId);
    if (dto.locationId) {
      await this.ensureLocation(dto.locationId, tenantId);
    }
    await this.ensureUnique(dto.productId, tenantId, dto.locationId ?? null);

    const entity = this.repository.create({
      tenantId,
      productId: dto.productId,
      locationId: dto.locationId ?? null,
      minimumQuantity: dto.minimumQuantity.toFixed(4),
      active: dto.active ?? true,
    });
    const saved = await this.repository.save(entity);
    return this.findOne(saved.id, tenantId);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateStockMinimumDto,
  ): Promise<StockMinimum> {
    const minimum = await this.findOne(id, tenantId);
    if (dto.minimumQuantity !== undefined) {
      minimum.minimumQuantity = dto.minimumQuantity.toFixed(4);
    }
    if (dto.active !== undefined) {
      minimum.active = dto.active;
    }
    await this.repository.save(minimum);
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const minimum = await this.findOne(id, tenantId);
    await this.repository.remove(minimum);
  }

  private async ensureProduct(productId: string, tenantId: string): Promise<void> {
    const product = await this.productRepository.findOne({ where: { id: productId, tenantId } });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
  }

  private async ensureLocation(locationId: string, tenantId: string): Promise<void> {
    const location = await this.locationRepository.findOne({
      where: { id: locationId, tenantId },
    });
    if (!location) {
      throw new NotFoundException('Local de estoque não encontrado');
    }
  }

  private async ensureUnique(
    productId: string,
    tenantId: string,
    locationId: string | null,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.repository.findOne({
      where: { tenantId, productId, locationId: locationId ?? undefined },
    });
    if (!locationId) {
      const global = await this.repository
        .createQueryBuilder('m')
        .where('m.tenantId = :tenantId', { tenantId })
        .andWhere('m.productId = :productId', { productId })
        .andWhere('m.locationId IS NULL')
        .getOne();
      if (global && global.id !== excludeId) {
        throw new ConflictException('Já existe estoque mínimo global para este produto');
      }
      return;
    }
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Já existe estoque mínimo para este produto e local');
    }
  }
}
