import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import {
  FinanceBill,
  FinanceBillStatus,
  FinanceBillType,
} from '../finance/entities/finance-extended.entities';
import { FinanceOperationsService } from '../finance/finance-operations.service';
import { PagbankOrdersService } from '../payments/pagbank-orders.service';
import { PagbankCheckoutPaymentMethod } from '../payments/dto/pagbank-orders.dto';
import {
  PagbankTransaction,
  PagbankTransactionStatus,
} from '../payments/entities/pagbank-transaction.entity';
import { ParkingSubscriptionBill } from './entities/parking-subscription-bill.entity';
import { ParkingSubscription } from './entities/parking-subscription.entity';
import {
  ContractStatus,
  SubscriptionBillPaymentMethod,
  SubscriptionBillStatus,
} from './entities/parking.enums';
import {
  BillingPreviewQueryDto,
  ChargeSubscriptionBillDto,
  GenerateSubscriptionBillingDto,
  ListSubscriptionBillingQueryDto,
  SettleSubscriptionBillingDto,
} from './dto/parking-billing.dto';
import { ParkingPagbankSettlementService } from './parking-pagbank-settlement.service';

const PARKING_BILL_PREFIX = 'parking-bill-';

function isSubscriptionActiveInMonth(
  sub: ParkingSubscription,
  referenceMonth: string,
): boolean {
  if (sub.status !== ContractStatus.ACTIVE) return false;
  const [year, month] = referenceMonth.split('-').map(Number);
  const monthStart = `${referenceMonth}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${referenceMonth}-${String(lastDay).padStart(2, '0')}`;
  if (sub.startDate > monthEnd) return false;
  if (sub.endDate && sub.endDate < monthStart) return false;
  return true;
}

function defaultDueDate(referenceMonth: string): string {
  const [year, month] = referenceMonth.split('-').map(Number);
  const due = new Date(year, month - 1, 10);
  return due.toISOString().slice(0, 10);
}

function formatMonthLabel(referenceMonth: string): string {
  const [year, month] = referenceMonth.split('-');
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  return `${months[Number(month) - 1]}/${year}`;
}

@Injectable()
export class ParkingBillingService {
  constructor(
    @InjectRepository(ParkingSubscription)
    private readonly subscriptionsRepo: Repository<ParkingSubscription>,
    @InjectRepository(ParkingSubscriptionBill)
    private readonly billsRepo: Repository<ParkingSubscriptionBill>,
    @InjectRepository(FinanceBill)
    private readonly financeBillsRepo: Repository<FinanceBill>,
    @InjectRepository(PagbankTransaction)
    private readonly pagbankTxRepo: Repository<PagbankTransaction>,
    private readonly financeOps: FinanceOperationsService,
    private readonly pagbankOrders: PagbankOrdersService,
    private readonly pagbankSettlement: ParkingPagbankSettlementService,
  ) {}

  async preview(tenantId: string, query: BillingPreviewQueryDto) {
    const subscriptions = await this.findEligibleSubscriptions(
      tenantId,
      query.referenceMonth,
      query.facilityId,
    );

    const existing = await this.billsRepo.find({
      where: {
        tenantId,
        referenceMonth: query.referenceMonth,
        subscriptionId: In(subscriptions.map((s) => s.id)),
      },
      relations: ['financeBill'],
    });

    const existingBySub = new Map(existing.map((b) => [b.subscriptionId, b]));

    const items = subscriptions.map((sub) => {
      const bill = existingBySub.get(sub.id);
      return {
        subscriptionId: sub.id,
        code: sub.code,
        customerName: sub.customer?.name ?? '—',
        facilityName: sub.facility?.name ?? '—',
        monthlyPrice: Number(sub.monthlyPrice),
        alreadyBilled: Boolean(bill),
        billStatus: bill?.status ?? null,
        financeBillId: bill?.financeBillId ?? null,
        billId: bill?.id ?? null,
      };
    });

    const pending = items.filter((i) => !i.alreadyBilled);
    const totalPending = pending.reduce((sum, i) => sum + i.monthlyPrice, 0);

    return {
      referenceMonth: query.referenceMonth,
      referenceMonthLabel: formatMonthLabel(query.referenceMonth),
      summary: {
        eligible: items.length,
        alreadyBilled: items.filter((i) => i.alreadyBilled).length,
        pending: pending.length,
        totalPending: Math.round(totalPending * 100) / 100,
      },
      items,
    };
  }

