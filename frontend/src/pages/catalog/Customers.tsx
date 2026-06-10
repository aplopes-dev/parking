import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import AlertModal from '../../components/AlertModal';
import ConfirmModal from '../../components/ConfirmModal';
import PremiumSelect from '../../components/PremiumSelect';
import CustomerFormModal, { CustomerFormValues } from './CustomerFormModal';
import { AlertState, Customer } from '../../types';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import CatalogFilterSearch from '../../components/catalog/CatalogFilterSearch';
import CatalogRegistryIconActions from '../../components/catalog/CatalogRegistryIconActions';
import CatalogPagination from '../../components/catalog/CatalogPagination';
import CatalogSortableTh from '../../components/catalog/CatalogSortableTh';
import {
  DEFAULT_PAGE_SIZE,
  PaginatedMeta,
  PaginatedResponse,
  SortDirection,
} from '../../types/pagination';

const DEBOUNCE_MS = 350;

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Ativos' },
  { value: 'false', label: 'Inativos' },
] as const;

const CustomersPage: React.FC = () => {
  const { user } = useContext(AuthContext) || {};
  const [items, setItems] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [loading, setLoading] = useState(true);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<AlertState>({ isOpen: false, message: '', type: 'error' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState('sortOrder');
  const [sortOrder, setSortOrder] = useState<SortDirection>('ASC');
  const [meta, setMeta] = useState<(PaginatedMeta & { counts?: { active?: number; inactive?: number } }) | null>(null);

  const canManage = Boolean(user);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSearchDebounced('');
      setPage(1);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setSearchDebounced(value.trim());
      setPage(1);
    }, DEBOUNCE_MS);
  };

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const applySearchNow = () => {
    clearTimeout(debounceRef.current);
    setSearchDebounced(search.trim());
    setPage(1);
  };

  const clearFilters = () => {
    clearTimeout(debounceRef.current);
    setSearch('');
    setSearchDebounced('');
    setStatusFilter('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(searchDebounced || statusFilter);

  const loadItems = useCallback(async () => {
    try {
      const params: Record<string, any> = { page, limit, sortBy, sortOrder };
      if (searchDebounced) params.search = searchDebounced;
      if (statusFilter === 'true') params.active = true;
      if (statusFilter === 'false') params.active = false;
      const { data } = await api.get<PaginatedResponse<Customer> | Customer[]>('/customers', { params });
      if (Array.isArray(data)) {
        setItems(data);
        setMeta({ page: 1, limit: data.length, total: data.length, totalPages: 1, sortBy, sortOrder });
      } else {
        setItems(data.data ?? []);
        setMeta(data.meta as any);
      }
    } catch (error) {
      console.error(error);
      setAlert({ isOpen: true, message: 'Erro ao carregar clientes.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, searchDebounced, statusFilter]);

  useEffect(() => {
    if (canManage) {
      setLoading(true);
      loadItems();
    }
  }, [canManage, loadItems]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(column);
      setSortOrder(column === 'createdAt' ? 'DESC' : 'ASC');
    }
    setPage(1);
  };

  const stats = {
    total: meta?.total ?? 0,
    active: meta?.counts?.active ?? 0,
    inactive: meta?.counts?.inactive ?? 0,
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormModalOpen(true);
  };

  const openEditModal = (item: Customer) => {
    setEditingItem(item);
    setFormModalOpen(true);
  };

  const closeFormModal = () => {
    if (isSaving) return;
    setFormModalOpen(false);
    setEditingItem(null);
  };

  const buildPayload = (values: CustomerFormValues) => ({
    name: values.name.trim(),
    email: values.email.trim() || null,
    phone: values.phone.trim() || null,
    document: values.document.trim() || null,
    birthDate: values.birthDate || null,
    address: values.address.trim() || null,
    city: values.city.trim() || null,
    state: values.state.trim().toUpperCase().slice(0, 2) || null,
    zipCode: values.zipCode.trim() || null,
    allergyNotes: values.allergyNotes.trim() || null,
    notes: values.notes.trim() || null,
    active: values.active,
  });

  const handleFormSubmit = async (values: CustomerFormValues) => {
    setIsSaving(true);
    try {
      const payload = buildPayload(values);
      if (editingItem) {
        await api.patch(`/customers/${editingItem.id}`, payload);
      } else {
        await api.post('/customers', payload);
      }
      setFormModalOpen(false);
      setEditingItem(null);
      await loadItems();
      setAlert({
        isOpen: true,
        message: editingItem ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!',
        type: 'success',
      });
    } catch (error: any) {
      setAlert({
        isOpen: true,
        message: error.response?.data?.message || 'Erro ao salvar cliente.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };


  const handleDelete = async () => {
    if (!confirmTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/customers/${confirmTarget.id}`);
      await loadItems();
      setAlert({ isOpen: true, message: 'Cliente excluído com sucesso!', type: 'success' });
      setConfirmOpen(false);
      setConfirmTarget(null);
    } catch (error: any) {
      setAlert({
        isOpen: true,
        message: error.response?.data?.message || 'Erro ao excluir cliente.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!canManage) {
    return <div className="container">Acesso negado</div>;
  }

  const initialLoading = loading && items.length === 0 && !hasActiveFilters;

  const statsGrid = (
    <section className="catalog-stats-grid" aria-label="Resumo dos clientes">
      <article className="catalog-stat-card">
        <span>Total</span>
        <strong>{stats.total}</strong>
        <p>Clientes na listagem atual.</p>
      </article>
      <article className="catalog-stat-card">
        <span>Ativos</span>
        <strong>{stats.active}</strong>
        <p>Disponíveis para atendimento.</p>
      </article>
      <article className="catalog-stat-card">
        <span>Inativos</span>
        <strong>{stats.inactive}</strong>
        <p>Ocultos da operação.</p>
      </article>
    </section>
  );

  const contactLine = (item: Customer): string => {
    if (item.phone && item.email) return `${item.phone} · ${item.email}`;
    return item.phone || item.email || '—';
  };

  const subtitleLine = (item: Customer): string => {
    if (item.document) return item.document;
    if (item.city) return `${item.city}${item.state ? ` / ${item.state}` : ''}`;
    return 'Sem documento';
  };

  return (
    <CatalogPageLayout
      className="catalog-page--ifood catalog-registry-page"
      moduleLabel="Cadastros"
      modulePath="/cadastros/clientes"
      title="Cadastro de clientes"
      description="Mantenha dados de contato, endereço e observações de alergias para atendimento, delivery e fidelização."
      loading={initialLoading}
      loadingDescription="Carregando base de clientes."
      actions={
        <button type="button" onClick={openCreateModal} className="catalog-action-button">
          Novo cliente
        </button>
      }
      stats={!initialLoading ? statsGrid : undefined}
    >
      <section className="catalog-surface">
        <div className="catalog-filter-toolbar-stack">
          <div className="catalog-toolbar catalog-filter-toolbar">
            <CatalogFilterSearch
              id="customer-search"
              className="catalog-filter-toolbar__search catalog-filter-toolbar__search--wide"
              value={search}
              placeholder="Nome, telefone, e-mail ou documento"
              onChange={handleSearchChange}
              onSubmit={applySearchNow}
            />
            <PremiumSelect
              label="Status"
              value={statusFilter}
              options={[...STATUS_FILTER_OPTIONS]}
              wrapperClassName="form-group catalog-filter-toolbar__field catalog-filter-toolbar__field--compact"
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            />
            <div className="catalog-filter-toolbar__actions">
              <button
                type="button"
                className="catalog-form-footer-btn catalog-form-footer-btn--primary catalog-filter-toolbar__action"
                onClick={applySearchNow}
              >
                Buscar
              </button>
              <button
                type="button"
                className="catalog-form-footer-btn catalog-form-footer-btn--ghost catalog-filter-toolbar__action"
                onClick={clearFilters}
                disabled={!hasActiveFilters && !search.trim()}
              >
                Limpar
              </button>
            </div>
          </div>

          {hasActiveFilters ? (
            <div className="catalog-filter-chips" aria-label="Filtros ativos">
              <span className="catalog-filter-chips__label">Filtros:</span>
              {searchDebounced ? (
                <span className="catalog-filter-chip">
                  Busca: {searchDebounced}
                  <button
                    type="button"
                    className="catalog-filter-chip__remove"
                    aria-label="Remover filtro de busca"
                    onClick={() => {
                      clearTimeout(debounceRef.current);
                      setSearch('');
                      setSearchDebounced('');
                      setPage(1);
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </span>
              ) : null}
              {statusFilter ? (
                <span className="catalog-filter-chip">
                  Status: {STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label}
                  <button
                    type="button"
                    className="catalog-filter-chip__remove"
                    aria-label="Remover filtro de status"
                    onClick={() => {
                      setStatusFilter('');
                      setPage(1);
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="catalog-registry-panel" aria-labelledby="customers-panel-title">
        <header className="catalog-registry-panel__header">
          <div>
            <h2 id="customers-panel-title">Clientes cadastrados</h2>
            <p className="catalog-registry-panel__meta">
              {meta?.total ?? 0} cliente(s)
              {hasActiveFilters ? ' · resultado filtrado' : ''}
            </p>
          </div>
        </header>

        {items.length === 0 && !loading ? (
          <div className="catalog-empty">
            {hasActiveFilters
              ? 'Nenhum cliente encontrado com os filtros aplicados.'
              : 'Nenhum cliente cadastrado. Clique em "Novo cliente" para começar.'}
          </div>
        ) : (
          <div className="catalog-registry-table catalog-registry-table--customers">
            <div className="catalog-registry-table__head" role="row">
              <CatalogSortableTh
                label="Cliente"
                column="name"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
              />
              <CatalogSortableTh
                label="Contato"
                column="phone"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
              />
              <CatalogSortableTh
                label="Status"
                column="active"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
              />
              <CatalogSortableTh
                label="Criado em"
                column="createdAt"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
              />
              <span>Ações</span>
            </div>
            <ul className="catalog-registry-list" aria-label="Lista de clientes">
              {items.map((item) => (
                <li key={item.id} className="catalog-registry-row">
                  <div className="catalog-registry-main">
                    <span className="catalog-registry-name">{item.name}</span>
                    <span className="catalog-registry-desc">{subtitleLine(item)}</span>
                  </div>

                  <span className="catalog-registry-contact">{contactLine(item)}</span>

                  <div className="catalog-registry-status">
                    <span className="catalog-pill is-muted">
                      {item.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <time className="catalog-registry-date" dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                  </time>

                  <CatalogRegistryIconActions
                    editLabel={`Editar cliente ${item.name}`}
                    deleteLabel={`Excluir cliente ${item.name}`}
                    onEdit={() => openEditModal(item)}
                    onDelete={() => {
                      setConfirmTarget(item);
                      setConfirmOpen(true);
                    }}
                  />
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

      <CustomerFormModal
        isOpen={formModalOpen}
        editing={editingItem}
        isSaving={isSaving}
        onClose={closeFormModal}
        onSubmit={handleFormSubmit}
      />

      <AlertModal
        isOpen={alert.isOpen}
        onClose={() => setAlert({ ...alert, isOpen: false })}
        message={alert.message}
        type={alert.type}
      />
      <ConfirmModal
        isOpen={confirmOpen}
        title="Excluir cliente"
        subtitle="Esta ação não pode ser desfeita."
        message={confirmTarget ? `O cliente "${confirmTarget.name}" será removido permanentemente.` : ''}
        confirmLabel="Excluir"
        isLoading={isDeleting}
        loadingLabel="Excluindo…"
        onClose={() => !isDeleting && setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </CatalogPageLayout>
  );
};

export default CustomersPage;
