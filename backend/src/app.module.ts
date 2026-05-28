import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MinioModule } from './minio/minio.module';
import { TenantsModule } from './tenants/tenants.module';
import { ProductGroupsModule } from './product-groups/product-groups.module';
import { ProductsModule } from './products/products.module';
import { CustomersModule } from './customers/customers.module';
import { StockModule } from './stock/stock.module';
import { CrmModule } from './crm/crm.module';
import { MenuModule } from './menu/menu.module';
import { PdvModule } from './pdv/pdv.module';
import { MobileModule } from './mobile/mobile.module';
import { PaymentsModule } from './payments/payments.module';
import { FinanceModule } from './finance/finance.module';
import { FiscalModule } from './fiscal/fiscal.module';
import { AnalyticsReportsModule } from './analytics/analytics-reports.module';
import { ProductionModule } from './production/production.module';
import { DeliveryModule } from './delivery/delivery.module';
import { MultistoreModule } from './multistore/multistore.module';
import { ParkingModule } from './parking/parking.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true',
      logging: process.env.NODE_ENV === 'development',
    }),
    TenantsModule,
    AuthModule,
    UsersModule,
    MinioModule,
    ProductGroupsModule,
    ProductsModule,
    CustomersModule,
    StockModule,
    CrmModule,
    MenuModule,
    PdvModule,
    MobileModule,
    PaymentsModule,
    FinanceModule,
    FiscalModule,
    AnalyticsReportsModule,
    ProductionModule,
    DeliveryModule,
    MultistoreModule,
    ParkingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
