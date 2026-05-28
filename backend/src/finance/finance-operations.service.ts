import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { OrderPayment } from '../pdv/entities/order-payment.entity';
import { User } from '../users/entities/user.entity';
import {
  CreateAdvanceDto,
  CreateBankStatementLineDto,
  CreateCardReceivableDto,
  CreateFinanceBillDto,
  CreateFinanceTransferDto,
  CreatePayrollLineDto,
  CreatePayrollRunDto,
  CreatePrepaidWalletDto,
  CreateReceiptDto,
  CreateRecurringRuleDto,
  PrepaidMovementDto,
  SettleBillsDto,
  SettleByCounterpartyDto,
  UpsertDailyReconciliationDto,
} from './dto/finance-operations.dto';
import { FinancePeriodQueryDto } from './dto/finance-operations.dto';
import {
  FinanceAdvanceStatus,
  FinanceBill,
  FinanceBillStatus,
  FinanceBillType,
  FinanceCardReceivable,
  FinanceCardReceivableStatus,
  FinanceCashSession,
  FinanceCashSessionStatus,
  FinanceDailyReconciliation,
  FinanceEmployeeAdvance,
  FinanceBankStatementLine,
  FinancePayrollLine,
  FinancePayrollRun,
  FinancePayrollStatus,
  FinancePrepaidMovement,
  FinancePrepaidMovementType,
  FinancePrepaidWallet,
  FinanceReceipt,
  FinanceRecurringRule,
  FinanceRecurringFrequency,
  FinanceTransfer,
} from './entities/finance-extended.entities';
import {
  FinanceTransactionOrigin,
  FinanceTransactionType,
} from './entities/finance.entities';
import { FinanceService } from './finance.service';

