export type PeriodQuery = { from?: string; to?: string };

export type RealtimeAnalytics = {
  asOf: string;
  openOrders: number;
  todayClosed: number;
  todayRevenue: number;
  lastHourRevenue: number;
  ordersByStatus: { status: string; count: number }[];
  last7Days: { date: string; revenue: number; orders: number }[];
};

export type IndicatorMetric = {
  key: string;
  label: string;
  value: number;
  previousValue: number;
  changePct: number | null;
  target: number | null;
  targetLabel: string | null;
  progressPct: number | null;
};

export type SalesReport = {
  period: { from: string; to: string };
  summary: { revenue: number; closedOrders: number; avgTicket: number };
  byType: { type: string; orders: number; total: number }[];
  byPayment: { method: string; total: number; count: number }[];
  daily: { date: string; revenue: number }[];
  topProducts: { name: string; quantity: number; total: number }[];
};

export type ReportsOverview = {
  period: { from: string; to: string };
  sales: SalesReport['summary'];
  stock: { totalSkus: number; locationsWithStock: number; belowMinimumCount: number };
  finance: unknown;
};