  async generate(tenantId: string, dto: GenerateSubscriptionBillingDto) {
    const dueDate = dto.dueDate ?? defaultDueDate(dto.referenceMonth);
    let subscriptions = await this.findEligibleSubscriptions(
      tenantId,
      dto.referenceMonth,
      dto.facilityId,
    );

    if (dto.subscriptionIds?.length) {
      const idSet = new Set(dto.subscriptionIds);
      subscriptions = subscriptions.filter((s) => idSet.has(s.id));
    }

    const created: ParkingSubscriptionBill[] = [];
    const skipped: string[] = [];
    const charged: string[] = [];
    const chargeErrors: Array<{ subscriptionId: string; error: string }> = [];

    for (const sub of subscriptions) {
      const existing = await this.billsRepo.findOne({
        where: { subscriptionId: sub.id, referenceMonth: dto.referenceMonth },
      });
      if (existing) {
        skipped.push(sub.id);
        continue;
      }

      const amount = Number(sub.monthlyPrice);
      const customerName = sub.customer?.name ?? 'Mensalista';
      const monthLabel = formatMonthLabel(dto.referenceMonth);
      const description = `Mensalidade estacionamento — ${monthLabel}${sub.code ? ` (${sub.code})` : ''}`;

      const financeBill = await this.financeOps.createBill(tenantId, {
        billType: FinanceBillType.RECEIVABLE,
        description,
        counterpartyName: customerName,
        counterpartyDocument: sub.customer?.document ?? undefined,
        amount,
        dueDate,
        customerId: sub.customerId,
        notes: `Assinatura ${sub.id} — ref. ${dto.referenceMonth}`,
      });

      const bill = await this.billsRepo.save(
        this.billsRepo.create({
          tenantId,
          subscriptionId: sub.id,
          referenceMonth: dto.referenceMonth,
          amount: amount.toFixed(2),
          dueDate,
          financeBillId: financeBill.id,
          status: SubscriptionBillStatus.BILLED,
        }),
      );
      created.push(bill);

      if (dto.autoCharge && dto.paymentMethod) {
        try {
          await this.chargeBill(tenantId, bill.id, {
            paymentMethod: dto.paymentMethod,
          });
          charged.push(bill.id);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erro ao emitir cobrança';
          bill.autoChargeError = message;
          await this.billsRepo.save(bill);
          chargeErrors.push({ subscriptionId: sub.id, error: message });
        }
      }
    }

    return {
      referenceMonth: dto.referenceMonth,
      created: created.length,
      skipped: skipped.length,
      charged: charged.length,
      chargeErrors,
      bills: await this.list(tenantId, {
        referenceMonth: dto.referenceMonth,
        facilityId: dto.facilityId,
      }),
    };
  }