@Injectable()
export class FinanceOperationsService {
  constructor(
    private readonly finance: FinanceService,
    @InjectRepository(FinanceBill) private readonly billsRepo: Repository<FinanceBill>,
    @InjectRepository(FinanceTransfer)
    private readonly transfersRepo: Repository<FinanceTransfer>,
    @InjectRepository(FinanceRecurringRule)
    private readonly recurringRepo: Repository<FinanceRecurringRule>,
    @InjectRepository(FinanceEmployeeAdvance)
    private readonly advancesRepo: Repository<FinanceEmployeeAdvance>,
    @InjectRepository(FinancePayrollRun)
    private readonly payrollRunsRepo: Repository<FinancePayrollRun>,
    @InjectRepository(FinancePayrollLine)
    private readonly payrollLinesRepo: Repository<FinancePayrollLine>,
    @InjectRepository(FinanceCashSession)
    private readonly cashSessionsRepo: Repository<FinanceCashSession>,
    @InjectRepository(FinanceDailyReconciliation)
    private readonly dailyRepo: Repository<FinanceDailyReconciliation>,
    @InjectRepository(FinanceCardReceivable)
    private readonly cardRepo: Repository<FinanceCardReceivable>,
    @InjectRepository(FinanceBankStatementLine)
    private readonly bankLinesRepo: Repository<FinanceBankStatementLine>,
    @InjectRepository(FinancePrepaidWallet)
    private readonly prepaidRepo: Repository<FinancePrepaidWallet>,
    @InjectRepository(FinancePrepaidMovement)
    private readonly prepaidMovRepo: Repository<FinancePrepaidMovement>,
    @InjectRepository(FinanceReceipt) private readonly receiptsRepo: Repository<FinanceReceipt>,
    @InjectRepository(OrderPayment) private readonly orderPaymentsRepo: Repository<OrderPayment>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  // —— Contas a pagar / receber ——
  listBills(tenantId: string, billType?: FinanceBillType) {
    return this.billsRepo.find({
      where: billType ? { tenantId, billType } : { tenantId },
      order: { dueDate: 'ASC' },
      relations: ['account', 'category', 'customer'],
    });
  }

  createBill(tenantId: string, dto: CreateFinanceBillDto) {
    return this.billsRepo.save(
      this.billsRepo.create({
        tenantId,
        ...dto,
        paidAmount: 0,
        status: FinanceBillStatus.OPEN,
      }),
    );
  }

  async settleBills(user: User, dto: SettleBillsDto) {
    const bills = await this.billsRepo.find({
      where: { tenantId: user.tenantId, id: In(dto.billIds) },
    });
    if (!bills.length) throw new NotFoundException('Títulos não encontrados');

    let remaining = dto.amount;
    for (const bill of bills) {
      const open = Number(bill.amount) - Number(bill.paidAmount);
      if (open <= 0) continue;
      const pay = Math.min(remaining, open);
      bill.paidAmount = Number(bill.paidAmount) + pay;
      remaining -= pay;
      bill.status =
        bill.paidAmount >= Number(bill.amount)
          ? FinanceBillStatus.PAID
          : FinanceBillStatus.PARTIAL;
      await this.billsRepo.save(bill);

      const txType =
        bill.billType === FinanceBillType.PAYABLE
          ? FinanceTransactionType.EXPENSE
          : FinanceTransactionType.INCOME;
      await this.finance.createSystemTransaction(
        user.tenantId,
        user.id,
        {
          type: txType,
          description: `Baixa: ${bill.description}`,
          amount: pay,
          transactionDate: dto.paymentDate,
          accountId: dto.accountId,
          categoryId: bill.categoryId ?? undefined,
        },
        FinanceTransactionOrigin.BILL,
        bill.id,
      );
      if (remaining <= 0) break;
    }
    return { ok: true, applied: dto.amount - remaining };
  }

  async settleByCounterparty(user: User, dto: SettleByCounterpartyDto) {
    const bills = await this.billsRepo.find({
      where: {
        tenantId: user.tenantId,
        counterpartyName: dto.counterpartyName,
        status: In([FinanceBillStatus.OPEN, FinanceBillStatus.PARTIAL]),
        dueDate: Between(dto.from, dto.to),
      },
    });
    const totalOpen = bills.reduce(
      (s, b) => s + (Number(b.amount) - Number(b.paidAmount)),
      0,
    );
    if (totalOpen <= 0) {
      throw new BadRequestException('Nenhum título em aberto para este fornecedor/cliente');
    }
    return this.settleBills(user, {
      billIds: bills.map((b) => b.id),
      amount: totalOpen,
      paymentDate: dto.paymentDate,
      accountId: dto.accountId,
    });
  }

  // —— Transferências ——
  async createTransfer(user: User, dto: CreateFinanceTransferDto) {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException('Contas de origem e destino devem ser diferentes');
    }
    const outTx = await this.finance.createSystemTransaction(
      user.tenantId,
      user.id,
      {
        type: FinanceTransactionType.EXPENSE,
        description: dto.description?.trim() || 'Transferência enviada',
        amount: dto.amount,
        transactionDate: dto.transferDate,
        accountId: dto.fromAccountId,
      },
      FinanceTransactionOrigin.TRANSFER,
    );
    const inTx = await this.finance.createSystemTransaction(
      user.tenantId,
      user.id,
      {
        type: FinanceTransactionType.INCOME,
        description: dto.description?.trim() || 'Transferência recebida',
        amount: dto.amount,
        transactionDate: dto.transferDate,
        accountId: dto.toAccountId,
      },
      FinanceTransactionOrigin.TRANSFER,
    );
    return this.transfersRepo.save(
      this.transfersRepo.create({
        tenantId: user.tenantId,
        ...dto,
        outTransactionId: outTx.id,
        inTransactionId: inTx.id,
      }),
    );
  }

  listTransfers(tenantId: string) {
    return this.transfersRepo.find({
      where: { tenantId },
      order: { transferDate: 'DESC', createdAt: 'DESC' },
    });
  }

  // —— Recorrentes ——
  listRecurring(tenantId: string) {
    return this.recurringRepo.find({
      where: { tenantId },
      order: { nextDueDate: 'ASC' },
    });
  }

  createRecurring(tenantId: string, dto: CreateRecurringRuleDto) {
    return this.recurringRepo.save(
      this.recurringRepo.create({ tenantId, ...dto, active: true }),
    );
  }

