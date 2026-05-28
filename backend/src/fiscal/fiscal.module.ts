import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../pdv/entities/order.entity';
import { OrderItem } from '../pdv/entities/order-item.entity';
import { MinioModule } from '../minio/minio.module';
import {
  FiscalAccountant,
  FiscalInvoice,
  FiscalNumberVoid,
  FiscalOrder,
  FiscalOrderItem,
  FiscalReturn,
  FiscalSettings,
} from './entities/fiscal.entities';
import { FiscalController } from './fiscal.controller';
import { FiscalService } from './fiscal.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FiscalSettings,
      FiscalOrder,
      FiscalOrderItem,
      FiscalReturn,
      FiscalInvoice,
      FiscalNumberVoid,
      FiscalAccountant,
      Order,
      OrderItem,
    ]),
    MinioModule,
  ],
  controllers: [FiscalController],
  providers: [FiscalService],
  exports: [FiscalService],
})
export class FiscalModule {}
