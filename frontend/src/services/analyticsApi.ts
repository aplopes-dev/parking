import api from './api';
import type { PeriodQuery, RealtimeAnalytics, SalesReport } from '../types/analytics';

export async function fetchRealtimeAnalytics(): Promise<RealtimeAnalytics> {
  const { data } = await api.get<RealtimeAnalytics>('/analytics/realtime');
  return data;
}

export async function fetchIndicators(params?: PeriodQuery) {
  const { data } = await api.get('/analytics/indicators', { params });
  return data;
}

export async function fetchOnlineAccess(params?: PeriodQuery) {
  const { data } = await api.get('/analytics/online-access', { params });
  return data;
}

export async function logOnlineAccess(channel: string, source = 'menu') {
  const { data } = await api.post('/analytics/online-access', { channel, source });
  return data;
}

export async function fetchKpiTargets() {
  const { data } = await api.get('/analytics/kpi-targets');
  return data;
}

export async function upsertKpiTarget(body: Record<string, unknown>) {
  const { data } = await api.put('/analytics/kpi-targets', body);
  return data;
}

export async function seedKpiTargets() {
  const { data } = await api.post('/analytics/kpi-targets/seed');
  return data;
}

export async function fetchReportsOverview(params?: PeriodQuery) {
  const { data } = await api.get('/reports/overview', { params });
  return data;
}

export async function fetchSalesReport(params?: PeriodQuery): Promise<SalesReport> {
  const { data } = await api.get<SalesReport>('/reports/sales', { params });
  return data;
}

export async function fetchStockReport() {
  const { data } = await api.get('/reports/stock');
  return data;
}

export async function fetchReportsFinance(params?: PeriodQuery) {
  const { data } = await api.get('/reports/finance', { params });
  return data;
}
