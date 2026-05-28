import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MobileRealtimeModule } from '../mobile/mobile-realtime.module';
import { CrmModule } from '../crm/crm.module';
import { FinanceModule } from '../finance/finance.module';
import { PaymentsModule } from '../payments/payments.module';
import { FinanceAccount, FinanceTransaction } from '../finance/entities/finance.entities';
import { FinanceBill, FinanceCashSession } from '../finance/entities/finance-extended.entities';
import { PagbankTransaction } from '../payments/entities/pagbank-transaction.entity';
import { Customer } from '../customers/entities/customer.entity';
import { User } from '../users/entities/user.entity';
import { ParkingFacility } from './entities/parking-facility.entity';
import { ParkingSpot } from './entities/parking-spot.entity';
import { ParkingSession } from './entities/parking-session.entity';
import { ParkingTariff } from './entities/parking-tariff.entity';
import { ParkingSubscription } from './entities/parking-subscription.entity';
import { ParkingSubscriptionVehicle } from './entities/parking-subscription-vehicle.entity';
import { ParkingAgreement } from './entities/parking-agreement.entity';
import { ParkingAgreementVehicle } from './entities/parking-agreement-vehicle.entity';
import { ParkingValetTicket } from './entities/parking-valet-ticket.entity';
import { ParkingAccessDevice } from './entities/parking-access-device.entity';
import { ParkingAccessEvent } from './entities/parking-access-event.entity';
import { ParkingGateCommand } from './entities/parking-gate-command.entity';
import { ParkingVehicle } from './entities/parking-vehicle.entity';
import { ParkingSubscriptionBill } from './entities/parking-subscription-bill.entity';
import { ParkingController } from './parking.controller';
import { ParkingContractsController } from './parking-contracts.controller';
import { ParkingValetController } from './parking-valet.controller';
import { ParkingCashController } from './parking-cash.controller';
import { ParkingHardwareController } from './parking-hardware.controller';
import { ParkingHardwareDeviceController } from './parking-hardware-device.controller';
import { ParkingReportsController } from './parking-reports.controller';
import { ParkingVehiclesController } from './parking-vehicles.controller';
import { ParkingBillingController } from './parking-billing.controller';
import { ParkingService } from './parking.service';
import { ParkingContractsService } from './parking-contracts.service';
import { ParkingValetService } from './parking-valet.service';
import { ParkingCashService } from './parking-cash.service';
import { ParkingHardwareService } from './parking-hardware.service';
import { ParkingReportsService } from './parking-reports.service';
import { ParkingVehiclesService } from './parking-vehicles.service';
import { ParkingBillingService } from './parking-billing.service';
import { ParkingTicketService } from './parking-ticket.service';
import { ParkingPagbankSettlementService } from './parking-pagbank-settlement.service';
import { ParkingDeviceGuard } from './parking-device.guard';
import { ParkingValetBroadcastService } from './parking-valet-broadcast.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
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
      FinanceAccount,
      FinanceTransaction,
      FinanceBill,
      FinanceCashSession,
      PagbankTransaction,
      Customer,
      User,
    ]),
    AuthModule,
    MobileRealtimeModule,
    CrmModule,
    FinanceModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [
    ParkingController,
    ParkingContractsController,
    ParkingValetController,
    ParkingCashController,
    ParkingHardwareController,
    ParkingHardwareDeviceController,
    ParkingReportsController,
    ParkingVehiclesController,
    ParkingBillingController,
  ],
  providers: [
    ParkingService,
    ParkingContractsService,
    ParkingValetService,
    ParkingCashService,
    ParkingHardwareService,
    ParkingReportsService,
    ParkingVehiclesService,
    ParkingBillingService,
    ParkingTicketService,
    ParkingPagbankSettlementService,
    ParkingDeviceGuard,
    ParkingValetBroadcastService,
  ],
  exports: [
    ParkingService,
    ParkingContractsService,
    ParkingValetService,
    ParkingCashService,
    ParkingHardwareService,
    ParkingVehiclesService,
    ParkingBillingService,
    ParkingPagbankSettlementService,
  ],
})
export class ParkingModule {}
