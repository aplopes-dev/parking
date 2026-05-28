import { DataSource } from 'typeorm';
import { User } from './users/entities/user.entity';
import { Tenant } from './tenants/entities/tenant.entity';
import { ProductGroup } from './product-groups/entities/product-group.entity';
import { Product } from './products/entities/product.entity';
import { Customer } from './customers/entities/customer.entity';
import { StockLocation } from './stock/entities/stock-location.entity';
import { StockBalance } from './stock/entities/stock-balance.entity';
import { StockMovement } from './stock/entities/stock-movement.entity';
import { StockMinimum } from './stock/entities/stock-minimum.entity';
import { TechnicalSheet } from './stock/entities/technical-sheet.entity';
import { TechnicalSheetItem } from './stock/entities/technical-sheet-item.entity';
import { RecipeProduction } from './stock/entities/recipe-production.entity';
import { CrmCustomerProfile } from './crm/entities/crm-customer-profile.entity';
import { CrmInteraction } from './crm/entities/crm-interaction.entity';
import { CrmCampaign } from './crm/entities/crm-campaign.entity';
import { CrmCampaignProduct } from './crm/entities/crm-campaign-product.entity';
import { CrmLoyaltyProgram } from './crm/entities/crm-loyalty-program.entity';
import { CrmLoyaltyAccount } from './crm/entities/crm-loyalty-account.entity';
import { CrmLoyaltyTransaction } from './crm/entities/crm-loyalty-transaction.entity';
import { MenuSettings } from './menu/entities/menu-settings.entity';
import { MenuProduct } from './menu/entities/menu-product.entity';
import { Order } from './pdv/entities/order.entity';
import { OrderItem } from './pdv/entities/order-item.entity';
import { OrderPayment } from './pdv/entities/order-payment.entity';
import { OrderLog } from './pdv/entities/order-log.entity';
import { BillSplit } from './pdv/entities/bill-split.entity';
import { Comanda } from './pdv/entities/comanda.entity';
import { PdvSettings } from './pdv/entities/pdv-settings.entity';
import { RestaurantTable } from './mobile/entities/restaurant-table.entity';
import { PaymentSettings } from './payments/entities/payment-settings.entity';
import { PaymentSplitReceiver } from './payments/entities/payment-split-receiver.entity';
import { PagbankTransaction } from './payments/entities/pagbank-transaction.entity';
import { PagbankConnectAccount } from './payments/entities/pagbank-connect-account.entity';
import { PagbankRecurringPlan } from './payments/entities/pagbank-recurring-plan.entity';
import { PagbankSubscription } from './payments/entities/pagbank-subscription.entity';
import { PagbankTransfer } from './payments/entities/pagbank-transfer.entity';
import { PagbankRegisteredAccount } from './payments/entities/pagbank-registered-account.entity';
import {
  FinanceAccount,
  FinanceCategory,
  FinanceSource,
  FinanceTag,
  FinanceTransaction,
} from './finance/entities/finance.entities';
import {
  FinanceBankStatementLine,
  FinanceBill,
  FinanceCardReceivable,
  FinanceCashSession,
  FinanceDailyReconciliation,
  FinanceEmployeeAdvance,
  FinancePayrollLine,
  FinancePayrollRun,
  FinancePrepaidMovement,
  FinancePrepaidWallet,
  FinanceReceipt,
  FinanceRecurringRule,
  FinanceTransfer,
} from './finance/entities/finance-extended.entities';
import {
  FiscalAccountant,
  FiscalInvoice,
  FiscalNumberVoid,
  FiscalOrder,
  FiscalOrderItem,
  FiscalReturn,
  FiscalSettings,
} from './fiscal/entities/fiscal.entities';
import {
  AnalyticsKpiTarget,
  AnalyticsOnlineAccessLog,
} from './analytics/entities/analytics.entities';
import { ProductionSettings } from './production/entities/production-settings.entity';
import {
  DeliveryAssignment,
  DeliveryCourier,
  DeliveryRoute,
} from './delivery/entities/delivery.entities';
import { StoreGroup } from './multistore/entities/store-group.entity';
import { ParkingFacility } from './parking/entities/parking-facility.entity';
import { ParkingSpot } from './parking/entities/parking-spot.entity';
import { ParkingSession } from './parking/entities/parking-session.entity';
import { ParkingTariff } from './parking/entities/parking-tariff.entity';
import { ParkingSubscription } from './parking/entities/parking-subscription.entity';
import { ParkingSubscriptionVehicle } from './parking/entities/parking-subscription-vehicle.entity';
import { ParkingAgreement } from './parking/entities/parking-agreement.entity';
import { ParkingAgreementVehicle } from './parking/entities/parking-agreement-vehicle.entity';
import { ParkingValetTicket } from './parking/entities/parking-valet-ticket.entity';
import { ParkingAccessDevice } from './parking/entities/parking-access-device.entity';
import { ParkingAccessEvent } from './parking/entities/parking-access-event.entity';
import { ParkingGateCommand } from './parking/entities/parking-gate-command.entity';
import { ParkingVehicle } from './parking/entities/parking-vehicle.entity';
import { ParkingSubscriptionBill } from './parking/entities/parking-subscription-bill.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://food_user:food_pass@localhost:5432/food_db',
  entities: [
    Tenant,
    User,
    ProductGroup,
    Product,
    Customer,
    StockLocation,
    StockBalance,
    StockMovement,
    StockMinimum,
    TechnicalSheet,
    TechnicalSheetItem,
    RecipeProduction,
    CrmCustomerProfile,
    CrmInteraction,
    CrmCampaign,
    CrmCampaignProduct,
    CrmLoyaltyProgram,
    CrmLoyaltyAccount,
    CrmLoyaltyTransaction,
    MenuSettings,
    MenuProduct,
    Order,
    OrderItem,
    OrderPayment,
    OrderLog,
    BillSplit,
    Comanda,
    PdvSettings,
    RestaurantTable,
    PaymentSettings,
    PaymentSplitReceiver,
    PagbankTransaction,
    PagbankConnectAccount,
    PagbankRecurringPlan,
    PagbankSubscription,
    PagbankTransfer,
    PagbankRegisteredAccount,
    FinanceAccount,
    FinanceSource,
    FinanceCategory,
    FinanceTag,
    FinanceTransaction,
    FinanceBill,
    FinanceTransfer,
    FinanceRecurringRule,
    FinanceEmployeeAdvance,
    FinancePayrollRun,
    FinancePayrollLine,
    FinanceCashSession,
    FinanceDailyReconciliation,
    FinanceCardReceivable,
    FinanceBankStatementLine,
    FinancePrepaidWallet,
    FinancePrepaidMovement,
    FinanceReceipt,
    FiscalSettings,
  FiscalOrder,
  FiscalOrderItem,
  FiscalInvoice,
  FiscalReturn,
  FiscalNumberVoid,
    FiscalAccountant,
    AnalyticsOnlineAccessLog,
    AnalyticsKpiTarget,
    ProductionSettings,
    DeliveryCourier,
    DeliveryRoute,
    DeliveryAssignment,
    StoreGroup,
    ParkingFacility,
    ParkingSpot,
    ParkingSession,
    ParkingTariff,
    ParkingSubscription,
    ParkingSubscriptionVehicle,
    ParkingAgreement,
    ParkingAgreementVehicle,
    ParkingValetTicket,
    ParkingAccessDevice,
    ParkingAccessEvent,
    ParkingGateCommand,
    ParkingVehicle,
    ParkingSubscriptionBill,
  ],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
