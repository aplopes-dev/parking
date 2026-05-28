import React, { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import {
  fetchParkingFacilities,
  fetchParkingReportDaily,
  fetchParkingReportOverview,
  fetchParkingReportTopPlates,
  type ParkingFacility,
  type ParkingReportDaily,
  type ParkingReportOverview,
  type ParkingReportTopPlates,
} from '../../services/parkingApi';
import {
  ACCESS_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
} from './parkingConstants';
import {
  AnalyticsPeriodBar,
  ReportSummaryCards,
  ReportTable,
  firstDayOfMonth,
  formatDateLabel,
  formatMoney,
  todayIso,
  useAnalyticsAccess,
} from '../analytics/analyticsShared';
import './ParkingPages.css';

function errMsg(e: unknown): string {
  const ax = e as { response?: { data?: { message?: string | string[] } } };
  const msg = ax.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' ');
  if (typeof msg === 'string') return msg;
  return 'Erro ao carregar relatório.';
}

export const ParkingReportsPage: React.FC = () => {
  const can = useAnalyticsAccess();
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayIso());
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [facilityId, setFacilityId] = useState('');
  const [overview, setOverview] = useState<ParkingReportOverview | null>(null);
  const [daily, setDaily] = useState<ParkingReportDaily | null>(null);
  const [topPlates, setTopPlates] = useState<ParkingReportTopPlates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchParkingFacilities()
      .then((f) => {
        setFacilities(f);
        if (f[0]?.id) setFacilityId(f[0].id);
      })
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { from, to, facilityId: facilityId || undefined };
      const [ov, dl, tp] = await Promise.all([
        fetchParkingReportOverview(params),
        fetchParkingReportDaily(params),
        fetchParkingReportTopPlates(params),
      ]);
      setOverview(ov);
      setDaily(dl);
      setTopPlates(tp);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [from, to, facilityId]);

  useEffect(() => {
    if (can) load();
  }, [can, load]);

  if (!can) {
    return (
      <CatalogPageLayout moduleLabel="Relatórios" title="Relatórios de estacionamento">
        <p className="catalog-empty">Acesso negado.</p>
      </CatalogPageLayout>
    );
  }

  const chartData = (daily?.daily ?? []).map((d) => ({
    ...d,
    label: formatDateLabel(d.day),
  }));

  return (
    <CatalogPageLayout
      className="finance-page"
      moduleLabel="Relatórios"
      title="Relatórios de estacionamento"
      description="Ocupação, receita rotativa, mensalistas e movimentação por período."
    >
      <AnalyticsPeriodBar
        from={from}
        to={to}
        onFrom={setFrom}
        onTo={setTo}
        extra={
          <>
            <div className="form-group">
              <label htmlFor="report-facility">Unidade</label>
              <select
                id="report-facility"
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
              >
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn-primary" onClick={() => void load()} disabled={loading}>
              {loading ? 'Carregando…' : 'Atualizar'}
            </button>
            {overview ? (
              <button type="button" className="catalog-action-button is-secondary" onClick={() => window.print()}>
                Imprimir
              </button>
            ) : null}
          </>
        }
      />

      {error ? <p className="parking-alert">{error}</p> : null}

      {overview ? (
        <div className="report-print-area">
          <ReportSummaryCards
            items={[
              { label: 'Entradas', value: String(overview.summary.entries) },
              { label: 'Saídas pagas', value: String(overview.summary.paidCheckouts) },
              { label: 'Receita rotativo', value: formatMoney(overview.summary.rotativoRevenue) },
              { label: 'Receita total', value: formatMoney(overview.summary.totalRevenue) },
              { label: 'Ticket médio', value: formatMoney(overview.summary.avgTicket) },
              { label: 'Permanência média', value: `${Math.round(overview.summary.avgDurationMinutes)} min` },
              { label: 'Ocupação atual', value: `${overview.summary.occupancyRate.toFixed(1)}%` },
              { label: 'Mensalistas ativos', value: String(overview.summary.activeSubscriptions) },
            ]}
          />

          <section className="parking-panel">
            <h3>Movimentação e receita diária</h3>
            {chartData.length === 0 ? (
              <p className="parking-empty">Sem dados no período.</p>
            ) : (
              <div className="parking-chart-wrap">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number, name: string) =>
                        name === 'revenue' ? formatMoney(value) : value
                      }
                    />
                    <Line yAxisId="left" type="monotone" dataKey="entries" name="Entradas" stroke="#2563eb" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" name="Receita" stroke="#16a34a" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="parking-panel">
            <h3>Sessões por tipo de acesso</h3>
            <div className="parking-chart-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={[
                    { type: ACCESS_TYPE_LABELS.rotativo, count: overview.byAccessType.rotativo },
                    { type: ACCESS_TYPE_LABELS.mensalista, count: overview.byAccessType.mensalista },
                    { type: ACCESS_TYPE_LABELS.convenio, count: overview.byAccessType.convenio },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Sessões" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <ReportTable
            title="Receita por forma de pagamento"
            headers={['Forma', 'Valor']}
            rows={(overview.byPaymentMethod ?? []).map((r) => [
              PAYMENT_METHOD_LABELS[r.method] ?? r.method,
              formatMoney(r.amount),
            ])}
          />

          <ReportTable
            title="Placas mais frequentes"
            headers={['Placa', 'Visitas', 'Tempo total', 'Receita']}
            rows={(topPlates?.plates ?? []).map((r) => [
              r.plate,
              String(r.visits),
              `${Math.round(r.totalMinutes / 60)}h ${r.totalMinutes % 60}min`,
              formatMoney(r.revenue),
            ])}
          />
        </div>
      ) : loading ? (
        <p className="parking-empty">Carregando relatório…</p>
      ) : null}
    </CatalogPageLayout>
  );
};
