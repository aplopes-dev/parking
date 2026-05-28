import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { CrmCustomerProfile } from './entities/crm-customer-profile.entity';
import { CrmInteraction } from './entities/crm-interaction.entity';
import { CrmCampaign } from './entities/crm-campaign.entity';
import { CrmCampaignProduct } from './entities/crm-campaign-product.entity';
import { Product } from '../products/entities/product.entity';
import { CrmLoyaltyProgram } from './entities/crm-loyalty-program.entity';
import { CrmLoyaltyAccount } from './entities/crm-loyalty-account.entity';
import { CrmLoyaltyTransaction } from './entities/crm-loyalty-transaction.entity';
import { CrmCustomersService } from './crm-customers.service';
import { CrmCampaignsService } from './crm-campaigns.service';
import { CrmCampaignPricingService } from './crm-campaign-pricing.service';
import { CrmLoyaltyService } from './crm-loyalty.service';
import { CrmCustomersController } from './crm-customers.controller';
import { CrmCampaignsController } from './crm-campaigns.controller';
import { CrmLoyaltyController } from './crm-loyalty.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      CrmCustomerProfile,
      CrmInteraction,
      CrmCampaign,
      CrmCampaignProduct,
      Product,
      CrmLoyaltyProgram,
      CrmLoyaltyAccount,
      CrmLoyaltyTransaction,
    ]),
  ],
  controllers: [CrmCustomersController, CrmCampaignsController, CrmLoyaltyController],
  providers: [
    CrmCustomersService,
    CrmCampaignsService,
    CrmCampaignPricingService,
    CrmLoyaltyService,
  ],
  exports: [CrmCustomersService, CrmLoyaltyService, CrmCampaignPricingService],
})
export class CrmModule {}
