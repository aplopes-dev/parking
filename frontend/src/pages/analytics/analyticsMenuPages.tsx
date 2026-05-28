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
import AlertModal from '../../components/AlertModal';
import {
  fetchIndicators,
  fetchKpiTargets,
  fetchOnlineAccess,
  fetchRealtimeAnalytics,
  logOnlineAccess,
  seedKpiTargets,
  upsertKpiTarget,
} from '../../services/analyticsApi';
import {
  AccessDenied,
  AnalyticsField,
  AnalyticsFormActions,
  AnalyticsPageLayout,
  AnalyticsPeriodBar,
  AnalyticsSection,
  MetricCards,
  ORDER_TYPE_LABEL,
  SimpleBarChart,
  errMsg,
  firstDayOfMonth,
  formatMoney,
  formatPct,
  todayIso,
  useAnalyticsAccess,
} from './analyticsShared';

// —— Tempo real ——
export const AnalyticsRealtimePage: React.FC = () => {
  const can = useAnalyticsAccess();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchRealtimeAnalytics>> | null>(null);
  const [auto, setAuto] = useState(true);

  const load = useCallback(async () => {
    setData(await fetchRealtimeAnalytics());
  }, []);

  useEffect(() => {
    if (!can) return;
    load();
    if (!auto) return;
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [can, load, auto]);

  if (!can) return <AccessDenied />;

  return (
    <AnalyticsPageLayout
      title="Análise em tempo real"
      description="Pedidos abertos, faturamento do dia e tendência dos últimos 7 dias."
    >
      <section className="analytics-meta-bar" aria-live="polite">
        <span>
          Atualizado: {data?.asOf ? new Date(data.asOf).toLocaleString('pt-BR') : '—'}
        </span>
        <div className="finance-toolbar__actions">
          <label>
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            Atualização automática (30s)
          </label>
          <button type="button" className="btn-secondary" onClick={load}>
            Atualizar
          </button>
        </div>
      </section>

      {data && (
        <>
          <MetricCards
            label="Resumo em tempo real"
            items={[
              { label: 'Pedidos abertos', value: String(data.openOrders) },
              { label: 'Fechados hoje', value: String(data.todayClosed) },
              { label: 'Faturamento hoje', value: formatMoney(data.todayRevenue) },
              { label: 'Última hora', value: formatMoney(data.lastHourRevenue) },
            ]}
          />

          <AnalyticsSection title="Faturamento — 7 dias" kicker="Tendência">
            <div className="analytics-chart-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.last7Days}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
                  <YAxis tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                  <Line type="monotone" dataKey="revenue" stroke="#ea1d2c" strokeWidth={2} name="Receita" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </AnalyticsSection>

          <AnalyticsSection title="Por status (agora)" kicker="Pedidos">
            <SimpleBarChart data={data.ordersByStatus} labelKey="status" valueKey="count" />
          </AnalyticsSection>
        </>
      )}
    </AnalyticsPageLayout>
  );
};

// —— Indicadores ——
export const AnalyticsIndicatorsPage: React.FC = () => {
  const can = useAnalyticsAccess();
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayIso());
  const [data, setData] = useState<any>(null);
  const [targetForm, setTargetForm] = useState({
    metricKey: 'revenue',
    label: 'Meta faturamento',
    targetValue: '50000',
  });
  const [alert, setAlert] = useState({ open: false, message: '' });

  const load = useCallback(async () => {
    setData(await fetchIndicators({ from, to }));
  }, [from, to]);

  useEffect(() => {
    if (can) {
      fetchKpiTargets().catch(() => seedKpiTargets());
      load();
    }
  }, [can, load]);

  if (!can) return <AccessDenied />;

  return (
    <AnalyticsPageLayout
      title="Indicadores visuais"
      description="KPIs de vendas com comparativo ao período anterior e metas."
    >
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

      {data?.metrics && (
        <section className="catalog-stats-grid analytics-stats-grid--auto" aria-label="KPIs">
          {data.metrics.map((m: any) => (
            <article key={m.key} className="catalog-stat-card">
              <span>{m.label}</span>
              <strong>
                {m.key === 'revenue' || m.key === 'avg_ticket' ? formatMoney(m.value) : m.value}
              </strong>
              <p>{formatPct(m.changePct)} vs período anterior</p>
              {m.target != null && (
                <p>
                  Meta:{' '}
                  {m.key === 'revenue' || m.key === 'avg_ticket' ? formatMoney(m.target) : m.target}
                </p>
              )}
            </article>
          ))}
        </section>
      )}

      {data?.salesByChannel?.length > 0 && (
        <AnalyticsSection title="Vendas por canal" kicker="Canais">
          <div className="analytics-chart-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={data.salesByChannel.map((r: any) => ({
                  ...r,
                  label: ORDER_TYPE_LABEL[r.type] ?? r.type,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#ea1d2c" name="Pedidos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsSection>
      )}

      <AnalyticsSection title="Definir meta" kicker="KPI">
        <form
          className="catalog-form catalog-form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await upsertKpiTarget({
                ...targetForm,
                targetValue: parseFloat(targetForm.targetValue),
              });
              await load();
              setAlert({ open: true, message: 'Meta salva.' });
            } catch (err) {
              setAlert({ open: true, message: errMsg(err) });
            }
          }}
        >
          <AnalyticsField label="Chave da métrica">
            <input
              className="premium-text-input"
              placeholder="revenue"
              value={targetForm.metricKey}
              onChange={(e) => setTargetForm({ ...targetForm, metricKey: e.target.value })}
            />
          </AnalyticsField>
          <AnalyticsField label="Rótulo">
            <input
              className="premium-text-input"
              placeholder="Meta faturamento"
              value={targetForm.label}
              onChange={(e) => setTargetForm({ ...targetForm, label: e.target.value })}
            />
          </AnalyticsField>
          <AnalyticsField label="Valor da meta">
            <input
              type="number"
              className="premium-text-input"
              value={targetForm.targetValue}
              onChange={(e) => setTargetForm({ ...targetForm, targetValue: e.target.value })}
            />
          </AnalyticsField>
          <AnalyticsFormActions>
            <button type="submit" className="btn-primary">
              Salvar meta
            </button>
          </AnalyticsFormActions>
        </form>
      </AnalyticsSection>

      <AlertModal
        isOpen={alert.open}
        message={alert.message}
        onClose={() => setAlert({ open: false, message: '' })}
      />
    </AnalyticsPageLayout>
  );
};

