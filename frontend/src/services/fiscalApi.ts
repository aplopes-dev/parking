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
import type { PaginatedResponse, SortDirection } from '../types/pagination';

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

export async function fetchFiscalOrders(params?: {
  orderType?: FiscalOrderType;
  status?: FiscalOrderStatus;
  from?: string;
  to?: string;
}): Promise<FiscalOrder[]> {
  const { data } = await api.get<FiscalOrder[]>('/fiscal/orders', { params });
  return data;
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

export async function fetchFiscalInvoices(params?: {
  invoiceType?: FiscalInvoiceType;
  direction?: FiscalInvoiceDirection;
  status?: FiscalInvoiceStatus;
}): Promise<FiscalInvoice[]> {
  const { data } = await api.get<FiscalInvoice[]>('/fiscal/invoices', { params });
  return data;
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

export async function fetchNumberVoids() {
  const { data } = await api.get('/fiscal/number-voids');
  return data;
}

export async function createNumberVoid(body: Record<string, unknown>) {
  const { data } = await api.post('/fiscal/number-voids', body);
  return data;
}

export async function fetchAccountants() {
  const { data } = await api.get('/fiscal/accountants');
  return data;
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
