import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import AlertModal from '../../components/AlertModal';
import PremiumSelect from '../../components/PremiumSelect';
import {
  AlertState,
  CrmCustomerListItem,
  CrmInteraction,
  CrmInteractionType,
  CrmSegment,
} from '../../types';
import { interactionTypeLabel, segmentLabel, tierLabel } from './crmUtils';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import RegistryFormModal from '../../components/RegistryFormModal';
import CatalogPagination from '../../components/catalog/CatalogPagination';
import CatalogSortableTh from '../../components/catalog/CatalogSortableTh';
import {
  DEFAULT_PAGE_SIZE,
  PaginatedMeta,
  PaginatedResponse,
  SortDirection,
} from '../../types/pagination';
import { getApiErrorMessage } from '../../utils/apiError';

const DEBOUNCE_MS = 300;

const CrmCustomersPage: React.FC = () => {
  const { user } = useContext(AuthContext) || {};
  const [items, setItems] = useState<CrmCustomerListItem[]>([]);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<SortDirection>('ASC');
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    interactions: CrmInteraction[];
    profile: CrmCustomerListItem['profile'];
  } | null>(null);
  const [profileForm, setProfileForm] = useState({
    segment: 'novo' as CrmSegment,
    tags: '',
    marketingOptIn: true,
    crmNotes: '',
  });
  const [interactionForm, setInteractionForm] = useState({
    type: 'observacao' as CrmInteractionType,
    subject: '',
    notes: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingInteraction, setIsSavingInteraction] = useState(false);
  const [alert, setAlert] = useState<AlertState>({ isOpen: false, message: '', type: 'error' });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const canManage = Boolean(user);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchDebounced(value.trim());
      setPage(1);
    }, DEBOUNCE_MS);
  };

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const load = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { page, limit, sortBy, sortOrder };
      if (searchDebounced) params.search = searchDebounced;
      if (segmentFilter) params.segment = segmentFilter;
      const { data } = await api.get<PaginatedResponse<CrmCustomerListItem>>('/crm/customers', { params });
      setItems(data.data ?? []);
      setMeta(data.meta);
    } catch (err: any) {
      setAlert({
        isOpen: true,
        message: err?.response?.data?.message || 'Não foi possível carregar a base de clientes.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, searchDebounced, segmentFilter]);

  useEffect(() => {
    if (canManage) {
      setLoading(true);
      load();
    }
  }, [canManage, load]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(column);
      setSortOrder(column === 'createdAt' ? 'DESC' : 'ASC');
    }
    setPage(1);
  };

  const closeDetail = () => {
    if (isSavingProfile || isSavingInteraction) return;
    setSelectedId(null);
    setDetail(null);
  };

  const openDetail = async (id: string) => {
    setSelectedId(id);
    try {
      const { data } = await api.get<{
        customer: CrmCustomerListItem;
        profile: CrmCustomerListItem['profile'];
        interactions: CrmInteraction[];
      }>(`/crm/customers/${id}`);
      setDetail({ interactions: data.interactions, profile: data.profile });
      setProfileForm({
        segment: data.profile?.segment || 'novo',
        tags: data.profile?.tags || '',
        marketingOptIn: data.profile?.marketingOptIn ?? true,
        crmNotes: data.profile?.crmNotes || '',
      });
    } catch (err: unknown) {
      setSelectedId(null);
      setDetail(null);
      setAlert({
        isOpen: true,
        message: getApiErrorMessage(err, 'Erro ao carregar cliente.'),
        type: 'error',
      });
    }
  };

  const saveProfile = async () => {
    if (!selectedId || isSavingProfile) return;
    setIsSavingProfile(true);
    try {
      await api.patch(`/crm/customers/${selectedId}/profile`, profileForm);
      await load();
      setAlert({ isOpen: true, message: 'Perfil CRM atualizado!', type: 'success' });
    } catch (err: unknown) {
      setAlert({ isOpen: true, message: getApiErrorMessage(err, 'Erro'), type: 'error' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const addInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || isSavingInteraction) return;
    setIsSavingInteraction(true);
    try {
      await api.post('/crm/customers/interactions', {
        customerId: selectedId,
        ...interactionForm,
      });
      setInteractionForm({ type: 'observacao', subject: '', notes: '' });
      await openDetail(selectedId);
      await load();
      setAlert({ isOpen: true, message: 'Interação registrada!', type: 'success' });
    } catch (err: unknown) {
      setAlert({ isOpen: true, message: getApiErrorMessage(err, 'Erro'), type: 'error' });
    } finally {
      setIsSavingInteraction(false);
    }
  };

  if (!canManage) return <div className="container">Acesso negado</div>;

  const selected = items.find((i) => i.id === selectedId);

  return (
    <CatalogPageLayout
      moduleLabel="CRM"
      modulePath="/crm/clientes"
      title="Base de clientes"
      description="Visão 360° dos clientes: segmento, histórico de contatos e programa de fidelidade."
      loading={loading && items.length === 0}
      loadingDescription="Carregando base de clientes."
    >
      <section className="catalog-surface">
        <div className="catalog-toolbar catalog-filter-toolbar">
          <div className="form-group catalog-search catalog-filter-toolbar__search">
            <label>Buscar</label>
            <input
              className="premium-text-input"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearchDebounced(search.trim());
                  setPage(1);
                }
              }}
              placeholder="Nome, telefone, e-mail…"
            />
          </div>
          <PremiumSelect
            label="Segmento"
            value={segmentFilter}
            options={[
              { value: '', label: 'Todos' },
              ...Object.entries(segmentLabel).map(([v, l]) => ({ value: v, label: l })),
            ]}
            wrapperClassName="form-group catalog-filter-toolbar__field"
            onChange={(value) => {
              setSegmentFilter(value);
              setPage(1);
            }}
          />
          <button
            type="button"
            className="catalog-form-footer-btn catalog-form-footer-btn--primary catalog-filter-toolbar__action"
            onClick={() => {
              setSearchDebounced(search.trim());
              setPage(1);
            }}
          >
            Buscar
          </button>
          <button
            type="button"
            className="catalog-form-footer-btn catalog-form-footer-btn--ghost catalog-filter-toolbar__action"
            onClick={() => {
              setSearch('');
              setSearchDebounced('');
              setSegmentFilter('');
              setSortBy('name');
              setSortOrder('ASC');
              setPage(1);
            }}
          >
            Limpar
          </button>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: selectedId ? '1fr 1fr' : '1fr', gap: 20 }}>
        <section className="catalog-surface">
          <div className="catalog-registry-table catalog-registry-table--customers catalog-registry-table--crm-customers">
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
                label="Segmento"
                column="segment"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
              />
              <CatalogSortableTh
                label="Cadastro"
                column="createdAt"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
              />
              <span>Fidelidade</span>
            </div>
            {items.length === 0 && !loading ? (
              <div className="catalog-empty">Nenhum cliente encontrado com os filtros atuais.</div>
            ) : (
              <ul className="catalog-registry-list" aria-label="Base de clientes CRM">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="catalog-registry-row"
                    style={{ cursor: 'pointer', outline: selectedId === item.id ? '2px solid #ea580c' : undefined }}
                    onClick={() => openDetail(item.id)}
                  >
                    <div className="catalog-registry-main">
                      <span className="catalog-registry-name">{item.name}</span>
                      <span className="catalog-registry-desc">{item.document || 'Sem documento'}</span>
                    </div>
                    <span className="catalog-registry-contact">{item.phone || item.email || 'Sem contato'}</span>
                    <span className="catalog-registry-contact">
                      {segmentLabel[item.profile?.segment || 'novo']}
                    </span>
                    <span className="catalog-registry-contact">{item.interactionsCount}</span>
                    <span className="catalog-registry-contact catalog-registry-cell--loyalty">
                      {item.loyaltyAccount
                        ? `${item.loyaltyAccount.pointsBalance} pts · ${tierLabel[item.loyaltyAccount.tier]}`
                        : 'Sem fidelidade'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
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

        <RegistryFormModal
          isOpen={Boolean(selectedId && selected)}
          wide
          title={selected?.name ?? 'Cliente'}
          subtitle={selected?.document || selected?.phone || selected?.email || 'Detalhes do cliente CRM'}
          isSaving={isSavingProfile || isSavingInteraction}
          onClose={closeDetail}
        >
          <div className="catalog-form">
            <PremiumSelect
              label="Segmento"
              value={profileForm.segment}
              options={Object.entries(segmentLabel).map(([v, l]) => ({ value: v, label: l }))}
              onChange={(v) => setProfileForm({ ...profileForm, segment: v as CrmSegment })}
            />
            <div className="form-group">
              <label>Tags (vírgula)</label>
              <input className="premium-text-input" value={profileForm.tags} onChange={(e) => setProfileForm({ ...profileForm, tags: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Notas CRM</label>
              <textarea className="premium-text-input" rows={2} value={profileForm.crmNotes} onChange={(e) => setProfileForm({ ...profileForm, crmNotes: e.target.value })} />
            </div>
            <label>
              <input type="checkbox" checked={profileForm.marketingOptIn} onChange={(e) => setProfileForm({ ...profileForm, marketingOptIn: e.target.checked })} /> Aceita marketing
            </label>
            <button
              type="button"
              className="catalog-form-footer-btn catalog-form-footer-btn--primary"
              onClick={saveProfile}
              disabled={isSavingProfile || isSavingInteraction}
            >
              {isSavingProfile ? 'Salvando…' : 'Salvar perfil'}
            </button>
          </div>

          <h3 style={{ marginTop: 24 }}>Nova interação</h3>
          <form className="catalog-form" onSubmit={addInteraction}>
            <PremiumSelect
              label="Tipo"
              value={interactionForm.type}
              options={Object.entries(interactionTypeLabel).map(([v, l]) => ({ value: v, label: l }))}
              onChange={(v) => setInteractionForm({ ...interactionForm, type: v as CrmInteractionType })}
            />
            <div className="form-group">
              <label>Assunto *</label>
              <input className="premium-text-input" value={interactionForm.subject} onChange={(e) => setInteractionForm({ ...interactionForm, subject: e.target.value })} required />
            </div>
            <button
              type="submit"
              className="catalog-card-button"
              disabled={isSavingProfile || isSavingInteraction}
            >
              {isSavingInteraction ? 'Registrando…' : 'Registrar'}
            </button>
          </form>

          <h3 style={{ marginTop: 24 }}>Histórico</h3>
          {detail?.interactions.length === 0 ? (
            <p style={{ color: '#64748b' }}>Sem interações.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {detail?.interactions.map((i) => (
                <li key={i.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>
                  <strong>{i.subject}</strong>
                  <br />
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {interactionTypeLabel[i.type]} · {new Date(i.createdAt).toLocaleString('pt-BR')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </RegistryFormModal>
      </div>

      <AlertModal isOpen={alert.isOpen} onClose={() => setAlert({ ...alert, isOpen: false })} message={alert.message} type={alert.type} />
    </CatalogPageLayout>
  );
};

export default CrmCustomersPage;
