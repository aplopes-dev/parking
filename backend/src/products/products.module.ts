import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductGroup } from '../product-groups/entities/product-group.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductsPublicController } from './products-public.controller';
import { MinioModule } from '../minio/minio.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductGroup]), MinioModule],
  controllers: [ProductsController, ProductsPublicController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
