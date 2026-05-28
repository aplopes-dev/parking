import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PdvModule } from '../pdv/pdv.module';
import { ParkingModule } from '../parking/parking.module';
import { PaymentSettings } from './entities/payment-settings.entity';
import { PaymentSplitReceiver } from './entities/payment-split-receiver.entity';
import { PagbankTransaction } from './entities/pagbank-transaction.entity';
import { Order } from '../pdv/entities/order.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PagbankHttpClient } from './pagbank-http.client';
import { PagbankFlowGuard } from './pagbank-flow.guard';
import { PagbankOrdersService } from './pagbank-orders.service';
import { PagbankWebhooksService } from './pagbank-webhooks.service';
import { PagbankOperationsController } from './pagbank-operations.controller';
import { PagbankWebhooksController } from './pagbank-webhooks.controller';
import { PagbankCardVaultService } from './pagbank-card-vault.service';
import { Pagbank3dsService } from './pagbank-3ds.service';
import { PagbankPdvSettlementService } from './pagbank-pdv-settlement.service';
import { PagbankSplitService } from './pagbank-split.service';
import { PagbankConnectService } from './pagbank-connect.service';
import { PagbankHostedCheckoutService } from './pagbank-hosted-checkout.service';
import { PagbankRecurringService } from './pagbank-recurring.service';
import { PagbankTransfersService } from './pagbank-transfers.service';
import { PagbankRegistrationService } from './pagbank-registration.service';
import { PagbankRecurringController } from './pagbank-recurring.controller';
import { PagbankTransfersController } from './pagbank-transfers.controller';
import { PagbankRegistrationController } from './pagbank-registration.controller';
import { PagbankSandboxTestService } from './pagbank-sandbox-test.service';
import { PagbankSandboxTestController } from './pagbank-sandbox-test.controller';
import { PagbankRecurringPlan } from './entities/pagbank-recurring-plan.entity';
import { PagbankSubscription } from './entities/pagbank-subscription.entity';
import { PagbankTransfer } from './entities/pagbank-transfer.entity';
import { PagbankRegisteredAccount } from './entities/pagbank-registered-account.entity';
import { PagbankConnectController } from './pagbank-connect.controller';
import { PagbankConnectCallbackController } from './pagbank-connect-callback.controller';
import { PagbankConnectAccount } from './entities/pagbank-connect-account.entity';
import { OrderPayment } from '../pdv/entities/order-payment.entity';

@Module({
  imports: [
    forwardRef(() => PdvModule),
    forwardRef(() => ParkingModule),
    TypeOrmModule.forFeature([
      PaymentSettings,
      PaymentSplitReceiver,
      PagbankTransaction,
      Order,
      OrderPayment,
      PagbankConnectAccount,
      PagbankRecurringPlan,
      PagbankSubscription,
      PagbankTransfer,
      PagbankRegisteredAccount,
    ]),
  ],
  controllers: [
    PaymentsController,
    PagbankOperationsController,
    PagbankWebhooksController,
    PagbankConnectController,
    PagbankConnectCallbackController,
    PagbankRecurringController,
    PagbankTransfersController,
    PagbankRegistrationController,
    PagbankSandboxTestController,
  ],
  providers: [
    PaymentsService,
    PagbankHttpClient,
    PagbankFlowGuard,
    PagbankOrdersService,
    PagbankWebhooksService,
    PagbankCardVaultService,
    Pagbank3dsService,
    PagbankPdvSettlementService,
    PagbankSplitService,
    PagbankConnectService,
    PagbankHostedCheckoutService,
    PagbankRecurringService,
    PagbankTransfersService,
    PagbankRegistrationService,
    PagbankSandboxTestService,
  ],
  exports: [PaymentsService, PagbankOrdersService, PagbankHostedCheckoutService],
})
export class PaymentsModule {}
