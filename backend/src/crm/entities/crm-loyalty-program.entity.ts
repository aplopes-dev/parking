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
import { Tenant } from '../../tenants/entities/tenant.entity';
import { CrmLoyaltyAccount } from './crm-loyalty-account.entity';

@Entity('crm_loyalty_programs')
export class CrmLoyaltyProgram {
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

  @Column({ name: 'points_per_real', type: 'decimal', precision: 10, scale: 4, default: 1 })
  pointsPerReal: string;

  @Column({ name: 'redeem_rate', type: 'decimal', precision: 10, scale: 4, default: 0.01 })
  redeemRate: string;

  @Column({ name: 'min_redeem_points', type: 'int', default: 100 })
  minRedeemPoints: number;

  @Column({ name: 'tier_silver_min', type: 'int', default: 500 })
  tierSilverMin: number;

  @Column({ name: 'tier_gold_min', type: 'int', default: 2000 })
  tierGoldMin: number;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => CrmLoyaltyAccount, (account) => account.program)
  accounts: CrmLoyaltyAccount[];
}
