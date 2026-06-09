import api from './api';
import type {
  FinanceAccount,
  FinanceBill,
  FinanceBillType,
  FinanceOverview,
  FinancePeriod,
  FinanceTransaction,
  FinanceTransactionType,
  TenantUser,
} from '../types/finance';
import { DEFAULT_PAGE_SIZE, type PaginatedMeta, type PaginatedResponse } from '../types/pagination';
import { normalizePaginatedResponse } from '../utils/paginatedResponse';

export type FinanceListParams = { page?: number; limit?: number };
export type FinanceListResult<T> = { items: T[]; meta: PaginatedMeta };

async function fetchFinanceList<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<FinanceListResult<T>> {
  const page = Number(params?.page ?? 1);
  const limit = Number(params?.limit ?? DEFAULT_PAGE_SIZE);
  const { data } = await api.get<PaginatedResponse<T> | T[]>(url, { params });
  const normalized = normalizePaginatedResponse(data, { page, limit });
  return { items: normalized.items, meta: normalized.meta };
}

export async function fetchFinanceOverview(params?: FinancePeriod & {
  type?: FinanceTransactionType;
  accountId?: string;
}): Promise<FinanceOverview> {
  const { data } = await api.get<FinanceOverview>('/finance/overview', { params });
  return data;
}

