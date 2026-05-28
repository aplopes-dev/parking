export type FinanceTransactionType = 'income' | 'expense';
export type FinanceAccountType = 'cash' | 'bank' | 'card' | 'digital' | 'other';
export type FinanceBillType = 'payable' | 'receivable';
export type FinanceBillStatus = 'open' | 'partial' | 'paid' | 'cancelled';

export type FinanceAccount = {
  id: string;
  name: string;
  type: FinanceAccountType;
  description?: string | null;
  active: boolean;
};

export type FinanceCategory = {
  id: string;
  name: string;
  type: FinanceTransactionType;
  level: string;
  parentId?: string | null;
  active: boolean;
};

export type FinanceTag = { id: string; name: string; color: string; active: boolean };

export type FinanceSource = {
  id: string;
  name: string;
  type: FinanceTransactionType;
  active: boolean;
};

export type FinanceTransaction = {
  id: string;
  type: FinanceTransactionType;
  description: string;
  amount: number | string;
  transactionDate: string;
  notes?: string | null;
  accountId?: string | null;
  sourceId?: string | null;
  categoryId?: string | null;
  account?: FinanceAccount | null;
  category?: FinanceCategory | null;
  source?: FinanceSource | null;
  tags?: FinanceTag[];
  origin?: string;
};

export type FinanceBill = {
  id: string;
  billType: FinanceBillType;
  description: string;
  counterpartyName: string;
  amount: number | string;
  paidAmount: number | string;
  dueDate: string;
  status: FinanceBillStatus;
  account?: FinanceAccount | null;
  category?: FinanceCategory | null;
};

export type FinanceOverview = {
  summary: { totalIncome: number; totalExpense: number; balance: number };
  transactions: FinanceTransaction[];
  accounts: FinanceAccount[];
  sources: { id: string; name: string; type: FinanceTransactionType; active: boolean }[];
  categories: FinanceCategory[];
  tags: { id: string; name: string; color: string; active: boolean }[];
};

export type FinancePeriod = { from?: string; to?: string };

export type TenantUser = { id: string; name: string; email: string; role: string };
