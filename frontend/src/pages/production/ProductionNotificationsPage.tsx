import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from '../../services/api';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import CatalogPagination from '../../components/catalog/CatalogPagination';
import CatalogSortableTh from '../../components/catalog/CatalogSortableTh';
import AlertModal from '../../components/AlertModal';

import { AuthContext } from '../../contexts/AuthContext';
import {
  DEFAULT_PAGE_SIZE,
  PaginatedMeta,
  PaginatedResponse,
  SortDirection,
} from '../../types/pagination';
import {
  fetchProductionOverview,
  fetchProductionSettings,
  updateProductionSettings,
} from '../../services/productionApi';
import './ProductionNotifications.css';

function errMsg(e: unknown): string {
  const ax = e as { response?: { data?: { message?: string } } };
  return ax.response?.data?.message || 'Erro ao processar.';
}

const NOTIFICATION_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  read: 'Lida',
  delivered: 'Entregue',
};

type Notification = {
  id: string;
  orderNumber: number;
  tableLabel?: string;
  tableNumber?: number;
  productName: string;
  quantity: string | number;
  status: string;
  createdAt: string;
};

const DEBOUNCE_MS = 250;

const ProductionNotificationsPage: React.FC = () => {
  const { user } = useContext(AuthContext) || {};
  const can = Boolean(user);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<{
    kitchenQueue: number;
    pendingNotifications: number;
    overdueItems: number;
  } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<SortDirection>('DESC');

  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchDebounced(value);
      setPage(1);
    }, DEBOUNCE_MS);
  };

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const [settings, setSettings] = useState({
    notifyOnKitchenSend: true,
    notifyOnKitchenReady: true,
    soundEnabled: true,
    slaWarningMinutes: '15',
    autoRefreshSeconds: '30',
    notes: '',
  });
  const [alert, setAlert] = useState({ open: false, message: '' });

  const loadNotifications = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { page, limit, sortBy, sortOrder };
      if (searchDebounced.trim()) params.search = searchDebounced.trim();
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const { data } = await api.get<PaginatedResponse<Notification>>('/production/notifications', { params });
      setNotifications(data.data);
      setMeta(data.meta);
    } catch {
      setAlert({ open: true, message: 'Erro ao carregar notificações.' });
    }
  }, [page, limit, sortBy, sortOrder, searchDebounced, dateFrom, dateTo]);

  const loadOverviewAndSettings = useCallback(async () => {
    const [ov, st] = await Promise.all([
      fetchProductionOverview(),
      fetchProductionSettings(),
    ]);
    setOverview(ov);
    setSettings({
      notifyOnKitchenSend: st.notifyOnKitchenSend,
      notifyOnKitchenReady: st.notifyOnKitchenReady,
      soundEnabled: st.soundEnabled,
      slaWarningMinutes: String(st.slaWarningMinutes),
      autoRefreshSeconds: String(st.autoRefreshSeconds),
      notes: st.notes ?? '',
    });
  }, []);

  useEffect(() => {
    if (!can) return;
    setLoading(true);
    Promise.all([loadOverviewAndSettings(), loadNotifications()])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [can, loadOverviewAndSettings, loadNotifications]);

  const refreshSeconds = useMemo(() => {
    const n = parseInt(settings.autoRefreshSeconds, 10);
    return Number.isFinite(n) && n >= 10 ? n : 30;
  }, [settings.autoRefreshSeconds]);

  useEffect(() => {
    if (!can || loading) return;
    const t = setInterval(() => {
      void loadNotifications();
    }, refreshSeconds * 1000);
    return () => clearInterval(t);
  }, [can, loading, loadNotifications, refreshSeconds]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(column);
      setSortOrder(column === 'createdAt' ? 'DESC' : 'ASC');
    }
    setPage(1);
  };

  const handleDateFrom = (value: string) => { setDateFrom(value); setPage(1); };
  const handleDateTo = (value: string) => { setDateTo(value); setPage(1); };
  const handleClear = () => { setSearch(''); setSearchDebounced(''); setDateFrom(''); setDateTo(''); setPage(1); };

  const stats = overview ? (
    <section className="catalog-stats-grid" aria-label="Resumo da produção">
      <article className="catalog-stat-card">
        <span>Fila KDS</span>
        <strong>{overview.kitchenQueue}</strong>
        <p>Itens aguardando preparo na cozinha.</p>
      </article>
      <article className="catalog-stat-card">
        <span>Notificações pendentes</span>
        <strong>{overview.pendingNotifications}</strong>
        <p>Alertas ainda não lidos pelos garçons.</p>
      </article>
      <article className="catalog-stat-card">
        <span>SLA estourado</span>
        <strong className={overview.overdueItems > 0 ? 'is-alert' : undefined}>
          {overview.overdueItems}
        </strong>
        <p>Itens acima do tempo configurado.</p>
      </article>
    </section>
  ) : undefined;

  if (!can) {
    return (
      <div className="catalog-page catalog-page--ifood">
        <div className="catalog-empty">Acesso negado.</div>
      </div>
    );
  }

  return (
    <CatalogPageLayout
      className="production-notifications-page"
      moduleLabel="Produção"
      modulePath="/producao/kds"
      title="Notificação na produção"
      description="Alertas para garçons quando itens saem da cozinha e parâmetros de SLA."
      loading={loading && !overview}
      loadingDescription="Carregando notificações…"
      stats={!loading || overview ? stats : undefined}
      actions={
        <button
          type="button"
          className="catalog-action-button is-secondary"
          onClick={() => void loadNotifications()}
        >
          Atualizar
        </button>
      }
    >
      <section className="catalog-surface catalog-form-surface--premium">
        <div className="catalog-section-header">
          <div>
            <span className="catalog-section-kicker">Produção</span>
            <h2>Configurações</h2>
          </div>
        </div>
        <form
          className="catalog-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await updateProductionSettings({
                ...settings,
                slaWarningMinutes: parseInt(settings.slaWarningMinutes, 10),
                autoRefreshSeconds: parseInt(settings.autoRefreshSeconds, 10),
              });
              setAlert({ open: true, message: 'Configurações salvas.' });
            } catch (err) {
              setAlert({ open: true, message: errMsg(err) });
            }
          }}
        >
          <div className="production-notifications-checkboxes">
            <label>
              <input
                type="checkbox"
                checked={settings.notifyOnKitchenSend}
                onChange={(e) =>
                  setSettings({ ...settings, notifyOnKitchenSend: e.target.checked })
                }
              />
              Avisar ao enviar para cozinha
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.notifyOnKitchenReady}
                onChange={(e) =>
                  setSettings({ ...settings, notifyOnKitchenReady: e.target.checked })
                }
              />
              Avisar quando item ficar pronto
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => setSettings({ ...settings, soundEnabled: e.target.checked })}
              />
              Som habilitado
            </label>
          </div>
          <div className="catalog-form-grid">
            <div className="form-group">
              <label htmlFor="prod-sla">SLA de alerta (min)</label>
              <input
                id="prod-sla"
                type="number"
                min={1}
                className="premium-text-input"
                value={settings.slaWarningMinutes}
                onChange={(e) =>
                  setSettings({ ...settings, slaWarningMinutes: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label htmlFor="prod-refresh">Atualização automática (s)</label>
              <input
                id="prod-refresh"
                type="number"
                min={10}
                className="premium-text-input"
                value={settings.autoRefreshSeconds}
                onChange={(e) =>
                  setSettings({ ...settings, autoRefreshSeconds: e.target.value })
                }
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="prod-notes">Observações</label>
            <textarea
              id="prod-notes"
              className="premium-text-input"
              rows={2}
              value={settings.notes}
              onChange={(e) => setSettings({ ...settings, notes: e.target.value })}
              placeholder="Instruções para a equipe de salão"
            />
          </div>
          <div className="catalog-form-footer">
            <button
              type="submit"
              className="catalog-form-footer-btn catalog-form-footer-btn--primary"
            >
              Salvar configuração
            </button>
          </div>
        </form>
      </section>

      <section className="catalog-surface">
        <div className="catalog-toolbar" style={{ alignItems: 'flex-end', gap: 14 }}>
          <div className="form-group catalog-search" style={{ marginBottom: 0 }}>
            <label htmlFor="prod-notif-search">Buscar</label>
            <input
              id="prod-notif-search"
              className="premium-text-input"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setSearchDebounced(search); setPage(1); } }}
              placeholder="Nº pedido, produto, mesa…"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="prod-notif-date-from">De</label>
            <input
              id="prod-notif-date-from"
              type="date"
              className="premium-text-input"
              value={dateFrom}
              onChange={(e) => handleDateFrom(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="prod-notif-date-to">Até</label>
            <input
              id="prod-notif-date-to"
              type="date"
              className="premium-text-input"
              value={dateTo}
              onChange={(e) => handleDateTo(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="catalog-form-footer-btn catalog-form-footer-btn--primary"
            style={{ marginBottom: 0 }}
            onClick={() => { setSearchDebounced(search); setPage(1); }}
          >
            Buscar
          </button>
          <button
            type="button"
            className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
            style={{ marginBottom: 0 }}
            onClick={handleClear}
          >
            Limpar
          </button>
        </div>
      </section>

      <section className="catalog-registry-panel" aria-labelledby="prod-notif-panel-title">
        <header className="catalog-registry-panel__header">
          <div>
            <h2 id="prod-notif-panel-title">Histórico de notificações</h2>
            <p className="catalog-registry-panel__meta">
              {meta?.total ?? 0} registro(s)
              {searchDebounced ? ` · busca: "${searchDebounced}"` : ''}
            </p>
          </div>
        </header>

        {notifications.length === 0 && !loading ? (
          <div className="catalog-empty">Nenhuma notificação registrada.</div>
        ) : (
          <div className="catalog-registry-table">
            <div className="catalog-registry-table__head" role="row">
              <CatalogSortableTh label="Pedido" column="orderNumber" activeSortBy={sortBy} activeSortOrder={sortOrder} onSort={handleSort} />
              <CatalogSortableTh label="Mesa" column="tableLabel" activeSortBy={sortBy} activeSortOrder={sortOrder} onSort={handleSort} align="center" />
              <CatalogSortableTh label="Produto" column="productName" activeSortBy={sortBy} activeSortOrder={sortOrder} onSort={handleSort} />
              <CatalogSortableTh label="Status" column="status" activeSortBy={sortBy} activeSortOrder={sortOrder} onSort={handleSort} />
              <CatalogSortableTh label="Data" column="createdAt" activeSortBy={sortBy} activeSortOrder={sortOrder} onSort={handleSort} />
            </div>
            <ul className="catalog-registry-list" aria-label="Lista de notificações">
              {notifications.map((n) => (
                <li key={n.id} className="catalog-registry-row">
                  <span className="catalog-registry-name">#{n.orderNumber}</span>
                  <span className="catalog-registry-contact" style={{ textAlign: 'center' }}>{n.tableLabel ?? n.tableNumber ?? '—'}</span>
                  <span className="catalog-registry-contact">{n.productName}</span>
                  <span className="catalog-registry-contact">
                    <span className="catalog-pill is-muted">
                      {NOTIFICATION_STATUS_LABEL[n.status] ?? n.status}
                    </span>
                  </span>
                  <time className="catalog-registry-date" dateTime={n.createdAt}>
                    {new Date(n.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </time>
                </li>
              ))}
            </ul>
          </div>
        )}

        {meta && meta.total > 0 && (
          <CatalogPagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            limit={meta.limit}
            disabled={loading}
            onPageChange={setPage}
            onLimitChange={(next) => { setLimit(next); setPage(1); }}
          />
        )}
      </section>

      <AlertModal
        isOpen={alert.open}
        message={alert.message}
        onClose={() => setAlert({ open: false, message: '' })}
      />
    </CatalogPageLayout>
  );
};

export default ProductionNotificationsPage;
