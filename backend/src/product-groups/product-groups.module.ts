import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductGroup } from './entities/product-group.entity';
import { ProductGroupsService } from './product-groups.service';
import { ProductGroupsController } from './product-groups.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProductGroup])],
  controllers: [ProductGroupsController],
  providers: [ProductGroupsService],
  exports: [ProductGroupsService],
})
export class ProductGroupsModule {}