  async runRecurringDue(user: User) {
    const today = new Date().toISOString().slice(0, 10);
    const rules = await this.recurringRepo.find({
      where: { tenantId: user.tenantId, active: true },
    });
    const due = rules.filter((r) => r.nextDueDate <= today);
    const generated: string[] = [];

    for (const rule of due) {
      await this.finance.createSystemTransaction(
        user.tenantId,
        user.id,
        {
          type: rule.type,
          description: `${rule.description} (recorrente)`,
          amount: Number(rule.amount),
          transactionDate: rule.nextDueDate,
          accountId: rule.accountId ?? undefined,
          categoryId: rule.categoryId ?? undefined,
          sourceId: rule.sourceId ?? undefined,
        },
        FinanceTransactionOrigin.RECURRING,
        rule.id,
      );
      const next = new Date(rule.nextDueDate);
      if (rule.frequency === FinanceRecurringFrequency.MONTHLY) {
        next.setMonth(next.getMonth() + 1);
      } else {
        next.setDate(next.getDate() + 7);
      }
      rule.nextDueDate = next.toISOString().slice(0, 10);
      await this.recurringRepo.save(rule);
      generated.push(rule.id);
    }
    return { generated: generated.length, ruleIds: generated };
  }

  // —— Adiantamentos ——
  listAdvances(tenantId: string) {
    return this.advancesRepo.find({
      where: { tenantId },
      relations: ['user'],
      order: { advanceDate: 'DESC' },
    });
  }

  createAdvance(tenantId: string, dto: CreateAdvanceDto) {
    return this.advancesRepo.save(
      this.advancesRepo.create({
        tenantId,
        ...dto,
        status: FinanceAdvanceStatus.OPEN,
      }),
    );
  }

  async settleAdvance(user: User, id: string) {
    const adv = await this.advancesRepo.findOne({ where: { id, tenantId: user.tenantId } });
    if (!adv) throw new NotFoundException('Adiantamento não encontrado');
    adv.status = FinanceAdvanceStatus.SETTLED;
    await this.advancesRepo.save(adv);
    return adv;
  }

  // —— Folha ——
  listPayrollRuns(tenantId: string) {
    return this.payrollRunsRepo.find({
      where: { tenantId },
      order: { periodEnd: 'DESC' },
    });
  }

  createPayrollRun(tenantId: string, dto: CreatePayrollRunDto) {
    return this.payrollRunsRepo.save(
      this.payrollRunsRepo.create({
        tenantId,
        ...dto,
        status: FinancePayrollStatus.DRAFT,
        totalNet: 0,
      }),
    );
  }

  async addPayrollLine(tenantId: string, runId: string, dto: CreatePayrollLineDto) {
    const run = await this.payrollRunsRepo.findOne({ where: { id: runId, tenantId } });
    if (!run) throw new NotFoundException('Folha não encontrada');
    if (run.status !== FinancePayrollStatus.DRAFT) {
      throw new BadRequestException('Folha já encerrada');
    }
    const net = dto.grossAmount - dto.deductions;
    const line = await this.payrollLinesRepo.save(
      this.payrollLinesRepo.create({
        payrollRunId: runId,
        userId: dto.userId,
        grossAmount: dto.grossAmount,
        deductions: dto.deductions,
        netAmount: net,
        notes: dto.notes ?? null,
      }),
    );
    const lines = await this.payrollLinesRepo.find({ where: { payrollRunId: runId } });
    run.totalNet = lines.reduce((s, l) => s + Number(l.netAmount), 0);
    await this.payrollRunsRepo.save(run);
    return line;
  }

