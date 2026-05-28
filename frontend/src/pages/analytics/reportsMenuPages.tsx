import React, { useCallback, useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  fetchReportsFinance,
  fetchReportsOverview,
  fetchSalesReport,
  fetchStockReport,
} from '../../services/analyticsApi';
import { fetchFinanceDashboard } from '../../services/financeApi';
import {
  AccessDenied,
  AnalyticsPeriodBar,
  AnalyticsSection,
  formatDateLabel,
  ORDER_TYPE_LABEL,
  PAYMENT_LABEL,
  REPORTS_MODULE_LABEL,
  ReportPrintFooter,
  ReportPrintHeader,
  ReportSummaryCards,
  ReportTable,
  ReportsPageLayout,
  firstDayOfMonth,
  formatMoney,
  todayIso,
  useAnalyticsAccess,
} from './analyticsShared';
import { formatItemQty } from '../pdv/pdvUtils';

// —— Relatórios gerais ——
export const ReportsOverviewPage: React.FC = () => {
  const can = useAnalyticsAccess();
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayIso());
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    setData(await fetchReportsOverview({ from, to }));
  }, [from, to]);

  useEffect(() => {
    if (can) load();
  }, [can, load]);

  if (!can) return <AccessDenied moduleLabel={REPORTS_MODULE_LABEL} />;

  return (
    <ReportsPageLayout
      title="Relatórios gerais"
      description="Visão consolidada: vendas, estoque e financeiro."
      actions={data ? <button type="button" className="btn-primary" onClick={() => window.print()}>Imprimir relatório</button> : undefined}
    >
      <div className="no-print">
        <AnalyticsPeriodBar from={from} to={to} onFrom={setFrom} onTo={setTo} extra={<button type="button" className="btn-primary" onClick={load}>Atualizar</button>} />
      </div>

      {data && (
        <div className="report-print-area">
          <ReportPrintHeader title="Relatório Geral" subtitle="Visão consolidada: vendas, estoque e financeiro" meta={[{ label: 'Período', value: `${formatDateLabel(from)} a ${formatDateLabel(to)}` }]} />

          <ReportSummaryCards items={[
            { label: 'Faturamento', value: formatMoney(data.sales?.revenue ?? 0) },
            { label: 'Pedidos', value: String(data.sales?.closedOrders ?? 0) },
            { label: 'Ticket médio', value: formatMoney(data.sales?.avgTicket ?? 0) },
            { label: 'SKUs ativos', value: String(data.stock?.totalSkus ?? 0) },
            { label: 'Abaixo do mínimo', value: String(data.stock?.belowMinimumCount ?? 0) },
          ]} />

          {data.finance?.overview && (
            <ReportTable
              title="Resumo financeiro"
              headers={['Indicador', 'Valor']}
              rows={[
                ['Receitas', formatMoney(data.finance.overview.totalIncome ?? 0)],
                ['Despesas', formatMoney(data.finance.overview.totalExpense ?? 0)],
                ['Saldo', formatMoney(data.finance.overview.balance ?? 0)],
              ]}
            />
          )}

          <ReportPrintFooter />
        </div>
      )}
    </ReportsPageLayout>
  );
};

// —— Vendas ——
export const ReportsSalesPage: React.FC = () => {
  const can = useAnalyticsAccess();
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayIso());
  const [report, setReport] = useState<Awaited<ReturnType<typeof fetchSalesReport>> | null>(null);

  const load = useCallback(async () => {
    setReport(await fetchSalesReport({ from, to }));
  }, [from, to]);

  useEffect(() => {
    if (can) load();
  }, [can, load]);

  if (!can) return <AccessDenied moduleLabel={REPORTS_MODULE_LABEL} />;

  const byTypeTotals = report ? report.byType.reduce((s, r) => ({ orders: s.orders + r.orders, total: s.total + r.total }), { orders: 0, total: 0 }) : null;
  const byPayTotals = report ? report.byPayment.reduce((s, r) => ({ count: s.count + r.count, total: s.total + r.total }), { count: 0, total: 0 }) : null;
  const topTotals = report ? report.topProducts.reduce((s, r) => ({ qty: s.qty + r.quantity, total: s.total + r.total }), { qty: 0, total: 0 }) : null;

  return (
    <ReportsPageLayout
      title="Relatórios de vendas"
      description="Faturamento, canais, pagamentos e produtos mais vendidos."
      actions={report ? <button type="button" className="btn-primary" onClick={() => window.print()}>Imprimir relatório</button> : undefined}
    >
      <div className="no-print">
        <AnalyticsPeriodBar from={from} to={to} onFrom={setFrom} onTo={setTo} extra={<button type="button" className="btn-primary" onClick={load}>Atualizar</button>} />
      </div>

      {report && (
        <div className="report-print-area">
          <ReportPrintHeader title="Relatório de Vendas" subtitle="Faturamento, canais, pagamentos e produtos mais vendidos" meta={[{ label: 'Período', value: `${formatDateLabel(from)} a ${formatDateLabel(to)}` }]} />

          <ReportSummaryCards items={[
            { label: 'Faturamento', value: formatMoney(report.summary.revenue) },
            { label: 'Pedidos fechados', value: String(report.summary.closedOrders) },
            { label: 'Ticket médio', value: formatMoney(report.summary.avgTicket) },
          ]} />

          {report.daily.length > 0 && (
            <div className="no-print">
              <AnalyticsSection title="Faturamento diário" kicker="Gráfico">
                <div className="analytics-chart-wrap">
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={report.daily}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
                      <YAxis tickFormatter={(v) => `R$${v}`} />
                      <Tooltip formatter={(v: number) => formatMoney(v)} />
                      <Line type="monotone" dataKey="revenue" stroke="#ea1d2c" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </AnalyticsSection>
            </div>
          )}

          <ReportTable
            title="Vendas por canal"
            headers={['Canal', 'Pedidos', 'Total']}
            rows={report.byType.map((r) => [ORDER_TYPE_LABEL[r.type] ?? r.type, String(r.orders), formatMoney(r.total)])}
            footer={byTypeTotals ? ['Total', String(byTypeTotals.orders), formatMoney(byTypeTotals.total)] : undefined}
          />

          <ReportTable
            title="Vendas por forma de pagamento"
            headers={['Forma', 'Qtd', 'Total']}
            rows={report.byPayment.map((r) => [PAYMENT_LABEL[r.method] ?? r.method, String(r.count), formatMoney(r.total)])}
            footer={byPayTotals ? ['Total', String(byPayTotals.count), formatMoney(byPayTotals.total)] : undefined}
          />

          <ReportTable
            title="Produtos mais vendidos"
            headers={['Produto', 'Qtd', 'Total']}
            rows={report.topProducts.map((r) => [r.name, formatItemQty(r.quantity), formatMoney(r.total)])}
            footer={topTotals ? ['Total', formatItemQty(topTotals.qty), formatMoney(topTotals.total)] : undefined}
          />

          <ReportPrintFooter />
        </div>
      )}
    </ReportsPageLayout>
  );
};

