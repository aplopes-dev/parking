import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RecipeProduction } from './entities/recipe-production.entity';
import { TechnicalSheet } from './entities/technical-sheet.entity';
import { CreateRecipeProductionDto } from './dto/stock.dto';
import { StockLedgerService } from './stock-ledger.service';
import { StockMovementType } from './entities/stock-movement.entity';

@Injectable()
export class RecipeProductionsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(RecipeProduction)
    private readonly repository: Repository<RecipeProduction>,
    @InjectRepository(TechnicalSheet)
    private readonly sheetsRepository: Repository<TechnicalSheet>,
    private readonly ledger: StockLedgerService,
  ) {}

  findAll(tenantId: string, limit = 50): Promise<RecipeProduction[]> {
    return this.repository.find({
      where: { tenantId },
      relations: ['sheet', 'sheet.product', 'location', 'createdByUser'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async create(
    dto: CreateRecipeProductionDto,
    tenantId: string,
    userId: string,
  ): Promise<RecipeProduction> {
    const sheet = await this.sheetsRepository.findOne({
      where: { id: dto.sheetId, tenantId, active: true },
      relations: ['product', 'items', 'items.ingredientProduct'],
    });
    if (!sheet || !sheet.items?.length) {
      throw new BadRequestException('Ficha técnica inválida ou sem insumos');
    }

    const yieldQty = parseFloat(sheet.yieldQuantity);
    if (yieldQty <= 0) {
      throw new BadRequestException('Rendimento da ficha técnica inválido');
    }

    const multiplier = dto.quantityProduced / yieldQty;

    return this.dataSource.transaction(async (manager) => {
      const production = await manager.save(
        manager.create(RecipeProduction, {
          tenantId,
          sheetId: sheet.id,
          locationId: dto.locationId,
          quantityProduced: dto.quantityProduced.toFixed(4),
          notes: dto.notes?.trim() ?? null,
          createdByUserId: userId,
        }),
      );

      for (const item of sheet.items) {
        const ingredientQty = parseFloat(item.quantity) * multiplier;
        await this.ledger.applyMovement(
          {
            tenantId,
            productId: item.ingredientProductId,
            locationId: dto.locationId,
            type: StockMovementType.PRODUCAO_SAIDA,
            quantity: ingredientQty,
            reason: `Produção: ${sheet.name}`,
            notes: dto.notes ?? null,
            referenceType: 'recipe_production',
            referenceId: production.id,
            createdByUserId: userId,
          },
          manager,
        );
      }

      await this.ledger.applyMovement(
        {
          tenantId,
          productId: sheet.productId,
          locationId: dto.locationId,
          type: StockMovementType.PRODUCAO_ENTRADA,
          quantity: dto.quantityProduced,
          reason: `Produção: ${sheet.name}`,
          notes: dto.notes ?? null,
          referenceType: 'recipe_production',
          referenceId: production.id,
          createdByUserId: userId,
        },
        manager,
      );

      return manager.findOne(RecipeProduction, {
        where: { id: production.id },
        relations: ['sheet', 'sheet.product', 'location', 'createdByUser'],
      }) as Promise<RecipeProduction>;
    });
  }
}