  async closePayrollRun(user: User, runId: string, accountId: string) {
    const full = await this.payrollRunsRepo.findOne({ where: { id: runId, tenantId: user.tenantId } });
    if (!full) throw new NotFoundException('Folha não encontrada');
    const lines = await this.payrollLinesRepo.find({
      where: { payrollRunId: runId },
      relations: ['user'],
    });
    if (!lines.length) throw new BadRequestException('Adicione linhas à folha');

    const total = lines.reduce((s, l) => s + Number(l.netAmount), 0);
    await this.finance.createSystemTransaction(
      user.tenantId,
      user.id,
      {
        type: FinanceTransactionType.EXPENSE,
        description: `Folha ${full.reference}`,
        amount: total,
        transactionDate: full.periodEnd,
        accountId,
      },
      FinanceTransactionOrigin.PAYROLL,
      full.id,
    );

    full.status = FinancePayrollStatus.CLOSED;
    full.totalNet = total;
    await this.payrollRunsRepo.save(full);

    const openAdvances = await this.advancesRepo.find({
      where: { tenantId: user.tenantId, status: FinanceAdvanceStatus.OPEN },
    });
    for (const adv of openAdvances) {
      if (lines.some((l) => l.userId === adv.userId)) {
        adv.status = FinanceAdvanceStatus.SETTLED;
        await this.advancesRepo.save(adv);
      }
    }
    return full;
  }

  async removePayrollRun(tenantId: string, id: string) {
    const run = await this.payrollRunsRepo.findOne({ where: { id, tenantId } });
    if (!run) throw new NotFoundException('Folha não encontrada');
    if (run.status === FinancePayrollStatus.CLOSED) {
      throw new BadRequestException('Não é possível excluir uma folha já fechada');
    }
    await this.payrollLinesRepo.delete({ payrollRunId: id });
    await this.payrollRunsRepo.remove(run);
    return { deleted: true };
  }

  getPayrollRun(tenantId: string, id: string) {
    return this.payrollRunsRepo.findOne({
      where: { id, tenantId },
    }).then(async (run) => {
      if (!run) throw new NotFoundException('Folha não encontrada');
      const lines = await this.payrollLinesRepo.find({
        where: { payrollRunId: id },
        relations: ['user'],
      });
      return { run, lines };
    });
  }

