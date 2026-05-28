import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TechnicalSheet } from './entities/technical-sheet.entity';
import { TechnicalSheetItem } from './entities/technical-sheet-item.entity';
import { Product } from '../products/entities/product.entity';
import {
  CreateTechnicalSheetDto,
  TechnicalSheetItemDto,
  UpdateTechnicalSheetDto,
} from './dto/stock.dto';

@Injectable()
export class TechnicalSheetsService {
  constructor(
    @InjectRepository(TechnicalSheet)
    private readonly repository: Repository<TechnicalSheet>,
    @InjectRepository(TechnicalSheetItem)
    private readonly itemsRepository: Repository<TechnicalSheetItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  findAll(tenantId: string): Promise<TechnicalSheet[]> {
    return this.repository.find({
      where: { tenantId },
      relations: ['product', 'items', 'items.ingredientProduct'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<TechnicalSheet> {
    const sheet = await this.repository.findOne({
      where: { id, tenantId },
      relations: ['product', 'items', 'items.ingredientProduct'],
    });
    if (!sheet) {
      throw new NotFoundException('Ficha técnica não encontrada');
    }
    if (sheet.items) {
      sheet.items.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return sheet;
  }

  async create(dto: CreateTechnicalSheetDto, tenantId: string): Promise<TechnicalSheet> {
    await this.ensureProduct(dto.productId, tenantId);
    const existing = await this.repository.findOne({
      where: { tenantId, productId: dto.productId },
    });
    if (existing) {
      throw new ConflictException('Este produto já possui ficha técnica');
    }
    await this.validateItems(dto.items, dto.productId, tenantId);

    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const last = await this.repository.findOne({
        where: { tenantId },
        order: { sortOrder: 'DESC' },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const sheet = await this.repository.save(
      this.repository.create({
        tenantId,
        productId: dto.productId,
        name: dto.name.trim(),
        yieldQuantity: dto.yieldQuantity.toFixed(4),
        notes: dto.notes?.trim() ?? null,
        active: dto.active ?? true,
        sortOrder,
      }),
    );

    await this.saveItems(sheet.id, dto.items);
    return this.findOne(sheet.id, tenantId);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateTechnicalSheetDto,
  ): Promise<TechnicalSheet> {
    const sheet = await this.findOne(id, tenantId);
    if (dto.name) sheet.name = dto.name.trim();
    if (dto.yieldQuantity !== undefined) {
      sheet.yieldQuantity = dto.yieldQuantity.toFixed(4);
    }
    if (dto.notes !== undefined) sheet.notes = dto.notes?.trim() ?? null;
    if (dto.active !== undefined) sheet.active = dto.active;
    if (dto.sortOrder !== undefined) sheet.sortOrder = dto.sortOrder;
    await this.repository.save(sheet);

    if (dto.items) {
      await this.validateItems(dto.items, sheet.productId, tenantId);
      await this.itemsRepository.delete({ sheetId: sheet.id });
      await this.saveItems(sheet.id, dto.items);
    }

    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const sheet = await this.findOne(id, tenantId);
    await this.repository.remove(sheet);
  }

  private async saveItems(sheetId: string, items: TechnicalSheetItemDto[]): Promise<void> {
    const entities = items.map((item, index) =>
      this.itemsRepository.create({
        sheetId,
        ingredientProductId: item.ingredientProductId,
        quantity: item.quantity.toFixed(4),
        unit: item.unit,
        sortOrder: item.sortOrder ?? index,
      }),
    );
    await this.itemsRepository.save(entities);
  }

  private async validateItems(
    items: TechnicalSheetItemDto[],
    outputProductId: string,
    tenantId: string,
  ): Promise<void> {
    if (!items.length) {
      throw new ConflictException('Informe ao menos um insumo na ficha técnica');
    }
    for (const item of items) {
      if (item.ingredientProductId === outputProductId) {
        throw new ConflictException('O produto acabado não pode ser insumo de si mesmo');
      }
      await this.ensureProduct(item.ingredientProductId, tenantId);
    }
  }

  private async ensureProduct(productId: string, tenantId: string): Promise<void> {
    const product = await this.productRepository.findOne({ where: { id: productId, tenantId } });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
  }
}