// —— Acesso online ——
export const AnalyticsOnlinePage: React.FC = () => {
  const can = useAnalyticsAccess();
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayIso());
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    setData(await fetchOnlineAccess({ from, to }));
  }, [from, to]);

  useEffect(() => {
    if (can) load();
  }, [can, load]);

  useEffect(() => {
    if (can) logOnlineAccess('dashboard', 'analytics-page').catch(() => {});
  }, [can]);

  if (!can) return <AccessDenied />;

  return (
    <AnalyticsPageLayout
      title="Acesso online"
      description="Visitas ao cardápio digital e pedidos pelos canais online/tablet."
    >
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

      <section className="analytics-meta-bar" aria-label="Registrar acesso manual">
        <span>Registro manual de acesso</span>
        <div className="finance-toolbar__actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => logOnlineAccess('mesa', 'manual').then(load)}
          >
            Registrar acesso mesa
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => logOnlineAccess('delivery', 'manual').then(load)}
          >
            Registrar delivery
          </button>
        </div>
      </section>

      {data && (
        <>
          <AnalyticsSection title="Acessos por canal" kicker="Tráfego">
            <SimpleBarChart data={data.accessByChannel ?? []} labelKey="channel" valueKey="hits" />
          </AnalyticsSection>

          {data.timeline?.length > 0 && (
            <AnalyticsSection title="Linha do tempo" kicker="Acessos">
              <div className="analytics-chart-wrap">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.timeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="hits" stroke="#2563eb" name="Acessos" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </AnalyticsSection>
          )}

          <AnalyticsSection title="Pedidos online/tablet fechados" kicker="Conversão">
            {(data.ordersOnline ?? []).length === 0 ? (
              <p className="catalog-empty">Nenhum pedido no período.</p>
            ) : (
              <div className="finance-table-wrap">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>Canal</th>
                      <th>Pedidos</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.ordersOnline ?? []).map((r: any, i: number) => (
                      <tr key={i}>
                        <td>{ORDER_TYPE_LABEL[r.type] ?? r.type}</td>
                        <td>{r.count}</td>
                        <td>{formatMoney(Number(r.total))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AnalyticsSection>
        </>
      )}
    </AnalyticsPageLayout>
  );
};