// —— Estoque ——
export const ReportsStockPage: React.FC = () => {
  const can = useAnalyticsAccess();
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    if (can) fetchStockReport().then(setReport);
  }, [can]);

  if (!can) return <AccessDenied moduleLabel={REPORTS_MODULE_LABEL} />;

  return (
    <ReportsPageLayout
      title="Relatórios de estoque"
      description="Saldos, alertas de mínimo e movimentações recentes."
      actions={report ? <button type="button" className="btn-primary" onClick={() => window.print()}>Imprimir relatório</button> : undefined}
    >
      {report && (
        <div className="report-print-area">
          <ReportPrintHeader title="Relatório de Estoque" subtitle="Saldos, alertas de mínimo e movimentações recentes" />

          <ReportSummaryCards items={[
            { label: 'SKUs ativos', value: String(report.summary.totalSkus) },
            { label: 'Registros de saldo', value: String(report.summary.locationsWithStock) },
            { label: 'Abaixo do mínimo', value: String(report.summary.belowMinimumCount) },
          ]} />

          {report.belowMinimum?.length > 0 && (
            <ReportTable
              title="Alertas de estoque mínimo"
              headers={['Produto', 'Local', 'Saldo', 'Mínimo']}
              rows={report.belowMinimum.map((r: any) => [r.productName, r.locationName, formatItemQty(r.quantity), formatItemQty(r.minimum)])}
            />
          )}

          <ReportTable
            title="Saldos (amostra)"
            headers={['Produto', 'Local', 'Quantidade']}
            rows={(report.balances ?? []).slice(0, 40).map((r: any) => [r.product, r.location, formatItemQty(r.quantity)])}
          />

          <ReportTable
            title="Últimas movimentações"
            headers={['Tipo', 'Produto', 'Local', 'Qtd', 'Data']}
            rows={(report.recentMovements ?? []).map((r: any) => [
              r.type,
              r.product ?? '—',
              r.location ?? '—',
              formatItemQty(r.quantity),
              r.createdAt ? new Date(r.createdAt).toLocaleString('pt-BR') : '—',
            ])}
          />

          <ReportPrintFooter />
        </div>
      )}
    </ReportsPageLayout>
  );
};

// —— Financeiro ——

const TX_TYPE_LABEL: Record<string, string> = {
  income: 'Receita',
  expense: 'Despesa',
};

