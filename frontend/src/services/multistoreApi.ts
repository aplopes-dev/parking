import api from './api';

export type MultistoreUnit = {
  id: string;
  name: string;
  slug: string;
  unitLabel: string | null;
  displayName: string;
  isCurrent: boolean;
};

export type MultistoreGroup = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unitCount: number;
};

export type MultistoreContext = {
  inGroup: boolean;
  currentTenant: MultistoreUnit;
  group: MultistoreGroup | null;
  units: MultistoreUnit[];
};

export type ConsolidatedReport = {
  period: { from: string; to: string };
  group: { id: string; code: string; name: string };
  summary: {
    unitCount: number;
    revenue: number;
    closedOrders: number;
    avgTicket: number;
  };
  byUnit: {
    tenantId: string;
    slug: string;
    name: string;
    unitLabel: string | null;
    displayName: string;
    revenue: number;
    closedOrders: number;
    avgTicket: number;
  }[];
  byType: { type: string; orders: number; total: number }[];
  daily: { date: string; revenue: number }[];
};

export async function fetchMultistoreContext(): Promise<MultistoreContext> {
  const { data } = await api.get<MultistoreContext>('/multistore/context');
  return data;
}

export async function createStoreGroup(body: {
  name: string;
  code?: string;
  description?: string;
  unitLabel?: string;
}) {
  const { data } = await api.post<MultistoreContext>('/multistore/group', body);
  return data;
}

export async function updateStoreGroup(body: { name?: string; description?: string }) {
  const { data } = await api.patch<MultistoreContext>('/multistore/group', body);
  return data;
}

export async function joinStoreGroup(body: { code: string; unitLabel?: string }) {
  const { data } = await api.post<MultistoreContext>('/multistore/group/join', body);
  return data;
}

export async function leaveStoreGroup() {
  const { data } = await api.post<MultistoreContext>('/multistore/group/leave');
  return data;
}

export async function updateMultistoreUnitLabel(unitLabel: string) {
  const { data } = await api.patch<MultistoreContext>('/multistore/unit', { unitLabel });
  return data;
}

export async function fetchConsolidatedReport(params?: {
  from?: string;
  to?: string;
}): Promise<ConsolidatedReport> {
  const { data } = await api.get<ConsolidatedReport>('/multistore/reports/consolidated', {
    params,
  });
  return data;
}

export type AccessibleStore = {
  tenantId: string;
  slug: string;
  name: string;
  unitLabel: string | null;
  displayName: string;
  isCurrent: boolean;
  canSwitch: boolean;
};

export type AccessibleStoresResponse = {
  inGroup: boolean;
  group: { id: string; code: string; name: string } | null;
  stores: AccessibleStore[];
};

export type ConsolidatedFinanceReport = {
  period: { from: string; to: string };
  group: { id: string; code: string; name: string };
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    transactionCount: number;
    overdueBills: number;
  };
  byUnit: {
    tenantId: string;
    displayName: string;
    totalIncome: number;
    totalExpense: number;
    balance: number;
    transactionCount: number;
  }[];
};

export type ConsolidatedStockReport = {
  group: { id: string; code: string; name: string };
  summary: {
    totalSkus: number;
    locationsWithStock: number;
    belowMinimumCount: number;
  };
  byUnit: {
    tenantId: string;
    displayName: string;
    skus: number;
    belowMinimum: number;
  }[];
};

export async function fetchAccessibleStores(): Promise<AccessibleStoresResponse> {
  const { data } = await api.get<AccessibleStoresResponse>('/multistore/accessible-stores');
  return data;
}

export async function switchTenant(tenantId: string): Promise<{
  access_token: string;
  user: { id: string; email: string; name: string; role: string; tenantId: string; tenant?: { slug: string } };
}> {
  const { data } = await api.post('/multistore/switch-tenant', { tenantId });
  return data;
}

export async function fetchConsolidatedFinance(params?: {
  from?: string;
  to?: string;
}): Promise<ConsolidatedFinanceReport> {
  const { data } = await api.get<ConsolidatedFinanceReport>('/multistore/reports/finance', {
    params,
  });
  return data;
}

export async function fetchConsolidatedStock(): Promise<ConsolidatedStockReport> {
  const { data } = await api.get<ConsolidatedStockReport>('/multistore/reports/stock');
  return data;
}

export async function lookupStoreGroup(code: string): Promise<{
  exists: boolean;
  code?: string;
  name?: string;
}> {
  const { data } = await api.get(`/tenants/store-group/${encodeURIComponent(code.trim().toLowerCase())}`);
  return data;
}
