import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CrmCampaignProduct } from './crm-campaign-product.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import {
  CrmCampaignChannel,
  CrmCampaignStatus,
  CrmCampaignType,
  CrmDiscountType,
  CrmSegment,
} from './crm.enums';

@Entity('crm_campaigns')
export class CrmCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: CrmCampaignType, default: CrmCampaignType.PROMOCAO })
  type: CrmCampaignType;

  @Column({ type: 'enum', enum: CrmCampaignStatus, default: CrmCampaignStatus.RASCUNHO })
  status: CrmCampaignStatus;

  @Column({ type: 'enum', enum: CrmCampaignChannel, default: CrmCampaignChannel.GERAL })
  channel: CrmCampaignChannel;

  @Column({
    name: 'discount_type',
    type: 'enum',
    enum: CrmDiscountType,
    default: CrmDiscountType.NENHUM,
  })
  discountType: CrmDiscountType;

  @Column({ name: 'discount_value', type: 'decimal', precision: 14, scale: 2, default: 0 })
  discountValue: string;

  @Column({
    name: 'audience_segment',
    type: 'enum',
    enum: CrmSegment,
    nullable: true,
  })
  audienceSegment: CrmSegment | null;

  @Column({ name: 'starts_at', type: 'timestamp', nullable: true })
  startsAt: Date | null;

  @Column({ name: 'ends_at', type: 'timestamp', nullable: true })
  endsAt: Date | null;

  @OneToMany(() => CrmCampaignProduct, (cp) => cp.campaign)
  campaignProducts: CrmCampaignProduct[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
