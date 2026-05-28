import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../pdv/entities/order.entity';
import { OrderItem } from '../pdv/entities/order-item.entity';
import { WaiterTableNotification } from '../mobile/entities/waiter-notification.entity';
import { ProductionSettings } from './entities/production-settings.entity';
import { ProductionController } from './production.controller';
import { ProductionService } from './production.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductionSettings,
      WaiterTableNotification,
      OrderItem,
      Order,
    ]),
  ],
  controllers: [ProductionController],
  providers: [ProductionService],
  exports: [ProductionService],
})
export class ProductionModule {}
