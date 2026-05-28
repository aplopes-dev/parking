import { Module, forwardRef } from '@nestjs/common';
import { ParkingModule } from '../parking/parking.module';
import { MobileRealtimeModule } from './mobile-realtime.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RestaurantTable } from './entities/restaurant-table.entity';
import { ProductGroup } from '../product-groups/entities/product-group.entity';
import { OrderItem } from '../pdv/entities/order-item.entity';
import { Order } from '../pdv/entities/order.entity';
import { WaiterTableNotification } from './entities/waiter-notification.entity';
import { MenuModule } from '../menu/menu.module';
import { PdvModule } from '../pdv/pdv.module';
import { CrmModule } from '../crm/crm.module';
import { MobileService } from './mobile.service';
import { MobileController } from './mobile.controller';
import { MobileRealtimeService } from './mobile-realtime.service';
import { MobileRealtimeGateway } from './mobile-realtime.gateway';
import { WaiterNotificationService } from './waiter-notification.service';
import { MobileParkingService } from './mobile-parking.service';
import { MobileParkingController } from './mobile-parking.controller';

@Module({
  imports: [
    forwardRef(() => ParkingModule),
    MobileRealtimeModule,
    TypeOrmModule.forFeature([
      RestaurantTable,
      ProductGroup,
      OrderItem,
      Order,
      WaiterTableNotification,
    ]),
    MenuModule,
    forwardRef(() => PdvModule),
    CrmModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'your-secret-key',
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MobileController, MobileParkingController],
  providers: [
    MobileService,
    MobileParkingService,
    MobileRealtimeGateway,
    WaiterNotificationService,
  ],
  exports: [MobileService, MobileParkingService, MobileRealtimeModule],
})
export class MobileModule {}
