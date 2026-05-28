import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import {
  FinanceBillStatus,
} from '../finance/entities/finance-extended.entities';
import { FinanceOperationsService } from '../finance/finance-operations.service';
import { FinanceAccount, FinanceAccountType } from '../finance/entities/finance.entities';
import {
  PagbankTransaction,
  PagbankTransactionStatus,
} from '../payments/entities/pagbank-transaction.entity';
import { ParkingSubscriptionBill } from './entities/parking-subscription-bill.entity';
import { SubscriptionBillStatus } from './entities/parking.enums';

const PARKING_BILL_PREFIX = 'parking-bill-';

@Injectable()
export class ParkingPagbankSettlementService {
  private readonly logger = new Logger(ParkingPagbankSettlementService.name);

  constructor(
    @InjectRepository(ParkingSubscriptionBill)
    private readonly billsRepo: Repository<ParkingSubscriptionBill>,
    @InjectRepository(FinanceAccount)
    private readonly accountsRepo: Repository<FinanceAccount>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly financeOps: FinanceOperationsService,
  ) {}

  extractParkingBillId(tx: PagbankTransaction): string | null {
    const raw = tx.rawCreate as Record<string, unknown> | null;
    const ref =
      (typeof raw?.reference_id === 'string' ? raw.reference_id : null) ??
      (typeof (tx.checkoutData as Record<string, unknown> | null)?.referenceId === 'string'
        ? ((tx.checkoutData as Record<string, unknown>).referenceId as string)
        : null);

    if (ref?.startsWith(PARKING_BILL_PREFIX)) {
      return ref.slice(PARKING_BILL_PREFIX.length);
    }
    return null;
  }

  async trySettlePaidTransaction(
    tx: PagbankTransaction,
  ): Promise<{ settled: boolean; billId?: string }> {
    if (tx.status !== PagbankTransactionStatus.PAID) {
      return { settled: false };
    }

    let bill = await this.billsRepo.findOne({
      where: { tenantId: tx.tenantId, pagbankTransactionId: tx.id },
      relations: ['financeBill', 'subscription'],
    });

    const billIdFromRef = this.extractParkingBillId(tx);
    if (!bill && billIdFromRef) {
      bill = await this.billsRepo.findOne({
        where: { id: billIdFromRef, tenantId: tx.tenantId },
        relations: ['financeBill', 'subscription'],
      });
    }

    if (!bill || bill.status === SubscriptionBillStatus.PAID) {
      return { settled: false };
    }

    if (!bill.financeBillId || !bill.financeBill) {
      this.logger.warn(`Cobrança parking ${bill.id} sem título financeiro`);
      return { settled: false };
    }

    if (bill.financeBill.status === FinanceBillStatus.PAID) {
      bill.status = SubscriptionBillStatus.PAID;
      bill.pagbankTransactionId = tx.id;
      await this.billsRepo.save(bill);
      return { settled: true, billId: bill.id };
    }

    const account =
      (await this.accountsRepo.findOne({
        where: { tenantId: tx.tenantId, active: true, type: FinanceAccountType.CASH },
        order: { createdAt: 'ASC' },
      })) ??
      (await this.accountsRepo.findOne({
        where: { tenantId: tx.tenantId, active: true },
        order: { createdAt: 'ASC' },
      }));

    if (!account) {
      this.logger.warn(`Tenant ${tx.tenantId} sem conta para baixa automática parking`);
      return { settled: false };
    }

    const amount = Number(bill.amount);
    const systemUser =
      (await this.usersRepo.findOne({
        where: { tenantId: tx.tenantId, role: UserRole.ADMIN },
        order: { createdAt: 'ASC' },
      })) ?? (await this.usersRepo.findOne({ where: { tenantId: tx.tenantId } }));

    if (!systemUser) {
      this.logger.warn(`Tenant ${tx.tenantId} sem usuário para baixa automática`);
      return { settled: false };
    }

    await this.financeOps.settleBills(systemUser, {
      billIds: [bill.financeBillId],
      amount,
      paymentDate: new Date().toISOString().slice(0, 10),
      accountId: account.id,
    });

    bill.status = SubscriptionBillStatus.PAID;
    bill.pagbankTransactionId = tx.id;
    bill.chargedAt = bill.chargedAt ?? new Date();
    bill.autoChargeError = null;
    await this.billsRepo.save(bill);

    this.logger.log(`Mensalidade parking ${bill.id} liquidada via PagBank tx=${tx.id}`);
    return { settled: true, billId: bill.id };
  }
}
