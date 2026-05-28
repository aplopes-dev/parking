import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import AlertModal from '../../components/AlertModal';
import PremiumSelect from '../../components/PremiumSelect';
import { AlertState, StockMovement, StockMovementType } from '../../types';
import {
  DEFAULT_PAGE_SIZE,
  PaginatedMeta,
  PaginatedResponse,
  SortDirection,
} from '../../types/pagination';
import { useStockCatalog } from './useStockCatalog';
import { formatQty, movementTypeLabel } from './stockUtils';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import CatalogPagination from '../../components/catalog/CatalogPagination';
import CatalogSortableTh from '../../components/catalog/CatalogSortableTh';
import './StockMovements.css';

const DEBOUNCE_MS = 250;

const StockMovementsPage: React.FC = () => {
  const { user } = useContext(AuthContext) || {};
  const { locationOptions, productOptions, loading: catalogLoading } = useStockCatalog();
  const [movements, setMovements] = useState<StockMovement[]>([]);
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
  const [filterLocation, setFilterLocation] = useState('');
  const [form, setForm] = useState({
    type: 'entrada' as 'entrada' | 'saida',
    productId: '',
    locationId: '',
    quantity: '1',
    reason: '',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<AlertState>({ isOpen: false, message: '', type: 'error' });

  const canManage = Boolean(user);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchDebounced(value);
      setPage(1);
    }, DEBOUNCE_MS);
  };

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const load = useCallback(async () => {
    const params: Record<string, string | number> = {
      page,
      limit,
      sortBy,
      sortOrder,
    };
    if (filterLocation) params.locationId = filterLocation;
    if (searchDebounced.trim()) params.search = searchDebounced.trim();
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;

    const { data } = await api.get<PaginatedResponse<StockMovement>>('/stock-movements', { params });
    setMovements(data.data);
    setMeta(data.meta);
    setLoading(false);
  }, [dateFrom, dateTo, filterLocation, limit, page, searchDebounced, sortBy, sortOrder]);

  useEffect(() => {
    if (canManage) {
      setLoading(true);
      load();
    }
  }, [canManage, load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.post('/stock-movements', {
        type: form.type,
        productId: form.productId,
        locationId: form.locationId,
        quantity: parseFloat(form.quantity),
        reason: form.reason.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setForm((f) => ({ ...f, quantity: '1', reason: '', notes: '' }));
      setLoading(true);
      await load();
      setAlert({ isOpen: true, message: 'Movimentação registrada!', type: 'success' });
    } catch (err: any) {
      setAlert({ isOpen: true, message: err.response?.data?.message || 'Erro', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!canManage) return <div className="container">Acesso negado</div>;

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(column);
      setSortOrder(column === 'createdAt' ? 'DESC' : 'ASC');
    }
    setPage(1);
  };

  const handleClear = () => {
    setSearch('');
    setSearchDebounced('');
    setDateFrom('');
    setDateTo('');
    setFilterLocation('');
    setPage(1);
  };

  return (
    <CatalogPageLayout
      moduleLabel="Estoque"
      modulePath="/estoque/locais"
      title="Entrada e saída manual"
      description="Registre compras, perdas ou transferências manuais de estoque."
    >
      <section className="catalog-surface catalog-form-surface--premium">
        <h2>Nova movimentação</h2>
        {catalogLoading ? (
          <p>Carregando produtos e locais…</p>
        ) : (
          <form className="catalog-form" onSubmit={handleSubmit}>
            <div className="catalog-form-grid">
              <PremiumSelect
                label="Tipo *"
                value={form.type}
                options={[
                  { value: 'entrada', label: 'Entrada' },
                  { value: 'saida', label: 'Saída' },
                ]}
                onChange={(v) => setForm({ ...form, type: v as 'entrada' | 'saida' })}
              />
              <PremiumSelect
                label="Produto *"
                value={form.productId}
                options={[{ value: '', label: 'Selecione' }, ...productOptions]}
                onChange={(v) => setForm({ ...form, productId: v })}
                required
              />
              <PremiumSelect
                label="Local *"
                value={form.locationId}
                options={[{ value: '', label: 'Selecione' }, ...locationOptions]}
                onChange={(v) => setForm({ ...form, locationId: v })}
                required
              />
              <div className="form-group">
                <label>Quantidade *</label>
                <input
                  className="premium-text-input"
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Motivo</label>
                <input
                  className="premium-text-input"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Observações</label>
              <textarea
                className="premium-text-input"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="catalog-form-footer">
              <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary" disabled={isSaving || !form.productId || !form.locationId}>
                {isSaving ? 'Registrando…' : 'Registrar'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="catalog-surface">
        <div className="catalog-toolbar" style={{ alignItems: 'flex-end', gap: 14 }}>
          <div className="form-group catalog-search" style={{ marginBottom: 0 }}>
            <label htmlFor="stock-mov-search">Buscar</label>
            <input
              id="stock-mov-search"
              className="premium-text-input"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearchDebounced(search);
                  setPage(1);
                }
              }}
              placeholder="Produto, local, tipo, motivo..."
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="stock-mov-date-from">De</label>
            <input
              id="stock-mov-date-from"
              type="date"
              className="premium-text-input"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="stock-mov-date-to">Até</label>
            <input
              id="stock-mov-date-to"
              type="date"
              className="premium-text-input"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <PremiumSelect
            label="Filtrar por local"
            value={filterLocation}
            options={[{ value: '', label: 'Todos' }, ...locationOptions]}
            wrapperClassName="form-group stock-movements-toolbar__field"
            onChange={(v) => {
              setFilterLocation(v);
              setPage(1);
            }}
          />
          <button
            type="button"
            className="catalog-form-footer-btn catalog-form-footer-btn--primary"
            style={{ marginBottom: 0 }}
            onClick={() => {
              setSearchDebounced(search);
              setPage(1);
            }}
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

      <section className="catalog-registry-panel" aria-labelledby="stock-movements-panel-title">
        <header className="catalog-registry-panel__header">
          <div>
            <h2 id="stock-movements-panel-title">Histórico de movimentações</h2>
            <p className="catalog-registry-panel__meta">
              {meta?.total ?? 0} registro(s)
              {searchDebounced ? ` · busca: "${searchDebounced}"` : ''}
              {filterLocation ? ' · filtro por local aplicado' : ''}
            </p>
          </div>
        </header>
        {loading ? (
          <p>Carregando histórico…</p>
        ) : movements.length === 0 ? (
          <div className="catalog-empty">Nenhuma movimentação registrada.</div>
        ) : (
          <div className="catalog-registry-table catalog-registry-table--stock-movements">
            <div className="catalog-registry-table__head" role="row">
              <CatalogSortableTh
                label="Data e hora"
                column="createdAt"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
              />
              <CatalogSortableTh
                label="Produto"
                column="productName"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
              />
              <CatalogSortableTh
                label="Local / Tipo"
                column="locationName"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
              />
              <CatalogSortableTh
                label="Quantidade"
                column="quantity"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
              />
              <CatalogSortableTh
                label="Saldo"
                column="type"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
              />
              <CatalogSortableTh
                label="Motivo"
                column="reason"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
              />
            </div>
            <ul className="catalog-registry-list" aria-label="Lista de movimentações de estoque">
              {movements.map((m) => {
                const type = m.type as StockMovementType;
                return (
                  <li key={m.id} className="catalog-registry-row">
                    <time className="catalog-registry-date" dateTime={m.createdAt}>
                      {formatDateTime(m.createdAt)}
                    </time>
                    <span className="catalog-registry-name">{m.product?.name || 'Produto'}</span>
                    <span className="catalog-registry-contact">
                      {m.location?.name || '—'} · {movementTypeLabel(type)}
                    </span>
                    <span className="catalog-registry-contact">{formatQty(m.quantity)}</span>
                    <span className="catalog-registry-contact">
                      {formatQty(m.balanceBefore)} → {formatQty(m.balanceAfter)}
                    </span>
                    <p className="catalog-registry-cell--message stock-movements-table__reason" title={m.reason || '—'}>
                      {m.reason || '—'}
                    </p>
                  </li>
                );
              })}
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

      <AlertModal isOpen={alert.isOpen} onClose={() => setAlert({ ...alert, isOpen: false })} message={alert.message} type={alert.type} />
    </CatalogPageLayout>
  );
};

export default StockMovementsPage;
