import api from './api';
import type {
  FiscalInvoice,
  FiscalInvoiceDirection,
  FiscalInvoiceStatus,
  FiscalInvoiceType,
  FiscalOrder,
  FiscalOrderStatus,
  FiscalOrderType,
  FiscalOverview,
  FiscalReturnType,
  FiscalSettings,
} from '../types/fiscal';
import {
  DEFAULT_PAGE_SIZE,
  type PaginatedMeta,
  type PaginatedResponse,
  type SortDirection,
} from '../types/pagination';
import { normalizePaginatedResponse } from '../utils/paginatedResponse';

export type FiscalListParams = { page?: number; limit?: number };
export type FiscalListResult<T> = { items: T[]; meta: PaginatedMeta };

async function fetchFiscalList<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<FiscalListResult<T>> {
  const page = Number(params?.page ?? 1);
  const limit = Number(params?.limit ?? DEFAULT_PAGE_SIZE);
  const { data } = await api.get<PaginatedResponse<T> | T[]>(url, { params });
  const normalized = normalizePaginatedResponse(data, { page, limit });
  return { items: normalized.items, meta: normalized.meta };
}

export async function fetchFiscalOverview(): Promise<FiscalOverview> {
  const { data } = await api.get<FiscalOverview>('/fiscal/overview');
  return data;
}

export async function fetchFiscalSettings(): Promise<FiscalSettings> {
  const { data } = await api.get<FiscalSettings>('/fiscal/settings');
  return data;
}

export async function updateFiscalSettings(body: Partial<FiscalSettings>) {
  const { data } = await api.patch<FiscalSettings>('/fiscal/settings', body);
  return data;
}

export async function fetchFiscalOrders(params?: FiscalListParams & {
  orderType?: FiscalOrderType;
  status?: FiscalOrderStatus;
  from?: string;
  to?: string;
}): Promise<FiscalListResult<FiscalOrder>> {
  return fetchFiscalList<FiscalOrder>('/fiscal/orders', params);
}

export async function fetchAllFiscalOrders(params?: {
  orderType?: FiscalOrderType;
  status?: FiscalOrderStatus;
  from?: string;
  to?: string;
}): Promise<FiscalOrder[]> {
  const { items } = await fetchFiscalOrders({ ...params, page: 1, limit: 100 });
  return items;
}

export async function getFiscalOrder(id: string) {
  const { data } = await api.get<FiscalOrder>(`/fiscal/orders/${id}`);
  return data;
}

export async function createFiscalOrder(body: Record<string, unknown>) {
  const { data } = await api.post<FiscalOrder>('/fiscal/orders', body);
  return data;
}

export async function createFiscalOrderFromPdv(body: { pdvOrderId: string; orderType: FiscalOrderType }) {
  const { data } = await api.post<FiscalOrder>('/fiscal/orders/from-pdv', body);
  return data;
}

export async function updateFiscalOrder(id: string, body: Record<string, unknown>) {
  const { data } = await api.patch<FiscalOrder>(`/fiscal/orders/${id}`, body);
  return data;
}

export async function fetchFiscalReturns(params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortDirection;
  search?: string;
  returnType?: FiscalReturnType | '';
  dateFrom?: string;
  dateTo?: string;
}) {
  const { data } = await api.get<PaginatedResponse<any>>('/fiscal/returns', { params });
  return data;
}

export async function createFiscalReturn(body: {
  returnType: FiscalReturnType;
  reason: string;
  returnDate: string;
  totalAmount: number;
  fiscalOrderId?: string;
  fiscalInvoiceId?: string;
}) {
  const { data } = await api.post('/fiscal/returns', body);
  return data;
}

export async function updateFiscalReturn(id: string, body: {
  returnType?: FiscalReturnType;
  reason?: string;
  returnDate?: string;
  totalAmount?: number;
  fiscalOrderId?: string;
  fiscalInvoiceId?: string;
}) {
  const { data } = await api.patch(`/fiscal/returns/${id}`, body);
  return data;
}

export async function deleteFiscalReturn(id: string) {
  const { data } = await api.delete(`/fiscal/returns/${id}`);
  return data;
}

export async function fetchFiscalInvoices(params?: FiscalListParams & {
  invoiceType?: FiscalInvoiceType;
  direction?: FiscalInvoiceDirection;
  status?: FiscalInvoiceStatus;
  from?: string;
  to?: string;
}): Promise<FiscalListResult<FiscalInvoice>> {
  return fetchFiscalList<FiscalInvoice>('/fiscal/invoices', params);
}

export async function fetchAllFiscalInvoices(params?: {
  invoiceType?: FiscalInvoiceType;
  direction?: FiscalInvoiceDirection;
  status?: FiscalInvoiceStatus;
}): Promise<FiscalInvoice[]> {
  const { items } = await fetchFiscalInvoices({ ...params, page: 1, limit: 100 });
  return items;
}

export async function emitFiscalInvoice(body: Record<string, unknown>) {
  const { data } = await api.post<FiscalInvoice>('/fiscal/invoices/emit', body);
  return data;
}

export async function cancelFiscalInvoice(id: string, reason: string) {
  const { data } = await api.post<FiscalInvoice>(`/fiscal/invoices/${id}/cancel`, { reason });
  return data;
}

export async function importFiscalInvoice(payload: FormData | { xmlContent: string; invoiceType?: FiscalInvoiceType }) {
  const isForm = payload instanceof FormData;
  const { data } = await api.post<FiscalInvoice>('/fiscal/invoices/import', payload, {
    headers: isForm ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return data;
}

export async function fetchNumberVoids(params?: FiscalListParams) {
  return fetchFiscalList<any>('/fiscal/number-voids', params);
}

export async function createNumberVoid(body: Record<string, unknown>) {
  const { data } = await api.post('/fiscal/number-voids', body);
  return data;
}

export async function fetchAccountants(params?: FiscalListParams) {
  return fetchFiscalList<any>('/fiscal/accountants', params);
}

export async function createAccountant(body: Record<string, unknown>) {
  const { data } = await api.post('/fiscal/accountants', body);
  return data;
}

export async function updateAccountant(id: string, body: Record<string, unknown>) {
  const { data } = await api.patch(`/fiscal/accountants/${id}`, body);
  return data;
}

export async function deleteAccountant(id: string) {
  await api.delete(`/fiscal/accountants/${id}`);
}
