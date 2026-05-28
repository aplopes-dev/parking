import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import { OrderLog } from '../../types';
import {
  DEFAULT_PAGE_SIZE,
  PaginatedMeta,
  PaginatedResponse,
  SortDirection,
} from '../../types/pagination';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import CatalogPagination from '../../components/catalog/CatalogPagination';
import CatalogSortableTh from '../../components/catalog/CatalogSortableTh';

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const DEBOUNCE_MS = 250;

const PdvLogs: React.FC = () => {
  const { user } = useContext(AuthContext) || {};
  const [items, setItems] = useState<OrderLog[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<SortDirection>('DESC');
  const [loading, setLoading] = useState(true);

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

  const loadItems = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { page, limit, sortBy, sortOrder };
      if (searchDebounced.trim()) params.search = searchDebounced.trim();
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const { data } = await api.get<PaginatedResponse<OrderLog>>('/pdv/logs', { params });
      setItems(data.data);
      setMeta(data.meta);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, searchDebounced, dateFrom, dateTo]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      loadItems();
    }
  }, [user, loadItems]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(column);
      setSortOrder(column === 'createdAt' ? 'DESC' : 'ASC');
    }
    setPage(1);
  };

  const handleDateFrom = (value: string) => {
    setDateFrom(value);
    setPage(1);
  };

  const handleDateTo = (value: string) => {
    setDateTo(value);
    setPage(1);
  };

  const handleClear = () => {
    setSearch('');
    setSearchDebounced('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <CatalogPageLayout
      className="catalog-page--ifood catalog-registry-page"
      moduleLabel="PDV"
      modulePath="/pdv/online"
      title="Logs do PDV"
      description="Auditoria de ações em pedidos, itens e pagamentos."
      loading={loading && items.length === 0}
      loadingDescription="Carregando logs do PDV."
    >
      <section className="catalog-surface">
        <div className="catalog-toolbar" style={{ alignItems: 'flex-end', gap: 14 }}>
          <div className="form-group catalog-search" style={{ marginBottom: 0 }}>
            <label htmlFor="pdv-log-search">Buscar</label>
            <input
              id="pdv-log-search"
              className="premium-text-input"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setSearchDebounced(search); setPage(1); } }}
              placeholder="Nº pedido, usuário, ação…"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="pdv-log-date-from">De</label>
            <input
              id="pdv-log-date-from"
              type="date"
              className="premium-text-input"
              value={dateFrom}
              onChange={(e) => handleDateFrom(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="pdv-log-date-to">Até</label>
            <input
              id="pdv-log-date-to"
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

      <section className="catalog-registry-panel" aria-labelledby="pdv-logs-panel-title">
        <header className="catalog-registry-panel__header">
          <div>
            <h2 id="pdv-logs-panel-title">Histórico de ações</h2>
            <p className="catalog-registry-panel__meta">
              {meta?.total ?? 0} registro(s)
              {searchDebounced ? ` · busca: "${searchDebounced}"` : ''}
            </p>
          </div>
        </header>

        {items.length === 0 && !loading ? (
          <div className="catalog-empty">Nenhum log registrado.</div>
        ) : (
          <div className="catalog-registry-table catalog-registry-table--logs">
            <div className="catalog-registry-table__head" role="row">
              <CatalogSortableTh
                label="Data e hora"
                column="createdAt"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
              />
              <CatalogSortableTh
                label="Ação"
                column="action"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
              />
              <CatalogSortableTh
                label="Pedido"
                column="orderNumber"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
              />
              <CatalogSortableTh
                label="Usuário"
                column="userName"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
              />
              <CatalogSortableTh
                label="Detalhes"
                column="message"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
              />
            </div>
            <ul className="catalog-registry-list" aria-label="Lista de logs do PDV">
              {items.map((log) => (
                <li key={log.id} className="catalog-registry-row">
                  <time className="catalog-registry-date" dateTime={log.createdAt}>
                    {formatDateTime(log.createdAt)}
                  </time>
                  <span className="catalog-registry-name">{log.action}</span>
                  <span className="catalog-registry-contact">
                    {log.order ? `#${log.order.orderNumber}` : '—'}
                  </span>
                  <span className="catalog-registry-contact">
                    {log.createdByUser?.name ?? '—'}
                  </span>
                  <p className="catalog-registry-cell--message" title={log.message}>
                    {log.message}
                  </p>
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
            onLimitChange={(next) => {
              setLimit(next);
              setPage(1);
            }}
          />
        )}
      </section>
    </CatalogPageLayout>
  );
};

export default PdvLogs;
