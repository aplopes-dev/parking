import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceModule } from '../finance/finance.module';
import { FinanceTransaction } from '../finance/entities/finance.entities';
import { Order } from '../pdv/entities/order.entity';
import { OrderItem } from '../pdv/entities/order-item.entity';
import { OrderPayment } from '../pdv/entities/order-payment.entity';
import { Product } from '../products/entities/product.entity';
import { StockBalance } from '../stock/entities/stock-balance.entity';
import { StockMinimum } from '../stock/entities/stock-minimum.entity';
import { StockMovement } from '../stock/entities/stock-movement.entity';
import { AnalyticsKpiTarget, AnalyticsOnlineAccessLog } from './entities/analytics.entities';
import { AnalyticsController } from './analytics.controller';
import { ReportsController } from './reports.controller';
import { AnalyticsReportsService } from './analytics-reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderPayment,
      OrderItem,
      Product,
      StockBalance,
      StockMinimum,
      StockMovement,
      FinanceTransaction,
      AnalyticsOnlineAccessLog,
      AnalyticsKpiTarget,
    ]),
    FinanceModule,
  ],
  controllers: [AnalyticsController, ReportsController],
  providers: [AnalyticsReportsService],
  exports: [AnalyticsReportsService],
})
export class AnalyticsReportsModule {}
