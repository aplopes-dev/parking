import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuSettings } from './entities/menu-settings.entity';
import { MenuProduct } from './entities/menu-product.entity';
import { Product } from '../products/entities/product.entity';
import { ProductGroup } from '../product-groups/entities/product-group.entity';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MenuSettings, MenuProduct, Product, ProductGroup])],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
