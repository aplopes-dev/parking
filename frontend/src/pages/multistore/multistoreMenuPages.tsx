import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import AlertModal from '../../components/AlertModal';
import ConfirmModal from '../../components/ConfirmModal';
import { AuthContext } from '../../contexts/AuthContext';
import {
  createStoreGroup,
  fetchConsolidatedFinance,
  fetchConsolidatedReport,
  fetchConsolidatedStock,
  fetchMultistoreContext,
  joinStoreGroup,
  leaveStoreGroup,
  updateMultistoreUnitLabel,
  updateStoreGroup,
  type ConsolidatedFinanceReport,
  type ConsolidatedReport,
  type ConsolidatedStockReport,
  type MultistoreContext,
} from '../../services/multistoreApi';
import { formatMoney } from '../finance/financeShared';
import './MultistorePages.css';

const ORDER_TYPE_LABEL: Record<string, string> = {
  balcao: 'Balcão',
  comanda: 'Comanda',
  delivery: 'Delivery',
  mesa: 'Mesa',
  online: 'Online',
  tablet: 'Tablet',
};

function errMsg(e: unknown): string {
  const ax = e as { response?: { data?: { message?: string } } };
  return ax.response?.data?.message || 'Erro ao processar.';
}

function useMultistoreAccess() {
  const { user } = useContext(AuthContext) || {};
  return Boolean(user);
}

function AccessDenied() {
  return (
    <div className="catalog-page catalog-page--ifood">
      <div className="catalog-empty">Acesso negado.</div>
    </div>
  );
}

function firstDayOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// —— Unidades e franquias ——
export const MultistoreUnitsPage: React.FC = () => {
  const can = useMultistoreAccess();
  const [ctx, setCtx] = useState<MultistoreContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '' });
  const [confirmLeave, setConfirmLeave] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    description: '',
    unitLabel: '',
  });
  const [joinCode, setJoinCode] = useState('');
  const [joinUnitLabel, setJoinUnitLabel] = useState('');
  const [editGroupName, setEditGroupName] = useState('');
  const [editUnitLabel, setEditUnitLabel] = useState('');

  const load = useCallback(async () => {
    const data = await fetchMultistoreContext();
    setCtx(data);
    if (data.group) {
      setEditGroupName(data.group.name);
    }
    setEditUnitLabel(data.currentTenant.unitLabel ?? '');
  }, []);

  useEffect(() => {
    if (!can) return;
    setLoading(true);
    load()
      .catch(() => setAlert({ open: true, message: 'Erro ao carregar multi-lojas.' }))
      .finally(() => setLoading(false));
  }, [can, load]);

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout
      className="multistore-page"
      moduleLabel="Multi-lojas"
      modulePath="/multilojas/unidades"
      title="Unidades e franquias"
      description="Cada loja é um tenant independente. Agrupe unidades para consolidar relatórios."
      loading={loading && !ctx}
      loadingDescription="Carregando grupo de lojas…"
      actions={
        <button
          type="button"
          className="catalog-action-button is-secondary"
          onClick={() => void load()}
        >
          Atualizar
        </button>
      }
    >
      {ctx && !ctx.inGroup && (
        <>
          <section className="catalog-surface catalog-form-surface--premium">
            <div className="catalog-section-header">
              <div>
                <span className="catalog-section-kicker">Novo grupo</span>
                <h2>Criar grupo de lojas</h2>
              </div>
            </div>
            <p style={{ margin: '0 0 16px', color: 'var(--text-muted)' }}>
              A loja atual será a primeira unidade do grupo. Compartilhe o código gerado com as
              demais unidades para elas entrarem no mesmo grupo.
            </p>
            <form
              className="catalog-form"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  setCtx(
                    await createStoreGroup({
                      name: createForm.name,
                      code: createForm.code || undefined,
                      description: createForm.description || undefined,
                      unitLabel: createForm.unitLabel || undefined,
                    }),
                  );
                  setAlert({ open: true, message: 'Grupo criado com sucesso.' });
                } catch (err) {
                  setAlert({ open: true, message: errMsg(err) });
                }
              }}
            >
              <div className="catalog-form-grid">
                <div className="form-group">
                  <label htmlFor="grp-name">Nome do grupo</label>
                  <input
                    id="grp-name"
                    className="premium-text-input"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="grp-code">Código (opcional)</label>
                  <input
                    id="grp-code"
                    className="premium-text-input"
                    placeholder="rede-centro-sp"
                    value={createForm.code}
                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="grp-unit">Nome desta unidade</label>
                  <input
                    id="grp-unit"
                    className="premium-text-input"
                    placeholder="Matriz, Loja 01…"
                    value={createForm.unitLabel}
                    onChange={(e) => setCreateForm({ ...createForm, unitLabel: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="grp-desc">Descrição</label>
                <textarea
                  id="grp-desc"
                  className="premium-text-input"
                  rows={2}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                />
              </div>
              <div className="catalog-form-footer">
                <button
                  type="submit"
                  className="catalog-form-footer-btn catalog-form-footer-btn--primary"
                >
                  Criar grupo
                </button>
              </div>
            </form>
          </section>

          <section className="catalog-surface catalog-form-surface--premium">
            <div className="catalog-section-header">
              <div>
                <span className="catalog-section-kicker">Entrar</span>
                <h2>Entrar em grupo existente</h2>
              </div>
            </div>
            <form
              className="catalog-form"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  setCtx(
                    await joinStoreGroup({
                      code: joinCode.trim().toLowerCase(),
                      unitLabel: joinUnitLabel || undefined,
                    }),
                  );
                  setAlert({ open: true, message: 'Loja vinculada ao grupo.' });
                } catch (err) {
                  setAlert({ open: true, message: errMsg(err) });
                }
              }}
            >
              <div className="catalog-form-grid">
                <div className="form-group">
                  <label htmlFor="join-code">Código do grupo</label>
                  <input
                    id="join-code"
                    className="premium-text-input"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="join-unit">Nome desta unidade</label>
                  <input
                    id="join-unit"
                    className="premium-text-input"
                    value={joinUnitLabel}
                    onChange={(e) => setJoinUnitLabel(e.target.value)}
                  />
                </div>
              </div>
              <div className="catalog-form-footer">
                <button
                  type="submit"
                  className="catalog-form-footer-btn catalog-form-footer-btn--primary"
                >
                  Entrar no grupo
                </button>
              </div>
            </form>
          </section>
        </>
      )}

      {ctx?.inGroup && ctx.group && (
        <>
          <section className="catalog-stats-grid" aria-label="Resumo do grupo">
            <article className="catalog-stat-card">
              <span>Unidades</span>
              <strong>{ctx.group.unitCount}</strong>
              <p>Lojas (tenants) no mesmo grupo.</p>
            </article>
            <article className="catalog-stat-card">
              <span>Código do grupo</span>
              <strong style={{ fontSize: '1.1rem' }}>{ctx.group.code}</strong>
              <p>Identificador para novas lojas entrarem.</p>
            </article>
            <article className="catalog-stat-card">
              <span>Loja atual</span>
              <strong>{ctx.currentTenant.displayName}</strong>
              <p>Slug: {ctx.currentTenant.slug}</p>
            </article>
            <article className="catalog-stat-card">
              <span>Grupo</span>
              <strong>{ctx.group.name}</strong>
              <p>{ctx.group.description || 'Sem descrição'}</p>
            </article>
          </section>

          <section className="catalog-surface">
            <div className="catalog-section-header">
              <div>
                <span className="catalog-section-kicker">Identificação</span>
                <h2>Código do grupo</h2>
              </div>
            </div>
            <p>Informe este código ao cadastrar ou configurar outra loja para consolidar os dados:</p>
            <div className="multistore-code-box">
              <code>{ctx.group.code}</code>
              <span className="catalog-pill is-muted">{ctx.units.length} unidade(s)</span>
            </div>
          </section>

          <section className="catalog-surface catalog-form-surface--premium">
            <div className="catalog-section-header">
              <div>
                <span className="catalog-section-kicker">Configuração</span>
                <h2>Grupo e unidade atual</h2>
              </div>
            </div>
            <form
              className="catalog-form"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await updateStoreGroup({ name: editGroupName });
                  setCtx(await updateMultistoreUnitLabel(editUnitLabel));
                  setAlert({ open: true, message: 'Dados atualizados.' });
                } catch (err) {
                  setAlert({ open: true, message: errMsg(err) });
                }
              }}
            >
              <div className="catalog-form-grid">
                <div className="form-group">
                  <label htmlFor="edit-grp">Nome do grupo</label>
                  <input
                    id="edit-grp"
                    className="premium-text-input"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-unit">Nome desta unidade</label>
                  <input
                    id="edit-unit"
                    className="premium-text-input"
                    value={editUnitLabel}
                    onChange={(e) => setEditUnitLabel(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="catalog-form-footer">
                <button
                  type="submit"
                  className="catalog-form-footer-btn catalog-form-footer-btn--primary"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                  onClick={() => setConfirmLeave(true)}
                >
                  Sair do grupo
                </button>
              </div>
            </form>
          </section>

          <section className="catalog-surface">
            <div className="catalog-section-header">
              <div>
                <span className="catalog-section-kicker">Acesso</span>
                <h2>Trocar de loja</h2>
              </div>
            </div>
            <p style={{ margin: '0 0 12px', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              Para alternar entre unidades no header, cadastre o <strong>mesmo e-mail</strong> do
              administrador em cada loja (menu Usuários). Só admin e gestor podem trocar de tenant.
            </p>
          </section>

          <section className="catalog-surface">
            <div className="catalog-section-header">
              <div>
                <span className="catalog-section-kicker">Rede</span>
                <h2>Unidades do grupo</h2>
              </div>
            </div>
            <div className="multistore-units-grid">
              {ctx.units.map((u) => (
                <article
                  key={u.id}
                  className={`multistore-unit-card${u.isCurrent ? ' is-current' : ''}`}
                >
                  <strong>{u.displayName}</strong>
                  <span>Organização: {u.name}</span>
                  <span>Slug: {u.slug}</span>
                  {u.isCurrent && <span className="catalog-pill is-muted">Loja atual</span>}
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      <AlertModal
        isOpen={alert.open}
        message={alert.message}
        onClose={() => setAlert({ open: false, message: '' })}
      />
      <ConfirmModal
        isOpen={confirmLeave}
        message="Sair do grupo? Esta loja deixará de aparecer nos relatórios consolidados."
        onConfirm={async () => {
          try {
            setCtx(await leaveStoreGroup());
            setConfirmLeave(false);
            setAlert({ open: true, message: 'Loja removida do grupo.' });
          } catch (err) {
            setAlert({ open: true, message: errMsg(err) });
          }
        }}
        onClose={() => setConfirmLeave(false)}
      />
    </CatalogPageLayout>
  );
};

type ReportTab = 'sales' | 'finance' | 'stock';

// —— Relatórios unificados ——
export const MultistoreReportsPage: React.FC = () => {
  const can = useMultistoreAccess();
  const [ctx, setCtx] = useState<MultistoreContext | null>(null);
  const [tab, setTab] = useState<ReportTab>('sales');
  const [salesReport, setSalesReport] = useState<ConsolidatedReport | null>(null);
  const [financeReport, setFinanceReport] = useState<ConsolidatedFinanceReport | null>(null);
  const [stockReport, setStockReport] = useState<ConsolidatedStockReport | null>(null);
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayIso());
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '' });

  const load = useCallback(async () => {
    const context = await fetchMultistoreContext();
    setCtx(context);
    if (!context.inGroup) {
      setSalesReport(null);
      setFinanceReport(null);
      setStockReport(null);
      return;
    }
    if (tab === 'sales') {
      setSalesReport(await fetchConsolidatedReport({ from, to }));
    } else if (tab === 'finance') {
      setFinanceReport(await fetchConsolidatedFinance({ from, to }));
    } else {
      setStockReport(await fetchConsolidatedStock());
    }
  }, [from, to, tab]);

  useEffect(() => {
    if (!can) return;
    setLoading(true);
    load()
      .catch((err) => setAlert({ open: true, message: errMsg(err) }))
      .finally(() => setLoading(false));
  }, [can, load]);

  const report = tab === 'sales' ? salesReport : null;

  const stats = useMemo(() => {
    if (tab === 'sales' && salesReport) {
      return (
        <section className="catalog-stats-grid" aria-label="Vendas consolidadas">
          <article className="catalog-stat-card">
            <span>Faturamento</span>
            <strong>{formatMoney(salesReport.summary.revenue)}</strong>
            <p>Todas as unidades no período.</p>
          </article>
          <article className="catalog-stat-card">
            <span>Pedidos fechados</span>
            <strong>{salesReport.summary.closedOrders}</strong>
            <p>Soma das lojas do grupo.</p>
          </article>
          <article className="catalog-stat-card">
            <span>Ticket médio</span>
            <strong>{formatMoney(salesReport.summary.avgTicket)}</strong>
            <p>Consolidado do período.</p>
          </article>
          <article className="catalog-stat-card">
            <span>Unidades</span>
            <strong>{salesReport.summary.unitCount}</strong>
            <p>{salesReport.group.name}</p>
          </article>
        </section>
      );
    }
    if (tab === 'finance' && financeReport) {
      return (
        <section className="catalog-stats-grid" aria-label="Financeiro consolidado">
          <article className="catalog-stat-card">
            <span>Receitas</span>
            <strong>{formatMoney(financeReport.summary.totalIncome)}</strong>
            <p>Lançamentos no período.</p>
          </article>
          <article className="catalog-stat-card">
            <span>Despesas</span>
            <strong>{formatMoney(financeReport.summary.totalExpense)}</strong>
            <p>Lançamentos no período.</p>
          </article>
          <article className="catalog-stat-card">
            <span>Saldo</span>
            <strong>{formatMoney(financeReport.summary.balance)}</strong>
            <p>Receitas menos despesas.</p>
          </article>
          <article className="catalog-stat-card">
            <span>Contas vencidas</span>
            <strong>{financeReport.summary.overdueBills}</strong>
            <p>Em aberto na rede.</p>
          </article>
        </section>
      );
    }
    if (tab === 'stock' && stockReport) {
      return (
        <section className="catalog-stats-grid" aria-label="Estoque consolidado">
          <article className="catalog-stat-card">
            <span>SKUs ativos</span>
            <strong>{stockReport.summary.totalSkus}</strong>
            <p>Produtos na rede.</p>
          </article>
          <article className="catalog-stat-card">
            <span>Saldos</span>
            <strong>{stockReport.summary.locationsWithStock}</strong>
            <p>Registros com quantidade.</p>
          </article>
          <article className="catalog-stat-card">
            <span>Abaixo do mínimo</span>
            <strong>{stockReport.summary.belowMinimumCount}</strong>
            <p>Requer atenção.</p>
          </article>
          <article className="catalog-stat-card">
            <span>Grupo</span>
            <strong>{stockReport.byUnit.length}</strong>
            <p>{stockReport.group.name}</p>
          </article>
        </section>
      );
    }
    return undefined;
  }, [tab, salesReport, financeReport, stockReport]);

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout
      className="multistore-page"
      moduleLabel="Multi-lojas"
      modulePath="/multilojas/unidades"
      title="Relatórios unificados"
      description="Vendas consolidadas de todas as lojas do mesmo grupo."
      loading={loading && !ctx}
      loadingDescription="Carregando relatórios…"
      stats={!loading || salesReport || financeReport || stockReport ? stats : undefined}
    >
      {ctx && !ctx.inGroup && (
        <section className="catalog-surface">
          <div className="catalog-empty">
            Configure um grupo em{' '}
            <a href="/multilojas/unidades">Unidades e franquias</a> para ver relatórios
            consolidados.
          </div>
        </section>
      )}

      {ctx?.inGroup && (
        <>
          <section className="catalog-surface">
            <div className="catalog-section-header">
              <div>
                <span className="catalog-section-kicker">Visão</span>
                <h2>Tipo de relatório</h2>
              </div>
              <span className="catalog-pill is-muted">Grupo: {ctx.group?.code}</span>
            </div>
            <div className="multistore-report-tabs">
              {(
                [
                  ['sales', 'Vendas'],
                  ['finance', 'Financeiro'],
                  ['stock', 'Estoque'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`catalog-action-button${tab === id ? '' : ' is-secondary'}`}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {tab !== 'stock' && (
            <section className="catalog-surface">
              <div className="catalog-section-header">
                <div>
                  <span className="catalog-section-kicker">Período</span>
                  <h2>Filtros</h2>
                </div>
              </div>
              <div className="multistore-period-bar">
                <div className="form-group">
                  <label htmlFor="ms-from">De</label>
                  <input
                    id="ms-from"
                    type="date"
                    className="premium-text-input"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="ms-to">Até</label>
                  <input
                    id="ms-to"
                    type="date"
                    className="premium-text-input"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="catalog-action-button"
                  onClick={() => {
                    setLoading(true);
                    load()
                      .catch((err) => setAlert({ open: true, message: errMsg(err) }))
                      .finally(() => setLoading(false));
                  }}
                >
                  Atualizar
                </button>
              </div>
            </section>
          )}

          {tab === 'stock' && (
            <section className="catalog-surface">
              <button
                type="button"
                className="catalog-action-button"
                onClick={() => {
                  setLoading(true);
                  load()
                    .catch((err) => setAlert({ open: true, message: errMsg(err) }))
                    .finally(() => setLoading(false));
                }}
              >
                Atualizar estoque
              </button>
            </section>
          )}

          {report && tab === 'sales' && (
            <>
              <section className="catalog-surface">
                <div className="catalog-section-header">
                  <div>
                    <span className="catalog-section-kicker">Evolução</span>
                    <h2>Faturamento diário (rede)</h2>
                  </div>
                </div>
                {report.daily.length === 0 ? (
                  <div className="catalog-empty">Sem movimentação no período.</div>
                ) : (
                  <div className="multistore-chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={report.daily}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(v: number) => formatMoney(v)}
                          labelFormatter={(l) => `Data: ${l}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#ea1d2c"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              <section className="catalog-surface">
                <div className="catalog-section-header">
                  <div>
                    <span className="catalog-section-kicker">Por loja</span>
                    <h2>Desempenho por unidade</h2>
                  </div>
                </div>
                <div className="multistore-table-wrap">
                  <table className="multistore-table">
                    <thead>
                      <tr>
                        <th>Unidade</th>
                        <th>Slug</th>
                        <th>Faturamento</th>
                        <th>Pedidos</th>
                        <th>Ticket médio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.byUnit.map((u) => (
                        <tr key={u.tenantId}>
                          <td>{u.displayName}</td>
                          <td>{u.slug}</td>
                          <td>{formatMoney(u.revenue)}</td>
                          <td>{u.closedOrders}</td>
                          <td>{formatMoney(u.avgTicket)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="catalog-surface">
                <div className="catalog-section-header">
                  <div>
                    <span className="catalog-section-kicker">Canais</span>
                    <h2>Vendas por tipo de pedido (rede)</h2>
                  </div>
                </div>
                {report.byType.length === 0 ? (
                  <div className="catalog-empty">Sem pedidos fechados no período.</div>
                ) : (
                  <div className="multistore-table-wrap">
                    <table className="multistore-table">
                      <thead>
                        <tr>
                          <th>Canal</th>
                          <th>Pedidos</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.byType.map((r) => (
                          <tr key={r.type}>
                            <td>{ORDER_TYPE_LABEL[r.type] ?? r.type}</td>
                            <td>{r.orders}</td>
                            <td>{formatMoney(r.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

          {tab === 'finance' && financeReport && (
            <section className="catalog-surface">
              <div className="catalog-section-header">
                <div>
                  <span className="catalog-section-kicker">Por loja</span>
                  <h2>Financeiro por unidade</h2>
                </div>
              </div>
              <div className="multistore-table-wrap">
                <table className="multistore-table">
                  <thead>
                    <tr>
                      <th>Unidade</th>
                      <th>Receitas</th>
                      <th>Despesas</th>
                      <th>Saldo</th>
                      <th>Lançamentos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financeReport.byUnit.map((u) => (
                      <tr key={u.tenantId}>
                        <td>{u.displayName}</td>
                        <td>{formatMoney(u.totalIncome)}</td>
                        <td>{formatMoney(u.totalExpense)}</td>
                        <td>{formatMoney(u.balance)}</td>
                        <td>{u.transactionCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === 'stock' && stockReport && (
            <section className="catalog-surface">
              <div className="catalog-section-header">
                <div>
                  <span className="catalog-section-kicker">Por loja</span>
                  <h2>Estoque por unidade</h2>
                </div>
              </div>
              <div className="multistore-table-wrap">
                <table className="multistore-table">
                  <thead>
                    <tr>
                      <th>Unidade</th>
                      <th>Saldos</th>
                      <th>Abaixo do mínimo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockReport.byUnit.map((u) => (
                      <tr key={u.tenantId}>
                        <td>{u.displayName}</td>
                        <td>{u.skus}</td>
                        <td>{u.belowMinimum}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      <AlertModal
        isOpen={alert.open}
        message={alert.message}
        onClose={() => setAlert({ open: false, message: '' })}
      />
    </CatalogPageLayout>
  );
};
