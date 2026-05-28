import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Product, ProductUnit } from '../../products/entities/product.entity';
import { TechnicalSheet } from './technical-sheet.entity';

@Entity('technical_sheet_items')
@Unique(['sheetId', 'ingredientProductId'])
export class TechnicalSheetItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TechnicalSheet, (sheet) => sheet.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sheet_id' })
  sheet: TechnicalSheet;

  @Column({ name: 'sheet_id' })
  sheetId: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ingredient_product_id' })
  ingredientProduct: Product;

  @Column({ name: 'ingredient_product_id' })
  ingredientProductId: string;

  @Column({ type: 'decimal', precision: 14, scale: 4 })
  quantity: string;

  @Column({
    type: 'enum',
    enum: ProductUnit,
    default: ProductUnit.UN,
  })
  unit: ProductUnit;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
