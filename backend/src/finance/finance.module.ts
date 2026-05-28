import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderPayment } from '../pdv/entities/order-payment.entity';
import { User } from '../users/entities/user.entity';
import { MinioModule } from '../minio/minio.module';
import { FinanceController } from './finance.controller';
import { FinanceOperationsController } from './finance-operations.controller';
import { FinanceOperationsService } from './finance-operations.service';
import { FinanceReportsService } from './finance-reports.service';
import { FinanceService } from './finance.service';
import {
  FinanceAccount,
  FinanceCategory,
  FinanceSource,
  FinanceTag,
  FinanceTransaction,
} from './entities/finance.entities';
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
} from './entities/finance-extended.entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinanceTransaction,
      FinanceAccount,
      FinanceSource,
      FinanceCategory,
      FinanceTag,
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
      OrderPayment,
      User,
    ]),
    MinioModule,
  ],
  controllers: [FinanceController, FinanceOperationsController],
  providers: [FinanceService, FinanceOperationsService, FinanceReportsService],
  exports: [FinanceService, FinanceOperationsService, FinanceReportsService],
})
export class FinanceModule {}
