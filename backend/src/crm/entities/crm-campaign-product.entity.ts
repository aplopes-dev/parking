import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { CrmCampaign } from './crm-campaign.entity';

@Entity('crm_campaign_products')
@Unique('UQ_crm_campaign_products_campaign_product', ['campaignId', 'productId'])
export class CrmCampaignProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'campaign_id' })
  campaignId: string;

  @ManyToOne(() => CrmCampaign, (c) => c.campaignProducts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: CrmCampaign;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @CreateDateColumn()
  createdAt: Date;
}