export const ReportsFinancePage: React.FC = () => {
  const can = useAnalyticsAccess();
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayIso());
  const [dash, setDash] = useState<any>(null);

  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const load = useCallback(async () => {
    try {
      setDash(await fetchReportsFinance({ from, to }));
    } catch {
      setDash(await fetchFinanceDashboard({ from, to }));
    }
  }, [from, to]);

  useEffect(() => {
    if (can) load();
  }, [can, load]);

  const filteredByCategory = React.useMemo(() => {
    if (!dash?.dre?.byCategory) return [];
    let rows = dash.dre.byCategory as Array<{ type: string; category: string; total: number }>;
    if (filterType) rows = rows.filter((r) => r.type === filterType);
    if (filterCategory) rows = rows.filter((r) => r.category.toLowerCase().includes(filterCategory.toLowerCase()));
    return rows;
  }, [dash, filterType, filterCategory]);

  const filteredCashFlow = React.useMemo(() => {
    return (dash?.cashFlow?.months ?? []) as Array<{ month: string; inflow: number; outflow: number; net: number }>;
  }, [dash]);

  const totals = React.useMemo(() => {
    const income = filteredByCategory.filter((r) => r.type === 'income').reduce((s, r) => s + r.total, 0);
    const expense = filteredByCategory.filter((r) => r.type === 'expense').reduce((s, r) => s + r.total, 0);
    return { income, expense, result: income - expense };
  }, [filteredByCategory]);

  const cashFlowTotals = React.useMemo(() => {
    return filteredCashFlow.reduce(
      (acc, m) => ({ inflow: acc.inflow + m.inflow, outflow: acc.outflow + m.outflow, net: acc.net + m.net }),
      { inflow: 0, outflow: 0, net: 0 },
    );
  }, [filteredCashFlow]);

  const categoryOptions = React.useMemo(() => {
    if (!dash?.dre?.byCategory) return [];
    const set: Record<string, true> = {};
    for (const row of dash.dre.byCategory) set[row.category] = true;
    return Object.keys(set).sort();
  }, [dash]);

  const hasFilters = !!(filterType || filterCategory);
  const overview = dash?.overview;
  const summaryData = hasFilters
    ? { totalIncome: totals.income, totalExpense: totals.expense, balance: totals.result }
    : overview;

  if (!can) return <AccessDenied moduleLabel={REPORTS_MODULE_LABEL} />;

  return (
    <ReportsPageLayout
      title="Relatórios financeiros"
      description="Resumo financeiro integrado ao módulo de gestão."
      actions={
        dash ? (
          <button type="button" className="btn-primary" onClick={() => window.print()}>
            Imprimir relatório
          </button>
        ) : undefined
      }
    >
      {/* ── Filtros (tela) ── */}
      <div className="report-filters-bar no-print">
        <AnalyticsPeriodBar
          from={from}
          to={to}
          onFrom={setFrom}
          onTo={setTo}
          extra={
            <button type="button" className="btn-primary" onClick={load}>
              Atualizar
            </button>
          }
        />
        <section className="finance-toolbar" aria-label="Filtros">
          <div className="form-group">
            <label htmlFor="rf-type">Tipo</label>
            <select id="rf-type" className="premium-text-input" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Todos</option>
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="rf-category">Categoria</label>
            <select id="rf-category" className="premium-text-input" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">Todas</option>
              {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ alignSelf: 'flex-end' }}>
            <button type="button" className="catalog-form-footer-btn catalog-form-footer-btn--ghost" onClick={() => { setFilterType(''); setFilterCategory(''); }}>
              Limpar filtros
            </button>
          </div>
        </section>
      </div>

      {/* ── Conteúdo do relatório (tela + impressão) ── */}
      {dash && (
        <div className="report-print-area">
          <ReportPrintHeader
            title="Relatório Financeiro"
            subtitle="Demonstrativo de resultados e fluxo de caixa"
            meta={[
              { label: 'Período', value: `${formatDateLabel(from)} a ${formatDateLabel(to)}` },
              ...(filterType ? [{ label: 'Tipo', value: TX_TYPE_LABEL[filterType] ?? filterType }] : []),
              ...(filterCategory ? [{ label: 'Categoria', value: filterCategory }] : []),
            ]}
          />

          {summaryData && (
            <ReportSummaryCards items={[
              { label: 'Receitas', value: formatMoney(summaryData.totalIncome) },
              { label: 'Despesas', value: formatMoney(summaryData.totalExpense) },
              { label: 'Resultado', value: formatMoney(summaryData.balance) },
              { label: 'A pagar em aberto', value: formatMoney(dash.dre?.openPayables ?? 0) },
              { label: 'Títulos vencidos', value: String(dash.overdueBills ?? 0) },
            ]} />
          )}

          {/* DRE por Categoria */}
          {filteredByCategory.length > 0 && (
            <ReportTable
              title="Demonstrativo de Resultados (DRE)"
              headers={['Tipo', 'Categoria', 'Total']}
              rows={filteredByCategory.map((r) => [
                TX_TYPE_LABEL[r.type] ?? r.type,
                r.category,
                formatMoney(r.total),
              ])}
              footer={[
                '',
                'Total',
                formatMoney(totals.result),
              ]}
            />
          )}

          {/* Fluxo de Caixa */}
          {filteredCashFlow.length > 0 && (
            <ReportTable
              title="Fluxo de Caixa Mensal"
              headers={['Mês', 'Entradas', 'Saídas', 'Líquido']}
              rows={filteredCashFlow.map((m) => [
                m.month,
                formatMoney(m.inflow),
                formatMoney(m.outflow),
                formatMoney(m.net),
              ])}
              footer={[
                'Total',
                formatMoney(cashFlowTotals.inflow),
                formatMoney(cashFlowTotals.outflow),
                formatMoney(cashFlowTotals.net),
              ]}
            />
          )}

          <ReportPrintFooter />
        </div>
      )}
    </ReportsPageLayout>
  );
};
