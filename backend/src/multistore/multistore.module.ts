import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Order } from '../pdv/entities/order.entity';
import { OrderPayment } from '../pdv/entities/order-payment.entity';
import { Product } from '../products/entities/product.entity';
import { StockBalance } from '../stock/entities/stock-balance.entity';
import { StockMinimum } from '../stock/entities/stock-minimum.entity';
import { FinanceTransaction } from '../finance/entities/finance.entities';
import { FinanceBill } from '../finance/entities/finance-extended.entities';
import { StoreGroup } from './entities/store-group.entity';
import { MultistoreController } from './multistore.controller';
import { MultistoreService } from './multistore.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StoreGroup,
      Tenant,
      User,
      Order,
      OrderPayment,
      Product,
      StockBalance,
      StockMinimum,
      FinanceTransaction,
      FinanceBill,
    ]),
    AuthModule,
  ],
  controllers: [MultistoreController],
  providers: [MultistoreService],
  exports: [MultistoreService],
})
export class MultistoreModule {}