  listTenantUsers(tenantId: string) {
    return this.usersRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
      select: ['id', 'name', 'email', 'role'],
    });
  }

  // —— Caixas ——
  listCashSessions(tenantId: string) {
    return this.cashSessionsRepo.find({
      where: { tenantId },
      relations: ['account'],
      order: { openedAt: 'DESC' },
    });
  }

  async openCashSession(user: User, accountId: string, openingBalance: number, notes?: string) {
    const userOpen = await this.cashSessionsRepo.findOne({
      where: {
        tenantId: user.tenantId,
        openedByUserId: user.id,
        status: FinanceCashSessionStatus.OPEN,
      },
    });
    if (userOpen) {
      throw new BadRequestException('Você já possui um caixa aberto. Feche-o antes de abrir outro.');
    }

    const open = await this.cashSessionsRepo.findOne({
      where: {
        tenantId: user.tenantId,
        accountId,
        status: FinanceCashSessionStatus.OPEN,
      },
    });
    if (open) throw new BadRequestException('Já existe um caixa aberto nesta conta');
    return this.cashSessionsRepo.save(
      this.cashSessionsRepo.create({
        tenantId: user.tenantId,
        accountId,
        status: FinanceCashSessionStatus.OPEN,
        openedAt: new Date(),
        openingBalance,
        openedByUserId: user.id,
        notes: notes ?? null,
      }),
    );
  }

  async openOperatorCashSession(
    user: User,
    accountId: string,
    openingBalance: number,
    facilityId?: string,
    notes?: string,
  ) {
    const userOpen = await this.cashSessionsRepo.findOne({
      where: {
        tenantId: user.tenantId,
        openedByUserId: user.id,
        status: FinanceCashSessionStatus.OPEN,
      },
      relations: ['account'],
    });
    if (userOpen) return userOpen;

    const session = await this.openCashSession(user, accountId, openingBalance, notes);
    if (facilityId) {
      session.facilityId = facilityId;
      return this.cashSessionsRepo.save(session);
    }
    return session;
  }

  getOpenCashSessionForUser(tenantId: string, userId: string) {
    return this.cashSessionsRepo.findOne({
      where: {
        tenantId,
        openedByUserId: userId,
        status: FinanceCashSessionStatus.OPEN,
      },
      relations: ['account'],
    });
  }

  async getOperatorCashSummary(tenantId: string, userId: string, cashSessionId: string) {
    const session = await this.cashSessionsRepo.findOne({
      where: { id: cashSessionId, tenantId, openedByUserId: userId },
    });
    if (!session) throw new NotFoundException('Sessão de caixa não encontrada');

    const txs = await this.finance.listTransactions(tenantId, {
      from: session.openedAt.toISOString().slice(0, 10),
      to: new Date().toISOString().slice(0, 10),
      accountId: session.accountId,
    });

    const sessionTxs = txs.filter((t) => t.cashSessionId === cashSessionId);
    const parkingIncome = sessionTxs
      .filter((t) => t.origin === FinanceTransactionOrigin.PARKING && t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      session,
      transactionCount: sessionTxs.length,
      parkingIncome: Math.round(parkingIncome * 100) / 100,
      totalIncome: sessionTxs
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0),
    };
  }

  async closeCashSession(user: User, id: string, countedBalance: number, notes?: string) {
    const session = await this.cashSessionsRepo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!session) throw new NotFoundException('Sessão de caixa não encontrada');
    if (session.status !== FinanceCashSessionStatus.OPEN) {
      throw new BadRequestException('Caixa já fechado');
    }
    const overview = await this.finance.getOverview(user.tenantId, {
      from: session.openedAt.toISOString().slice(0, 10),
      to: new Date().toISOString().slice(0, 10),
      accountId: session.accountId,
    });
    const net =
      Number(session.openingBalance) +
      overview.summary.totalIncome -
      overview.summary.totalExpense;
    session.expectedBalance = net;
    session.countedBalance = countedBalance;
    session.closedAt = new Date();
    session.closedByUserId = user.id;
    session.status = FinanceCashSessionStatus.CLOSED;
    if (notes) session.notes = notes;
    return this.cashSessionsRepo.save(session);
  }

  // —— Conferência diária ——
  async upsertDailyReconciliation(tenantId: string, dto: UpsertDailyReconciliationDto) {
    const pdvTotal = await this.sumPdvPayments(tenantId, dto.reconciliationDate);
    const overview = await this.finance.getOverview(tenantId, {
      from: dto.reconciliationDate,
      to: dto.reconciliationDate,
    });
    const financeIncome = overview.summary.totalIncome;
    const cashCounted = dto.cashCounted ?? null;
    const difference =
      cashCounted != null ? cashCounted - pdvTotal : financeIncome - pdvTotal;

    let row = await this.dailyRepo.findOne({
      where: { tenantId, reconciliationDate: dto.reconciliationDate },
    });
    if (!row) {
      row = this.dailyRepo.create({ tenantId, reconciliationDate: dto.reconciliationDate });
    }
    row.pdvSalesTotal = pdvTotal;
    row.financeIncomeTotal = financeIncome;
    row.cashCounted = cashCounted;
    row.difference = difference;
    row.notes = dto.notes ?? row.notes ?? null;
    return this.dailyRepo.save(row);
  }

  listDailyReconciliations(tenantId: string, query: FinancePeriodQueryDto) {
    const where: Record<string, unknown> = { tenantId };
    if (query.from && query.to) {
      where.reconciliationDate = Between(query.from, query.to);
    }
    return this.dailyRepo.find({ where, order: { reconciliationDate: 'DESC' } });
  }

  private async sumPdvPayments(tenantId: string, date: string): Promise<number> {
    const rows = await this.orderPaymentsRepo
      .createQueryBuilder('p')
      .innerJoin('p.order', 'o')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('DATE(p.paid_at) = :date', { date })
      .select('SUM(p.amount)', 'total')
      .getRawOne<{ total: string | null }>();
    return Number(rows?.total ?? 0);
  }

  // —— Cartão ——
  listCardReceivables(tenantId: string) {
    return this.cardRepo.find({
      where: { tenantId },
      order: { referenceDate: 'DESC' },
    });
  }

  createCardReceivable(tenantId: string, dto: CreateCardReceivableDto) {
    const net = dto.grossAmount - dto.feeAmount;
    return this.cardRepo.save(
      this.cardRepo.create({
        tenantId,
        referenceDate: dto.referenceDate,
        acquirer: dto.acquirer ?? 'PagBank / adquirente',
        grossAmount: dto.grossAmount,
        feeAmount: dto.feeAmount,
        netAmount: net,
        expectedDepositDate: dto.expectedDepositDate ?? null,
        notes: dto.notes ?? null,
        status: FinanceCardReceivableStatus.PENDING,
      }),
    );
  }

  async depositCardReceivable(user: User, id: string, accountId: string) {
    const row = await this.cardRepo.findOne({ where: { id, tenantId: user.tenantId } });
    if (!row) throw new NotFoundException('Recebível de cartão não encontrado');
    const tx = await this.finance.createSystemTransaction(
      user.tenantId,
      user.id,
      {
        type: FinanceTransactionType.INCOME,
        description: `Depósito cartão ${row.acquirer}`,
        amount: Number(row.netAmount),
        transactionDate: new Date().toISOString().slice(0, 10),
        accountId,
      },
      FinanceTransactionOrigin.CARD,
      row.id,
    );
    row.status = FinanceCardReceivableStatus.DEPOSITED;
    row.transactionId = tx.id;
    return this.cardRepo.save(row);
  }

  // —— Conciliação ——
  listBankLines(tenantId: string, accountId?: string) {
    return this.bankLinesRepo.find({
      where: accountId ? { tenantId, accountId } : { tenantId },
      order: { lineDate: 'DESC' },
      relations: ['matchedTransaction'],
    });
  }

  createBankLine(tenantId: string, dto: CreateBankStatementLineDto) {
    return this.bankLinesRepo.save(
      this.bankLinesRepo.create({ tenantId, ...dto }),
    );
  }

  async matchBankLine(tenantId: string, lineId: string, transactionId: string) {
    const line = await this.bankLinesRepo.findOne({ where: { id: lineId, tenantId } });
    if (!line) throw new NotFoundException('Linha não encontrada');
    line.matchedTransactionId = transactionId;
    return this.bankLinesRepo.save(line);
  }

  // —— Crédito pré-pago ——
  listPrepaidWallets(tenantId: string) {
    return this.prepaidRepo.find({
      where: { tenantId },
      relations: ['customer'],
      order: { holderName: 'ASC' },
    });
  }

  createPrepaidWallet(tenantId: string, dto: CreatePrepaidWalletDto) {
    return this.prepaidRepo.save(
      this.prepaidRepo.create({ tenantId, holderName: dto.holderName.trim(), customerId: dto.customerId ?? null, balance: 0, active: true }),
    );
  }

  async prepaidMovement(tenantId: string, walletId: string, dto: PrepaidMovementDto) {
    const wallet = await this.prepaidRepo.findOne({ where: { id: walletId, tenantId } });
    if (!wallet) throw new NotFoundException('Carteira não encontrada');
    const delta = dto.movementType === FinancePrepaidMovementType.CREDIT ? dto.amount : -dto.amount;
    const next = Number(wallet.balance) + delta;
    if (next < 0) throw new BadRequestException('Saldo insuficiente');
    wallet.balance = next;
    await this.prepaidRepo.save(wallet);
    await this.prepaidMovRepo.save(
      this.prepaidMovRepo.create({ walletId, movementType: dto.movementType, amount: dto.amount, description: dto.description ?? null }),
    );
    return wallet;
  }

  // —— Recibos ——
  listReceipts(tenantId: string) {
    return this.receiptsRepo.find({
      where: { tenantId },
      order: { issuedAt: 'DESC' },
    });
  }

  async createReceipt(tenantId: string, dto: CreateReceiptDto) {
    const count = await this.receiptsRepo.count({ where: { tenantId } });
    const receiptNumber = `REC-${String(count + 1).padStart(6, '0')}`;
    return this.receiptsRepo.save(
      this.receiptsRepo.create({
        tenantId,
        receiptNumber,
        issuedTo: dto.issuedTo.trim(),
        amount: dto.amount,
        description: dto.description.trim(),
        issuedAt: dto.issuedAt ?? new Date().toISOString().slice(0, 10),
        transactionId: dto.transactionId ?? null,
      }),
    );
  }
}
