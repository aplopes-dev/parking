import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { FinanceBill, FinanceBillStatus } from './entities/finance-extended.entities';
import {
  FinanceCategory,
  FinanceTransaction,
  FinanceTransactionType,
} from './entities/finance.entities';
import { FinanceAccount } from './entities/finance.entities';
import { FinancePeriodQueryDto, FinanceCalendarQueryDto } from './dto/finance-operations.dto';
import { FinanceService } from './finance.service';

@Injectable()
export class FinanceReportsService {
  constructor(
    private readonly finance: FinanceService,
    @InjectRepository(FinanceTransaction)
    private readonly txRepo: Repository<FinanceTransaction>,
    @InjectRepository(FinanceBill) private readonly billsRepo: Repository<FinanceBill>,
    @InjectRepository(FinanceCategory)
    private readonly categoriesRepo: Repository<FinanceCategory>,
    @InjectRepository(FinanceAccount) private readonly accountsRepo: Repository<FinanceAccount>,
  ) {}

  async getCalendar(tenantId: string, query: FinanceCalendarQueryDto) {
    const [year, month] = query.month.split('-').map(Number);
    if (!year || !month) throw new NotFoundException('Mês inválido (use YYYY-MM)');
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const [transactions, bills] = await Promise.all([
      this.txRepo.find({
        where: { tenantId, transactionDate: Between(from, to) },
        order: { transactionDate: 'ASC' },
      }),
      this.billsRepo.find({
        where: { tenantId, dueDate: Between(from, to) },
        order: { dueDate: 'ASC' },
      }),
    ]);

    const days: Record<string, { transactions: FinanceTransaction[]; bills: FinanceBill[] }> = {};
    for (const tx of transactions) {
      const d = tx.transactionDate.slice(0, 10);
      if (!days[d]) days[d] = { transactions: [], bills: [] };
      days[d].transactions.push(tx);
    }
    for (const bill of bills) {
      const d = bill.dueDate.slice(0, 10);
      if (!days[d]) days[d] = { transactions: [], bills: [] };
      days[d].bills.push(bill);
    }
    return { month: query.month, from, to, days };
  }

  async getAccountStatement(tenantId: string, accountId: string, query: FinancePeriodQueryDto) {
    const account = await this.accountsRepo.findOne({ where: { id: accountId, tenantId } });
    if (!account) throw new NotFoundException('Conta não encontrada');
    const transactions = await this.txRepo.find({
      where: {
        tenantId,
        accountId,
        ...(query.from && query.to
          ? { transactionDate: Between(query.from, query.to) }
          : {}),
      },
      order: { transactionDate: 'ASC', createdAt: 'ASC' },
    });

    let balance = 0;
    const lines = transactions.map((tx) => {
      const amount = Number(tx.amount);
      const delta = tx.type === FinanceTransactionType.INCOME ? amount : -amount;
      balance += delta;
      return {
        id: tx.id,
        date: tx.transactionDate,
        description: tx.description,
        type: tx.type,
        amount,
        balanceAfter: balance,
        origin: tx.origin,
      };
    });

    return { accountId, from: query.from, to: query.to, lines, closingBalance: balance };
  }

  async getDre(tenantId: string, query: FinancePeriodQueryDto) {
    const qb = this.txRepo
      .createQueryBuilder('tx')
      .leftJoin('tx.category', 'cat')
      .where('tx.tenantId = :tenantId', { tenantId });
    if (query.from) qb.andWhere('tx.transactionDate >= :from', { from: query.from });
    if (query.to) qb.andWhere('tx.transactionDate <= :to', { to: query.to });

    const rows = await qb
      .select('tx.type', 'type')
      .addSelect('COALESCE(cat.name, \'Sem categoria\')', 'categoryName')
      .addSelect('SUM(tx.amount)', 'total')
      .groupBy('tx.type')
      .addGroupBy('cat.name')
      .getRawMany<{ type: string; categoryName: string; total: string }>();

    let income = 0;
    let expense = 0;
    const byCategory: Array<{ type: string; category: string; total: number }> = [];
    for (const row of rows) {
      const total = Number(row.total);
      byCategory.push({ type: row.type, category: row.categoryName, total });
      if (row.type === FinanceTransactionType.INCOME) income += total;
      else expense += total;
    }

    const openPayables = await this.billsRepo
      .createQueryBuilder('b')
      .where('b.tenantId = :tenantId', { tenantId })
      .andWhere('b.bill_type = :t', { t: 'payable' })
      .andWhere('b.status IN (:...st)', { st: [FinanceBillStatus.OPEN, FinanceBillStatus.PARTIAL] })
      .select('SUM(b.amount - b.paid_amount)', 'open')
      .getRawOne<{ open: string }>();

    return {
      period: query,
      income,
      expense,
      result: income - expense,
      byCategory,
      openPayables: Number(openPayables?.open ?? 0),
    };
  }

  async getCashFlow(tenantId: string, query: FinancePeriodQueryDto) {
    const qb = this.txRepo
      .createQueryBuilder('tx')
      .where('tx.tenantId = :tenantId', { tenantId });
    if (query.from) qb.andWhere('tx.transactionDate >= :from', { from: query.from });
    if (query.to) qb.andWhere('tx.transactionDate <= :to', { to: query.to });

    const rows = await qb
      .select("TO_CHAR(tx.transaction_date, 'YYYY-MM')", 'month')
      .addSelect('tx.type', 'type')
      .addSelect('SUM(tx.amount)', 'total')
      .groupBy("TO_CHAR(tx.transaction_date, 'YYYY-MM')")
      .addGroupBy('tx.type')
      .orderBy('month', 'ASC')
      .getRawMany<{ month: string; type: string; total: string }>();

    const map = new Map<string, { inflow: number; outflow: number }>();
    for (const row of rows) {
      const entry = map.get(row.month) ?? { inflow: 0, outflow: 0 };
      if (row.type === FinanceTransactionType.INCOME) entry.inflow += Number(row.total);
      else entry.outflow += Number(row.total);
      map.set(row.month, entry);
    }

    const months = [...map.entries()].map(([month, v]) => ({
      month,
      inflow: v.inflow,
      outflow: v.outflow,
      net: v.inflow - v.outflow,
    }));

    return { period: query, months };
  }

  async getFinanceDashboard(tenantId: string, query: FinancePeriodQueryDto) {
    const overview = await this.finance.getOverview(tenantId, {
      from: query.from,
      to: query.to,
    });
    const dre = await this.getDre(tenantId, query);
    const cashFlow = await this.getCashFlow(tenantId, query);
    const today = new Date().toISOString().slice(0, 10);
    const overdueBills = await this.billsRepo
      .createQueryBuilder('b')
      .where('b.tenant_id = :tenantId', { tenantId })
      .andWhere('b.status IN (:...st)', {
        st: [FinanceBillStatus.OPEN, FinanceBillStatus.PARTIAL],
      })
      .andWhere('b.due_date < :today', { today })
      .getCount();
    return { overview: overview.summary, dre, cashFlow, overdueBills };
  }
}