export async function createFinanceTransaction(payload: FormData | Record<string, unknown>) {
  const isForm = payload instanceof FormData;
  const { data } = await api.post<FinanceTransaction>('/finance/transactions', payload, {
    headers: isForm ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return data;
}

export async function deleteFinanceTransaction(id: string) {
  await api.delete(`/finance/transactions/${id}`);
}

export async function createFinanceAccount(body: Partial<FinanceAccount>) {
  const { data } = await api.post<FinanceAccount>('/finance/accounts', body);
  return data;
}

export async function updateFinanceAccount(id: string, body: Partial<FinanceAccount>) {
  const { data } = await api.patch<FinanceAccount>(`/finance/accounts/${id}`, body);
  return data;
}

export async function deleteFinanceAccount(id: string) {
  await api.delete(`/finance/accounts/${id}`);
}

export async function createFinanceSource(body: Record<string, unknown>) {
  const { data } = await api.post('/finance/sources', body);
  return data;
}

export async function updateFinanceSource(id: string, body: Record<string, unknown>) {
  const { data } = await api.patch(`/finance/sources/${id}`, body);
  return data;
}

export async function deleteFinanceSource(id: string) {
  await api.delete(`/finance/sources/${id}`);
}

export async function createFinanceCategory(body: Record<string, unknown>) {
  const { data } = await api.post('/finance/categories', body);
  return data;
}

export async function updateFinanceCategory(id: string, body: Record<string, unknown>) {
  const { data } = await api.patch(`/finance/categories/${id}`, body);
  return data;
}

export async function deleteFinanceCategory(id: string) {
  await api.delete(`/finance/categories/${id}`);
}

export async function createFinanceTag(body: Record<string, unknown>) {
  const { data } = await api.post('/finance/tags', body);
  return data;
}

export async function updateFinanceTag(id: string, body: Record<string, unknown>) {
  const { data } = await api.patch(`/finance/tags/${id}`, body);
  return data;
}

export async function deleteFinanceTag(id: string) {
  await api.delete(`/finance/tags/${id}`);
}

export async function updateFinanceTransaction(id: string, payload: FormData | Record<string, unknown>) {
  const isForm = payload instanceof FormData;
  const { data } = await api.patch<FinanceTransaction>(`/finance/transactions/${id}`, payload, {
    headers: isForm ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return data;
}

export async function fetchBills(
  params?: FinanceListParams & { billType?: FinanceBillType },
): Promise<FinanceListResult<FinanceBill>> {
  return fetchFinanceList<FinanceBill>('/finance/bills', params);
}

export async function createBill(body: Record<string, unknown>) {
  const { data } = await api.post<FinanceBill>('/finance/bills', body);
  return data;
}

export async function settleBills(body: Record<string, unknown>) {
  const { data } = await api.post('/finance/bills/settle', body);
  return data;
}

export async function settleByCounterparty(body: Record<string, unknown>) {
  const { data } = await api.post('/finance/bills/settle-by-counterparty', body);
  return data;
}

export async function fetchTransfers(params?: FinanceListParams) {
  return fetchFinanceList<any>('/finance/transfers', params);
}

export async function createTransfer(body: Record<string, unknown>) {
  const { data } = await api.post('/finance/transfers', body);
  return data;
}

export async function fetchRecurring(params?: FinanceListParams) {
  return fetchFinanceList<any>('/finance/recurring', params);
}

export async function createRecurring(body: Record<string, unknown>) {
  const { data } = await api.post('/finance/recurring', body);
  return data;
}

export async function runRecurringDue() {
  const { data } = await api.post('/finance/recurring/run-due');
  return data;
}

export async function fetchAdvances(params?: FinanceListParams) {
  return fetchFinanceList<any>('/finance/advances', params);
}

export async function createAdvance(body: Record<string, unknown>) {
  const { data } = await api.post('/finance/advances', body);
  return data;
}

export async function fetchPayrollRuns(params?: FinanceListParams) {
  return fetchFinanceList<any>('/finance/payroll', params);
}

export async function fetchPayrollUsers(): Promise<TenantUser[]> {
  const { data } = await api.get<TenantUser[]>('/finance/payroll/users');
  return data;
}

export async function createPayrollRun(body: Record<string, unknown>) {
  const { data } = await api.post('/finance/payroll', body);
  return data;
}

export async function getPayrollRun(id: string) {
  const { data } = await api.get(`/finance/payroll/${id}`);
  return data;
}

export async function addPayrollLine(id: string, body: Record<string, unknown>) {
  const { data } = await api.post(`/finance/payroll/${id}/lines`, body);
  return data;
}

export async function closePayroll(id: string, accountId: string) {
  const { data } = await api.post(`/finance/payroll/${id}/close`, { accountId });
  return data;
}

export async function deletePayrollRun(id: string) {
  const { data } = await api.delete(`/finance/payroll/${id}`);
  return data;
}

export async function fetchCashSessions(params?: FinanceListParams) {
  return fetchFinanceList<any>('/finance/cash-sessions', params);
}

export async function openCashSession(body: Record<string, unknown>) {
  const { data } = await api.post('/finance/cash-sessions/open', body);
  return data;
}

export async function closeCashSession(id: string, body: Record<string, unknown>) {
  const { data } = await api.post(`/finance/cash-sessions/${id}/close`, body);
  return data;
}

export async function fetchDailyReconciliation(params?: FinancePeriod) {
  const { data } = await api.get('/finance/daily-reconciliation', { params });
  return data;
}

export async function upsertDailyReconciliation(body: Record<string, unknown>) {
  const { data } = await api.post('/finance/daily-reconciliation', body);
  return data;
}

export async function fetchCardReceivables(params?: FinanceListParams) {
  return fetchFinanceList<any>('/finance/card-receivables', params);
}

export async function createCardReceivable(body: Record<string, unknown>) {
  const { data } = await api.post('/finance/card-receivables', body);
  return data;
}

export async function depositCard(id: string, accountId: string) {
  const { data } = await api.post(`/finance/card-receivables/${id}/deposit`, { accountId });
  return data;
}

export async function fetchBankLines(params?: FinanceListParams & { accountId?: string }) {
  return fetchFinanceList<any>('/finance/bank-lines', params);
}

export async function createBankLine(body: Record<string, unknown>) {
  const { data } = await api.post('/finance/bank-lines', body);
  return data;
}

export async function matchBankLine(lineId: string, transactionId: string) {
  const { data } = await api.post(`/finance/bank-lines/${lineId}/match`, { transactionId });
  return data;
}

export async function fetchPrepaidWallets(params?: FinanceListParams) {
  return fetchFinanceList<any>('/finance/prepaid-wallets', params);
}

export async function createPrepaidWallet(body: Record<string, unknown>) {
  const { data } = await api.post('/finance/prepaid-wallets', body);
  return data;
}

export async function prepaidMovement(walletId: string, body: Record<string, unknown>) {
  const { data } = await api.post(`/finance/prepaid-wallets/${walletId}/movements`, body);
  return data;
}

export async function fetchReceipts(params?: FinanceListParams) {
  return fetchFinanceList<any>('/finance/receipts', params);
}

export async function createReceipt(body: Record<string, unknown>) {
  const { data } = await api.post('/finance/receipts', body);
  return data;
}

export async function fetchCalendar(month: string) {
  const { data } = await api.get('/finance/reports/calendar', { params: { month } });
  return data;
}

export async function fetchStatement(accountId: string, params?: FinancePeriod) {
  const { data } = await api.get(`/finance/reports/statement/${accountId}`, { params });
  return data;
}

export async function fetchDre(params?: FinancePeriod) {
  const { data } = await api.get('/finance/reports/dre', { params });
  return data;
}

export async function fetchCashFlow(params?: FinancePeriod) {
  const { data } = await api.get('/finance/reports/cash-flow', { params });
  return data;
}

export async function fetchFinanceDashboard(params?: FinancePeriod) {
  const { data } = await api.get('/finance/reports/dashboard', { params });
  return data;
}
