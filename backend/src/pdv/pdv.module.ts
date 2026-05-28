import { Module, forwardRef } from '@nestjs/common';
import { MobileModule } from '../mobile/mobile.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderPayment } from './entities/order-payment.entity';
import { OrderLog } from './entities/order-log.entity';
import { BillSplit } from './entities/bill-split.entity';
import { Comanda } from './entities/comanda.entity';
import { PdvSettings } from './entities/pdv-settings.entity';
import { Product } from '../products/entities/product.entity';
import { RestaurantTable } from '../mobile/entities/restaurant-table.entity';
import { OrdersService } from './orders.service';
import { ComandasService } from './comandas.service';
import { PdvSettingsService } from './pdv-settings.service';
import { OrderLogsService } from './order-logs.service';
import { OrdersController } from './orders.controller';
import { ComandasController } from './comandas.controller';
import { PdvController } from './pdv.controller';
import { CrmModule } from '../crm/crm.module';

@Module({
  imports: [
    CrmModule,
    forwardRef(() => MobileModule),
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderPayment,
      OrderLog,
      BillSplit,
      Comanda,
      PdvSettings,
      Product,
      RestaurantTable,
    ]),
  ],
  controllers: [OrdersController, ComandasController, PdvController],
  providers: [OrdersService, ComandasService, PdvSettingsService, OrderLogsService],
  exports: [OrdersService, ComandasService, PdvSettingsService],
})
export class PdvModule {}
