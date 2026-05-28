import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockLocation } from './entities/stock-location.entity';
import { StockBalance } from './entities/stock-balance.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { StockMinimum } from './entities/stock-minimum.entity';
import { TechnicalSheet } from './entities/technical-sheet.entity';
import { TechnicalSheetItem } from './entities/technical-sheet-item.entity';
import { RecipeProduction } from './entities/recipe-production.entity';
import { Product } from '../products/entities/product.entity';
import { StockLedgerService } from './stock-ledger.service';
import { StockLocationsService } from './stock-locations.service';
import { StockBalancesService } from './stock-balances.service';
import { StockMovementsService } from './stock-movements.service';
import { StockMinimumsService } from './stock-minimums.service';
import { TechnicalSheetsService } from './technical-sheets.service';
import { RecipeProductionsService } from './recipe-productions.service';
import { StockLocationsController } from './stock-locations.controller';
import { StockBalancesController } from './stock-balances.controller';
import { StockMovementsController } from './stock-movements.controller';
import { StockMinimumsController } from './stock-minimums.controller';
import { TechnicalSheetsController } from './technical-sheets.controller';
import { RecipeProductionsController } from './recipe-productions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StockLocation,
      StockBalance,
      StockMovement,
      StockMinimum,
      TechnicalSheet,
      TechnicalSheetItem,
      RecipeProduction,
      Product,
    ]),
  ],
  controllers: [
    StockLocationsController,
    StockBalancesController,
    StockMovementsController,
    StockMinimumsController,
    TechnicalSheetsController,
    RecipeProductionsController,
  ],
  providers: [
    StockLedgerService,
    StockLocationsService,
    StockBalancesService,
    StockMovementsService,
    StockMinimumsService,
    TechnicalSheetsService,
    RecipeProductionsService,
  ],
  exports: [StockLedgerService, StockLocationsService],
})
export class StockModule {}