  async chargeBill(
    tenantId: string,
    billId: string,
    dto: ChargeSubscriptionBillDto,
  ) {
    const bill = await this.billsRepo.findOne({
      where: { id: billId, tenantId },
      relations: ['subscription', 'subscription.customer', 'financeBill'],
    });
    if (!bill) throw new NotFoundException('Cobrança não encontrada');
    if (bill.status === SubscriptionBillStatus.PAID) {
      throw new BadRequestException('Cobrança já quitada');
    }

    const customer = bill.subscription?.customer;
    if (!customer?.name) {
      throw new BadRequestException('Cliente da mensalidade não encontrado');
    }

    const flowId =
      dto.paymentMethod === SubscriptionBillPaymentMethod.PIX ? 'orders_pix' : 'orders_boleto';

    const amountCents = Math.round(Number(bill.amount) * 100);
    const taxId = customer.document?.replace(/\D/g, '') || undefined;

    let pagbankResult: Record<string, unknown>;
    try {
      pagbankResult = await this.pagbankOrders.checkout(tenantId, {
        flowId,
        referenceId: `${PARKING_BILL_PREFIX}${bill.id}`,
        amountCents,
        customer: {
          name: customer.name,
          email: customer.email ?? undefined,
          taxId,
        },
        payment: {
          method:
            dto.paymentMethod === SubscriptionBillPaymentMethod.PIX
              ? PagbankCheckoutPaymentMethod.PIX
              : PagbankCheckoutPaymentMethod.BOLETO,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'PagBank indisponível';
      bill.autoChargeError = message;
      await this.billsRepo.save(bill);
      throw new BadRequestException(message);
    }

    const txId = typeof pagbankResult.id === 'string' ? pagbankResult.id : null;
    const checkoutData = (pagbankResult.checkoutData ?? {}) as Record<string, unknown>;

    bill.pagbankTransactionId = txId;
    bill.paymentMethod = dto.paymentMethod;
    bill.pixCopyPaste =
      (typeof checkoutData.pixCopyPaste === 'string' ? checkoutData.pixCopyPaste : null) ??
      null;
    bill.pixQrCode =
      typeof checkoutData.pixQrCode === 'string'
        ? checkoutData.pixQrCode
        : JSON.stringify(checkoutData.pixQrCode ?? null);
    bill.boletoPdfUrl =
      (typeof checkoutData.boletoPdfUrl === 'string' ? checkoutData.boletoPdfUrl : null) ?? null;
    bill.boletoBarcode =
      (typeof checkoutData.boletoBarcode === 'string' ? checkoutData.boletoBarcode : null) ?? null;
    bill.chargedAt = new Date();
    bill.autoChargeError = null;
    await this.billsRepo.save(bill);

    if (pagbankResult.status === PagbankTransactionStatus.PAID && txId) {
      const txEntity = await this.pagbankTxRepo.findOne({ where: { id: txId, tenantId } });
      if (txEntity) {
        await this.pagbankSettlement.trySettlePaidTransaction(txEntity);
      }
    }

    return this.mapBill(
      (await this.billsRepo.findOne({
        where: { id: bill.id },
        relations: ['subscription', 'subscription.customer', 'subscription.facility', 'financeBill'],
      }))!,
    );
  }

  async list(tenantId: string, query: ListSubscriptionBillingQueryDto) {
    const qb = this.billsRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.subscription', 'sub')
      .leftJoinAndSelect('sub.customer', 'customer')
      .leftJoinAndSelect('sub.facility', 'facility')
      .leftJoinAndSelect('b.financeBill', 'financeBill')
      .where('b.tenant_id = :tenantId', { tenantId })
      .orderBy('b.reference_month', 'DESC')
      .addOrderBy('customer.name', 'ASC');

    if (query.referenceMonth) {
      qb.andWhere('b.reference_month = :referenceMonth', {
        referenceMonth: query.referenceMonth,
      });
    }
    if (query.subscriptionId) {
      qb.andWhere('b.subscription_id = :subscriptionId', {
        subscriptionId: query.subscriptionId,
      });
    }
    if (query.facilityId) {
      qb.andWhere('sub.facility_id = :facilityId', { facilityId: query.facilityId });
    }
    if (query.status) {
      qb.andWhere('b.status = :status', { status: query.status });
    }

    const bills = await qb.getMany();
    return bills.map((b) => this.mapBill(b));
  }

  async settle(user: User, dto: SettleSubscriptionBillingDto) {
    const parkingBills = await this.billsRepo.find({
      where: { tenantId: user.tenantId, id: In(dto.billIds) },
      relations: ['financeBill'],
    });

    if (!parkingBills.length) {
      throw new NotFoundException('Cobranças não encontradas');
    }

    const financeBillIds = parkingBills
      .map((b) => b.financeBillId)
      .filter((id): id is string => Boolean(id));

    if (!financeBillIds.length) {
      throw new BadRequestException('Nenhuma cobrança possui título financeiro vinculado');
    }

    const totalAmount = parkingBills.reduce((sum, b) => {
      const open =
        Number(b.financeBill?.amount ?? b.amount) -
        Number(b.financeBill?.paidAmount ?? 0);
      return sum + Math.max(0, open);
    }, 0);

    await this.financeOps.settleBills(user, {
      billIds: financeBillIds,
      amount: totalAmount,
      paymentDate: dto.paymentDate,
      accountId: dto.accountId,
    });

    for (const bill of parkingBills) {
      bill.status = SubscriptionBillStatus.PAID;
      await this.billsRepo.save(bill);
    }

    return {
      settled: parkingBills.length,
      amount: totalAmount,
    };
  }

  private async findEligibleSubscriptions(
    tenantId: string,
    referenceMonth: string,
    facilityId?: string,
  ) {
    const where: Record<string, unknown> = { tenantId, status: ContractStatus.ACTIVE };
    if (facilityId) where.facilityId = facilityId;

    const all = await this.subscriptionsRepo.find({
      where,
      relations: ['customer', 'facility'],
      order: { code: 'ASC' },
    });

    return all.filter((s) => isSubscriptionActiveInMonth(s, referenceMonth));
  }

  private mapBill(b: ParkingSubscriptionBill) {
    const financeStatus = b.financeBill?.status ?? null;
    const paidAmount = b.financeBill ? Number(b.financeBill.paidAmount) : 0;
    const amount = Number(b.amount);
    const openAmount = Math.max(0, amount - paidAmount);

    let status = b.status;
    if (financeStatus === FinanceBillStatus.PAID) status = SubscriptionBillStatus.PAID;
    else if (financeStatus === FinanceBillStatus.PARTIAL) status = SubscriptionBillStatus.BILLED;

    return {
      id: b.id,
      subscriptionId: b.subscriptionId,
      referenceMonth: b.referenceMonth,
      referenceMonthLabel: formatMonthLabel(b.referenceMonth),
      amount,
      dueDate: b.dueDate,
      status,
      financeBillId: b.financeBillId,
      financeBillStatus: financeStatus,
      openAmount,
      subscription: b.subscription
        ? {
            id: b.subscription.id,
            code: b.subscription.code,
            customerName: b.subscription.customer?.name ?? null,
            facilityName: b.subscription.facility?.name ?? null,
            customerEmail: b.subscription.customer?.email ?? null,
            customerPhone: b.subscription.customer?.phone ?? null,
          }
        : null,
      paymentMethod: b.paymentMethod,
      pixCopyPaste: b.pixCopyPaste,
      pixQrCode: b.pixQrCode,
      boletoPdfUrl: b.boletoPdfUrl,
      boletoBarcode: b.boletoBarcode,
      pagbankTransactionId: b.pagbankTransactionId,
      autoChargeError: b.autoChargeError,
      chargedAt: b.chargedAt,
      createdAt: b.createdAt,
    };
  }
}
