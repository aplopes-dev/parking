import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../pdv/entities/order.entity';
import {
  DeliveryAssignment,
  DeliveryCourier,
  DeliveryRoute,
} from './entities/delivery.entities';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeliveryCourier, DeliveryRoute, DeliveryAssignment, Order]),
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
