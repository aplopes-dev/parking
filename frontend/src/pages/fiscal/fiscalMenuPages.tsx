import React, { useCallback, useEffect, useState } from 'react';
import AlertModal from '../../components/AlertModal';
import ConfirmModal from '../../components/ConfirmModal';
import PremiumSelect from '../../components/PremiumSelect';
import RegistryFormModal, { registryModalFooterButtons } from '../../components/RegistryFormModal';
import {
  cancelFiscalInvoice,
  createAccountant,
  deleteAccountant,
  createFiscalOrder,
  createFiscalOrderFromPdv,
  createFiscalReturn,
  deleteFiscalReturn,
  createNumberVoid,
  emitFiscalInvoice,
  fetchAccountants,
  fetchAllFiscalInvoices,
  fetchAllFiscalOrders,
  fetchFiscalInvoices,
  fetchFiscalOrders,
  fetchFiscalReturns,
  fetchFiscalSettings,
  fetchNumberVoids,
  importFiscalInvoice,
  updateAccountant,
  updateFiscalReturn,
  updateFiscalSettings,
} from '../../services/fiscalApi';
import type { FiscalInvoiceType, FiscalOrderType } from '../../types/fiscal';
import { DEFAULT_PAGE_SIZE, type PaginatedMeta, type SortDirection } from '../../types/pagination';
import CatalogPagination from '../../components/catalog/CatalogPagination';
import CatalogRegistryIconActions from '../../components/catalog/CatalogRegistryIconActions';
import CatalogSortableTh from '../../components/catalog/CatalogSortableTh';
import {
  AccessDenied,
  FiscalField,
  FiscalFileField,
  FiscalFormActions,
  FiscalPageLayout,
  FiscalSection,
  FiscalTable,
  INVOICE_TYPE_LABEL,
  ORDER_TYPE_LABEL,
  STATUS_LABEL,
  errMsg,
  formatMoney,
  todayIso,
  useFiscalAccess,
} from './fiscalShared';

const emptyEmitterSettingsForm = () => ({
  legalName: '',
  tradeName: '',
  cnpj: '',
  stateRegistration: '',
  environment: 'homologation' as 'homologation' | 'production',
  nfeSeries: '1',
  nfceSeries: '1',
  certificateHint: '',
  sefazNotes: '',
});

function EmitterSettingsModal({
  isOpen,
  onClose,
  onSaved,
  onError,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  onError?: (message: string) => void;
}) {
  const [form, setForm] = useState(emptyEmitterSettingsForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchFiscalSettings().then((s) =>
      setForm({
        legalName: s.legalName ?? '',
        tradeName: s.tradeName ?? '',
        cnpj: s.cnpj ?? '',
        stateRegistration: s.stateRegistration ?? '',
        environment: s.environment,
        nfeSeries: String(s.nfeSeries),
        nfceSeries: String(s.nfceSeries),
        certificateHint: s.certificateHint ?? '',
        sefazNotes: s.sefazNotes ?? '',
      }),
    );
  }, [isOpen]);

  const closeModal = () => {
    if (isSaving) return;
    onClose();
  };

  return (
    <RegistryFormModal
      isOpen={isOpen}
      wide
      title="Configuração do emitente"
      subtitle="Dados cadastrais, ambiente SEFAZ e séries de documentos fiscais."
      isSaving={isSaving}
      onClose={closeModal}
      onSubmit={async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
          await updateFiscalSettings({
            ...form,
            nfeSeries: parseInt(form.nfeSeries, 10),
            nfceSeries: parseInt(form.nfceSeries, 10),
          });
          onClose();
          onSaved?.();
        } catch (err) {
          onError?.(errMsg(err));
        } finally {
          setIsSaving(false);
        }
      }}
      footer={registryModalFooterButtons({
        onClose: closeModal,
        isSaving,
        submitLabel: 'Salvar configurações',
      })}
    >
      <div className="catalog-form-grid">
        <FiscalField label="Razão social" htmlFor="emitter-legal-name">
          <input
            id="emitter-legal-name"
            className="premium-text-input"
            value={form.legalName}
            onChange={(e) => setForm({ ...form, legalName: e.target.value })}
            required
          />
        </FiscalField>
        <FiscalField label="Nome fantasia" htmlFor="emitter-trade-name">
          <input
            id="emitter-trade-name"
            className="premium-text-input"
            value={form.tradeName}
            onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
          />
        </FiscalField>
        <FiscalField label="CNPJ" htmlFor="emitter-cnpj">
          <input
            id="emitter-cnpj"
            className="premium-text-input"
            value={form.cnpj}
            onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
          />
        </FiscalField>
        <FiscalField label="Inscrição estadual" htmlFor="emitter-state-registration">
          <input
            id="emitter-state-registration"
            className="premium-text-input"
            value={form.stateRegistration}
            onChange={(e) => setForm({ ...form, stateRegistration: e.target.value })}
          />
        </FiscalField>
        <PremiumSelect
          label="Ambiente"
          value={form.environment}
          options={[
            { value: 'homologation', label: 'Homologação' },
            { value: 'production', label: 'Produção' },
          ]}
          onChange={(v) => setForm({ ...form, environment: v as 'homologation' | 'production' })}
        />
        <FiscalField label="Série NF-e" htmlFor="emitter-nfe-series">
          <input
            id="emitter-nfe-series"
            type="number"
            className="premium-text-input"
            value={form.nfeSeries}
            onChange={(e) => setForm({ ...form, nfeSeries: e.target.value })}
          />
        </FiscalField>
        <FiscalField label="Série NFC-e" htmlFor="emitter-nfce-series">
          <input
            id="emitter-nfce-series"
            type="number"
            className="premium-text-input"
            value={form.nfceSeries}
            onChange={(e) => setForm({ ...form, nfceSeries: e.target.value })}
          />
        </FiscalField>
      </div>
    </RegistryFormModal>
  );
}

// —— Pedidos venda/compra ——
const emptyManualOrderForm = () => ({
  counterpartyName: '',
  counterpartyDocument: '',
  issueDate: todayIso(),
  notes: '',
  productName: '',
  quantity: '1',
  unitPrice: '',
});

export const FiscalOrdersPage: React.FC = () => {
  const can = useFiscalAccess();
  const [orderType, setOrderType] = useState<FiscalOrderType>('sale');
  const [form, setForm] = useState(emptyManualOrderForm);
  const [pdvOrderId, setPdvOrderId] = useState('');
  const [showManualOrder, setShowManualOrder] = useState(false);
  const [showEmitterSettings, setShowEmitterSettings] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '' });

  const closeManualOrderModal = () => {
    if (isSavingOrder) return;
    setShowManualOrder(false);
    setForm(emptyManualOrderForm());
  };

  if (!can) return <AccessDenied />;

  return (
    <FiscalPageLayout
      title="Pedidos de venda e compra"
      description="Registre pedidos fiscais manuais ou importe do PDV."
      actions={
        <>
          <button
            type="button"
            className="catalog-action-button is-secondary"
            onClick={() => setShowEmitterSettings(true)}
          >
            Configuração do emitente
          </button>
          <button type="button" className="catalog-action-button" onClick={() => setShowManualOrder(true)}>
            Novo pedido
          </button>
        </>
      }
    >
      <EmitterSettingsModal
        isOpen={showEmitterSettings}
        onClose={() => setShowEmitterSettings(false)}
        onSaved={() => setAlert({ open: true, message: 'Configurações salvas.' })}
        onError={(message) => setAlert({ open: true, message })}
      />
      <FiscalSection title="Importar do PDV">
        <section className="finance-toolbar" aria-label="Pedido PDV">
          <FiscalField label="ID do pedido PDV">
            <input
              className="premium-text-input"
              value={pdvOrderId}
              onChange={(e) => setPdvOrderId(e.target.value)}
              placeholder="UUID do pedido"
            />
          </FiscalField>
          <PremiumSelect
            label="Tipo"
            value={orderType}
            options={[
              { value: 'sale', label: 'Venda' },
              { value: 'purchase', label: 'Compra' },
            ]}
            onChange={(v) => setOrderType(v as FiscalOrderType)}
          />
          <div className="finance-toolbar__actions">
            <button
              type="button"
              className="catalog-form-footer-btn catalog-form-footer-btn--primary"
              onClick={async () => {
                try {
                  await createFiscalOrderFromPdv({ pdvOrderId, orderType });
                  setAlert({ open: true, message: 'Pedido fiscal criado a partir do PDV.' });
                } catch (err) {
                  setAlert({ open: true, message: errMsg(err) });
                }
              }}
            >
              Importar PDV
            </button>
          </div>
        </section>
      </FiscalSection>
      <RegistryFormModal
        isOpen={showManualOrder}
        wide
        title="Novo pedido fiscal"
        subtitle="Cadastre um pedido de venda ou compra manualmente."
        isSaving={isSavingOrder}
        onClose={closeManualOrderModal}
        onSubmit={async (e) => {
          e.preventDefault();
          setIsSavingOrder(true);
          try {
            await createFiscalOrder({
              orderType,
              counterpartyName: form.counterpartyName,
              counterpartyDocument: form.counterpartyDocument || undefined,
              issueDate: form.issueDate,
              notes: form.notes || undefined,
              items: [
                {
                  productName: form.productName,
                  quantity: parseFloat(form.quantity),
                  unitPrice: parseFloat(form.unitPrice),
                },
              ],
            });
            setShowManualOrder(false);
            setForm(emptyManualOrderForm());
            setAlert({ open: true, message: 'Pedido fiscal salvo.' });
          } catch (err) {
            setAlert({ open: true, message: errMsg(err) });
          } finally {
            setIsSavingOrder(false);
          }
        }}
        footer={registryModalFooterButtons({
          onClose: closeManualOrderModal,
          isSaving: isSavingOrder,
          submitLabel: 'Criar pedido',
        })}
      >
        <div className="catalog-form-grid">
          <PremiumSelect
            label="Tipo"
            value={orderType}
            options={[
              { value: 'sale', label: 'Venda' },
              { value: 'purchase', label: 'Compra' },
            ]}
            onChange={(v) => setOrderType(v as FiscalOrderType)}
          />
          <FiscalField label="Cliente / fornecedor">
            <input
              className="premium-text-input"
              value={form.counterpartyName}
              onChange={(e) => setForm({ ...form, counterpartyName: e.target.value })}
              required
            />
          </FiscalField>
          <FiscalField label="CPF / CNPJ">
            <input
              className="premium-text-input"
              value={form.counterpartyDocument}
              onChange={(e) => setForm({ ...form, counterpartyDocument: e.target.value })}
            />
          </FiscalField>
          <FiscalField label="Data">
            <input
              type="date"
              className="premium-text-input"
              value={form.issueDate}
              onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
            />
          </FiscalField>
          <FiscalField label="Produto">
            <input
              className="premium-text-input"
              value={form.productName}
              onChange={(e) => setForm({ ...form, productName: e.target.value })}
              required
            />
          </FiscalField>
          <FiscalField label="Quantidade">
            <input
              type="number"
              className="premium-text-input"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </FiscalField>
          <FiscalField label="Preço unitário (R$)">
            <input
              type="number"
              step="0.01"
              className="premium-text-input"
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
              required
            />
          </FiscalField>
        </div>
      </RegistryFormModal>
      <AlertModal isOpen={alert.open} message={alert.message} onClose={() => setAlert({ open: false, message: '' })} />
    </FiscalPageLayout>
  );
};

// —— Listagem ——
export const FiscalListPage: React.FC = () => {
  const can = useFiscalAccess();
  const [rows, setRows] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<'' | FiscalOrderType>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);

  const load = useCallback(async () => {
    const result = await fetchFiscalOrders({
      orderType: filterType || undefined,
      from: from || undefined,
      to: to || undefined,
      page,
      limit,
    });
    setRows(result.items);
    setMeta(result.meta);
  }, [filterType, from, to, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [filterType, from, to]);

  useEffect(() => {
    if (can) void load();
  }, [can, load]);

  if (!can) return <AccessDenied />;

  return (
    <FiscalPageLayout title="Listagem de pedidos" description="Todos os pedidos fiscais do estabelecimento.">
      <section className="catalog-surface">
        <div className="catalog-toolbar catalog-filter-toolbar finance-toolbar" aria-label="Filtros">
        <PremiumSelect
          label="Tipo"
          value={filterType}
          options={[
            { value: '', label: 'Todos' },
            { value: 'sale', label: 'Venda' },
            { value: 'purchase', label: 'Compra' },
          ]}
          onChange={(v) => setFilterType(v as FiscalOrderType | '')}
        />
        <FiscalField label="De">
          <input
            type="date"
            className="premium-text-input"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </FiscalField>
        <FiscalField label="Até">
          <input
            type="date"
            className="premium-text-input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </FiscalField>
        <button
          type="button"
          className="catalog-form-footer-btn catalog-form-footer-btn--primary catalog-filter-toolbar__action"
          onClick={load}
        >
          Buscar
        </button>
        </div>
      </section>
      <FiscalTable
        title="Pedidos fiscais"
        headers={['Ref.', 'Tipo', 'Contraparte', 'Data', 'Total', 'Status']}
        rows={rows.map((r) => [
          r.referenceCode ?? r.pdvOrder?.orderNumber ?? '—',
          ORDER_TYPE_LABEL[r.orderType] ?? r.orderType,
          r.counterpartyName,
          r.issueDate?.slice(0, 10),
          formatMoney(r.totalAmount),
          STATUS_LABEL[r.status] ?? r.status,
        ])}
        pagination={
          meta && meta.total > 0
            ? {
                page: meta.page,
                totalPages: meta.totalPages,
                total: meta.total,
                limit,
                onPageChange: setPage,
                onLimitChange: (next) => {
                  setLimit(next);
                  setPage(1);
                },
              }
            : undefined
        }
      />
    </FiscalPageLayout>
  );
};

// —— Devoluções ——
export const FiscalReturnsPage: React.FC = () => {
  const can = useFiscalAccess();
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({
    returnType: 'sale_return' as 'sale_return' | 'purchase_return',
    reason: '',
    returnDate: todayIso(),
    totalAmount: '',
    fiscalOrderId: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState('returnDate');
  const [sortOrder, setSortOrder] = useState<SortDirection>('DESC');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [returnTypeFilter, setReturnTypeFilter] = useState<'' | 'sale_return' | 'purchase_return'>('');
  const [alert, setAlert] = useState<{
    open: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ open: false, message: '', type: 'success' });
  const RETURN_TYPE_LABEL: Record<'sale_return' | 'purchase_return', string> = {
    sale_return: 'Devolução de venda',
    purchase_return: 'Devolução de compra',
  };
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const emptyForm = () => ({
    returnType: 'sale_return' as 'sale_return' | 'purchase_return',
    reason: '',
    returnDate: todayIso(),
    totalAmount: '',
    fiscalOrderId: '',
  });

  const closeFormModal = () => {
    if (isSaving) return;
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const loadReturns = useCallback(async () => {
    const data = await fetchFiscalReturns({
      page,
      limit,
      sortBy,
      sortOrder,
      search: searchDebounced || undefined,
      returnType: returnTypeFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
    setRows(data.data ?? []);
    setMeta(data.meta ?? null);
  }, [page, limit, sortBy, sortOrder, searchDebounced, returnTypeFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (can) void loadReturns();
  }, [can, loadReturns]);

  if (!can) return <AccessDenied />;

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      totalAmount: parseFloat(form.totalAmount),
      fiscalOrderId: form.fiscalOrderId || undefined,
    };
    setIsSaving(true);
    try {
      if (editingId) {
        await updateFiscalReturn(editingId, payload);
        setAlert({ open: true, message: 'Devolução atualizada.', type: 'success' });
      } else {
        await createFiscalReturn(payload);
        setAlert({ open: true, message: 'Devolução registrada.', type: 'success' });
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
      await loadReturns();
    } catch (err) {
      setAlert({ open: true, message: errMsg(err), type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FiscalPageLayout
      title="Devolução de compra e venda"
      description="Registre devoluções vinculadas a pedidos ou notas."
      actions={
        <button type="button" className="catalog-action-button" onClick={openCreateModal}>
          Registrar devolução
        </button>
      }
    >
      <RegistryFormModal
        isOpen={showForm}
        wide
        title={editingId ? 'Editar devolução' : 'Nova devolução'}
        subtitle="Registre devoluções de venda ou de compra vinculadas a pedidos fiscais."
        isSaving={isSaving}
        onClose={closeFormModal}
        onSubmit={handleSubmitReturn}
        footer={registryModalFooterButtons({
          onClose: closeFormModal,
          isSaving,
          submitLabel: editingId ? 'Salvar alterações' : 'Registrar devolução',
        })}
      >
        <div className="catalog-form-grid">
          <PremiumSelect
            label="Tipo"
            value={form.returnType}
            options={[
              { value: 'sale_return', label: 'Devolução de venda' },
              { value: 'purchase_return', label: 'Devolução de compra' },
            ]}
            onChange={(v) => setForm({ ...form, returnType: v as 'sale_return' | 'purchase_return' })}
          />
          <FiscalField label="Data">
            <input
              type="date"
              className="premium-text-input"
              value={form.returnDate}
              onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
            />
          </FiscalField>
          <FiscalField label="Valor (R$)">
            <input
              type="number"
              step="0.01"
              className="premium-text-input"
              value={form.totalAmount}
              onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
              required
            />
          </FiscalField>
          <FiscalField label="ID pedido fiscal (opcional)">
            <input
              className="premium-text-input"
              value={form.fiscalOrderId}
              onChange={(e) => setForm({ ...form, fiscalOrderId: e.target.value })}
            />
          </FiscalField>
          <FiscalField label="Motivo" className="form-group--full fiscal-return-motivo-field">
            <textarea
              className="premium-text-input fiscal-return-motivo-input"
              rows={6}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              required
            />
          </FiscalField>
        </div>
      </RegistryFormModal>
      <section className="catalog-surface">
        <div className="catalog-toolbar catalog-filter-toolbar">
          <div className="form-group catalog-search catalog-filter-toolbar__search catalog-filter-toolbar__search--wide">
            <label htmlFor="fiscal-returns-search">Buscar</label>
            <input
              id="fiscal-returns-search"
              className="premium-text-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Motivo ou tipo…"
            />
          </div>
          <PremiumSelect
            label="Tipo"
            value={returnTypeFilter}
            options={[
              { value: '', label: 'Todos' },
              { value: 'sale_return', label: 'Devolução de venda' },
              { value: 'purchase_return', label: 'Devolução de compra' },
            ]}
            wrapperClassName="form-group catalog-filter-toolbar__field"
            onChange={(v) => {
              setReturnTypeFilter(v as '' | 'sale_return' | 'purchase_return');
              setPage(1);
            }}
          />
          <div className="form-group catalog-filter-toolbar__field">
            <label htmlFor="fiscal-returns-date-from">De</label>
            <input
              id="fiscal-returns-date-from"
              type="date"
              className="premium-text-input"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="form-group catalog-filter-toolbar__field">
            <label htmlFor="fiscal-returns-date-to">Até</label>
            <input
              id="fiscal-returns-date-to"
              type="date"
              className="premium-text-input"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
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
              setDateFrom('');
              setDateTo('');
              setReturnTypeFilter('');
              setPage(1);
            }}
          >
            Limpar
          </button>
        </div>
      </section>
      <section className="catalog-registry-panel" aria-labelledby="fiscal-returns-list-title">
        <header className="catalog-registry-panel__header">
          <div>
            <h2 id="fiscal-returns-list-title">Devoluções registradas</h2>
            <p className="catalog-registry-panel__meta">{meta?.total ?? 0} registro(s)</p>
          </div>
        </header>
        {rows.length === 0 ? (
          <div className="catalog-empty">Nenhuma devolução registrada.</div>
        ) : (
          <div className="catalog-registry-table catalog-registry-table--fiscal-returns">
            <div className="catalog-registry-table__head" role="row">
              <CatalogSortableTh label="Tipo" column="returnType" activeSortBy={sortBy} activeSortOrder={sortOrder} onSort={(column) => { setSortBy(column); setSortOrder((prev) => (sortBy === column && prev === 'ASC' ? 'DESC' : 'ASC')); setPage(1); }} />
              <CatalogSortableTh label="Data" column="returnDate" activeSortBy={sortBy} activeSortOrder={sortOrder} onSort={(column) => { setSortBy(column); setSortOrder((prev) => (sortBy === column && prev === 'ASC' ? 'DESC' : 'ASC')); setPage(1); }} />
              <CatalogSortableTh label="Valor" column="totalAmount" activeSortBy={sortBy} activeSortOrder={sortOrder} onSort={(column) => { setSortBy(column); setSortOrder((prev) => (sortBy === column && prev === 'ASC' ? 'DESC' : 'ASC')); setPage(1); }} />
              <CatalogSortableTh label="Motivo" column="reason" activeSortBy={sortBy} activeSortOrder={sortOrder} onSort={(column) => { setSortBy(column); setSortOrder((prev) => (sortBy === column && prev === 'ASC' ? 'DESC' : 'ASC')); setPage(1); }} />
              <span>Ações</span>
            </div>
            <ul className="catalog-registry-list" aria-label="Lista de devoluções">
              {rows.map((r) => (
                <li key={r.id} className="catalog-registry-row">
                  <span className="catalog-registry-name">
                    {RETURN_TYPE_LABEL[r.returnType as 'sale_return' | 'purchase_return'] ?? r.returnType}
                  </span>
                  <span className="catalog-registry-contact">{(r.returnDate ?? '').slice(0, 10)}</span>
                  <span className="catalog-registry-contact">{formatMoney(r.totalAmount)}</span>
                  <p className="catalog-registry-cell--message" title={r.reason}>
                    {r.reason}
                  </p>
                  <CatalogRegistryIconActions
                    editLabel={`Editar devolução ${r.reason ?? r.id}`}
                    deleteLabel={`Excluir devolução ${r.reason ?? r.id}`}
                    onEdit={() => {
                      setEditingId(r.id);
                      setForm({
                        returnType: r.returnType,
                        reason: r.reason ?? '',
                        returnDate: (r.returnDate ?? '').slice(0, 10),
                        totalAmount: String(Number(r.totalAmount) || ''),
                        fiscalOrderId: r.fiscalOrderId ?? '',
                      });
                      setShowForm(true);
                    }}
                    onDelete={() => {
                      setConfirmDelete({ id: r.id, label: r.reason ?? 'devolução' });
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
            onPageChange={setPage}
            onLimitChange={(next) => {
              setLimit(next);
              setPage(1);
            }}
          />
        )}
      </section>
      <AlertModal
        isOpen={alert.open}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert((a) => ({ ...a, open: false, message: '' }))}
      />
      <ConfirmModal
        isOpen={Boolean(confirmDelete)}
        title="Excluir devolução"
        subtitle="Esta ação não pode ser desfeita."
        message={confirmDelete ? `A devolução "${confirmDelete.label}" será removida permanentemente.` : ''}
        confirmLabel="Excluir"
        isLoading={isDeleting}
        loadingLabel="Excluindo…"
        onClose={() => !isDeleting && setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          setIsDeleting(true);
          try {
            await deleteFiscalReturn(confirmDelete.id);
            setConfirmDelete(null);
            setAlert({ open: true, message: 'Devolução excluída.', type: 'success' });
            await loadReturns();
          } catch (err) {
            setAlert({ open: true, message: errMsg(err), type: 'error' });
          } finally {
            setIsDeleting(false);
          }
        }}
      />
    </FiscalPageLayout>
  );
};

// —— Notas ——
export const FiscalInvoicesPage: React.FC = () => {
  const can = useFiscalAccess();
  const [rows, setRows] = useState<any[]>([]);
  const [direction, setDirection] = useState<'' | 'emitted' | 'received'>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);

  const load = useCallback(async () => {
    const result = await fetchFiscalInvoices({
      direction: direction || undefined,
      page,
      limit,
    });
    setRows(result.items);
    setMeta(result.meta);
  }, [direction, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [direction]);

  useEffect(() => {
    if (can) void load();
  }, [can, load]);

  if (!can) return <AccessDenied />;

  return (
    <FiscalPageLayout title="Notas emitidas e recebidas" description="NF-e e NFC-e autorizadas, recebidas ou canceladas.">
      <section className="catalog-surface">
        <div className="catalog-toolbar catalog-filter-toolbar finance-toolbar" aria-label="Filtros">
          <PremiumSelect
            label="Direção"
            value={direction}
            options={[
              { value: '', label: 'Todas' },
              { value: 'emitted', label: 'Emitidas' },
              { value: 'received', label: 'Recebidas' },
            ]}
            wrapperClassName="form-group catalog-filter-toolbar__field"
            onChange={(v) => setDirection(v as typeof direction)}
          />
          <button
            type="button"
            className="catalog-form-footer-btn catalog-form-footer-btn--primary catalog-filter-toolbar__action"
            onClick={load}
          >
            Buscar
          </button>
        </div>
      </section>
      <FiscalTable
        title="Notas fiscais"
        headers={['Tipo', 'Nº', 'Série', 'Contraparte', 'Valor', 'Status', 'Chave']}
        rows={rows.map((r) => [
          INVOICE_TYPE_LABEL[r.invoiceType],
          r.number ?? '—',
          r.series,
          r.counterpartyName ?? '—',
          formatMoney(r.totalAmount),
          STATUS_LABEL[r.status] ?? r.status,
          r.accessKey ? `${r.accessKey.slice(0, 8)}…` : '—',
        ])}
        pagination={
          meta && meta.total > 0
            ? {
                page: meta.page,
                totalPages: meta.totalPages,
                total: meta.total,
                limit,
                onPageChange: setPage,
                onLimitChange: (next) => {
                  setLimit(next);
                  setPage(1);
                },
              }
            : undefined
        }
      />
    </FiscalPageLayout>
  );
};

// —— Importação ——
export const FiscalImportPage: React.FC = () => {
  const can = useFiscalAccess();
  const [xml, setXml] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [alert, setAlert] = useState({ open: false, message: '' });

  if (!can) return <AccessDenied />;

  return (
    <FiscalPageLayout title="Importação de notas (XML/SEFAZ)" description="Importe XML de notas de entrada do fornecedor.">
      <FiscalSection title="Importar XML">
        <div className="catalog-form">
          <FiscalFileField
            label="Arquivo XML"
            fileName={fileName}
            onFileChange={(f) => {
              setFile(f);
              setFileName(f?.name ?? null);
            }}
          />
          <FiscalField label="Ou cole o XML">
            <textarea
              className="premium-text-input"
              rows={8}
              value={xml}
              onChange={(e) => setXml(e.target.value)}
              placeholder="Conteúdo do arquivo XML"
            />
          </FiscalField>
          <FiscalFormActions>
            <button
              type="button"
              className="catalog-form-footer-btn catalog-form-footer-btn--primary"
              onClick={async () => {
                try {
                  if (file) {
                    const fd = new FormData();
                    fd.append('file', file);
                    await importFiscalInvoice(fd);
                  } else {
                    await importFiscalInvoice({ xmlContent: xml });
                  }
                  setAlert({ open: true, message: 'Nota importada.' });
                } catch (err) {
                  setAlert({ open: true, message: errMsg(err) });
                }
              }}
            >
              Importar nota
            </button>
          </FiscalFormActions>
        </div>
      </FiscalSection>
      <AlertModal isOpen={alert.open} message={alert.message} onClose={() => setAlert({ open: false, message: '' })} />
    </FiscalPageLayout>
  );
};

// —— Emissão ——
export const FiscalEmitPage: React.FC = () => {
  const can = useFiscalAccess();
  const [invoiceType, setInvoiceType] = useState<FiscalInvoiceType>('nfce');
  const [fiscalOrderId, setFiscalOrderId] = useState('');
  const [pdvOrderId, setPdvOrderId] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [showEmitterSettings, setShowEmitterSettings] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '' });

  useEffect(() => {
    if (can) fetchAllFiscalOrders({ status: 'draft' }).then(setOrders).catch(() => setOrders([]));
  }, [can]);

  if (!can) return <AccessDenied />;

  return (
    <FiscalPageLayout
      title="Emissão NF-e / NFC-e"
      description="Emita nota a partir de pedido fiscal ou pedido PDV (homologação simula autorização)."
      actions={
        <button
          type="button"
          className="catalog-action-button is-secondary"
          onClick={() => setShowEmitterSettings(true)}
        >
          Configuração do emitente
        </button>
      }
    >
      <EmitterSettingsModal
        isOpen={showEmitterSettings}
        onClose={() => setShowEmitterSettings(false)}
        onSaved={() => setAlert({ open: true, message: 'Configurações salvas.' })}
        onError={(message) => setAlert({ open: true, message })}
      />
      <FiscalSection title="Emitir documento">
        <section className="finance-toolbar">
          <PremiumSelect
            label="Documento"
            value={invoiceType}
            options={[
              { value: 'nfce', label: 'NFC-e (consumidor)' },
              { value: 'nfe', label: 'NF-e' },
            ]}
            onChange={(v) => setInvoiceType(v as FiscalInvoiceType)}
          />
          <PremiumSelect
            label="Pedido fiscal"
            value={fiscalOrderId}
            options={[
              { value: '', label: 'Selecione' },
              ...orders.map((o) => ({
                value: o.id,
                label: `${o.referenceCode ?? o.id} — ${o.counterpartyName}`,
              })),
            ]}
            onChange={setFiscalOrderId}
          />
          <FiscalField label="Ou ID pedido PDV">
            <input
              className="premium-text-input"
              value={pdvOrderId}
              onChange={(e) => setPdvOrderId(e.target.value)}
            />
          </FiscalField>
          <div className="finance-toolbar__actions">
            <button
              type="button"
              className="catalog-form-footer-btn catalog-form-footer-btn--primary"
              onClick={async () => {
                try {
                  const inv = await emitFiscalInvoice({
                    invoiceType,
                    fiscalOrderId: fiscalOrderId || undefined,
                    pdvOrderId: pdvOrderId || undefined,
                  });
                  setAlert({
                    open: true,
                    message: `Nota ${inv.number} autorizada. Chave: ${inv.accessKey?.slice(0, 12)}…`,
                  });
                } catch (err) {
                  setAlert({ open: true, message: errMsg(err) });
                }
              }}
            >
              Emitir nota
            </button>
          </div>
        </section>
      </FiscalSection>
      <AlertModal isOpen={alert.open} message={alert.message} onClose={() => setAlert({ open: false, message: '' })} />
    </FiscalPageLayout>
  );
};

// —— Cancelamento ——
export const FiscalCancelPage: React.FC = () => {
  const can = useFiscalAccess();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [reason, setReason] = useState('');
  const [alert, setAlert] = useState({ open: false, message: '' });

  useEffect(() => {
    if (can) {
      fetchAllFiscalInvoices({ direction: 'emitted', status: 'authorized' }).then(setInvoices);
    }
  }, [can]);

  if (!can) return <AccessDenied />;

  return (
    <FiscalPageLayout
      title="Cancelar NF-e / NFC-e"
      description="Cancelamento de notas autorizadas (homologação/produção conforme configuração)."
    >
      <FiscalSection title="Cancelar nota">
        <div className="catalog-form">
          <PremiumSelect
            label="Nota"
            value={selected}
            options={[
              { value: '', label: 'Selecione' },
              ...invoices.map((i) => ({
                value: i.id,
                label: `${INVOICE_TYPE_LABEL[i.invoiceType]} ${i.number} — ${formatMoney(i.totalAmount)}`,
              })),
            ]}
            onChange={setSelected}
          />
          <FiscalField label="Motivo do cancelamento">
            <textarea
              className="premium-text-input"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={15}
            />
          </FiscalField>
          <FiscalFormActions>
            <button
              type="button"
              className="catalog-form-footer-btn catalog-form-footer-btn--primary"
              onClick={async () => {
                if (!selected) {
                  setAlert({ open: true, message: 'Selecione a nota.' });
                  return;
                }
                try {
                  await cancelFiscalInvoice(selected, reason);
                  setInvoices(await fetchAllFiscalInvoices({ direction: 'emitted', status: 'authorized' }));
                  setAlert({ open: true, message: 'Nota cancelada.' });
                } catch (err) {
                  setAlert({ open: true, message: errMsg(err) });
                }
              }}
            >
              Cancelar nota
            </button>
          </FiscalFormActions>
        </div>
      </FiscalSection>
      <AlertModal isOpen={alert.open} message={alert.message} onClose={() => setAlert({ open: false, message: '' })} />
    </FiscalPageLayout>
  );
};

// —— Inutilização ——
const emptyVoidForm = () => ({
  invoiceType: 'nfce' as FiscalInvoiceType,
  series: '1',
  numberFrom: '',
  numberTo: '',
  reason: '',
  voidDate: todayIso(),
});

export const FiscalVoidPage: React.FC = () => {
  const can = useFiscalAccess();
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [form, setForm] = useState(emptyVoidForm);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '' });

  const load = useCallback(async () => {
    const result = await fetchNumberVoids({ page, limit });
    setRows(result.items);
    setMeta(result.meta);
  }, [page, limit]);

  useEffect(() => {
    if (can) void load();
  }, [can, load]);

  const closeVoidModal = () => {
    if (isSaving) return;
    setShowForm(false);
    setForm(emptyVoidForm());
  };

  if (!can) return <AccessDenied />;

  return (
    <FiscalPageLayout
      title="Inutilização de notas"
      description="Registre faixa de numeração inutilizada na SEFAZ."
      actions={
        <button type="button" className="catalog-action-button" onClick={() => setShowForm(true)}>
          Nova inutilização
        </button>
      }
    >
      <RegistryFormModal
        isOpen={showForm}
        title="Nova inutilização"
        subtitle="Registre faixa de numeração inutilizada na SEFAZ."
        isSaving={isSaving}
        onClose={closeVoidModal}
        onSubmit={async (e) => {
          e.preventDefault();
          setIsSaving(true);
          try {
            await createNumberVoid({
              ...form,
              series: parseInt(form.series, 10),
              numberFrom: parseInt(form.numberFrom, 10),
              numberTo: parseInt(form.numberTo, 10),
            });
            await load();
            setShowForm(false);
            setForm(emptyVoidForm());
            setAlert({ open: true, message: 'Inutilização registrada.' });
          } catch (err) {
            setAlert({ open: true, message: errMsg(err) });
          } finally {
            setIsSaving(false);
          }
        }}
        footer={registryModalFooterButtons({
          onClose: closeVoidModal,
          isSaving,
          submitLabel: 'Registrar inutilização',
        })}
      >
        <div className="catalog-form-grid">
          <PremiumSelect
            label="Tipo"
            value={form.invoiceType}
            options={[
              { value: 'nfe', label: 'NF-e' },
              { value: 'nfce', label: 'NFC-e' },
            ]}
            onChange={(v) => setForm({ ...form, invoiceType: v as FiscalInvoiceType })}
          />
          <FiscalField label="Série">
            <input
              type="number"
              className="premium-text-input"
              value={form.series}
              onChange={(e) => setForm({ ...form, series: e.target.value })}
            />
          </FiscalField>
          <FiscalField label="De nº">
            <input
              type="number"
              className="premium-text-input"
              value={form.numberFrom}
              onChange={(e) => setForm({ ...form, numberFrom: e.target.value })}
              required
            />
          </FiscalField>
          <FiscalField label="Até nº">
            <input
              type="number"
              className="premium-text-input"
              value={form.numberTo}
              onChange={(e) => setForm({ ...form, numberTo: e.target.value })}
              required
            />
          </FiscalField>
          <FiscalField label="Justificativa" className="form-group--full">
            <textarea
              className="premium-text-input"
              rows={3}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              required
              minLength={15}
            />
          </FiscalField>
        </div>
      </RegistryFormModal>
      <FiscalTable
        title="Faixas inutilizadas"
        headers={['Tipo', 'Série', 'Faixa', 'Data']}
        rows={rows.map((r) => [r.invoiceType, r.series, `${r.numberFrom}-${r.numberTo}`, r.voidDate?.slice(0, 10)])}
        pagination={
          meta && meta.total > 0
            ? {
                page: meta.page,
                totalPages: meta.totalPages,
                total: meta.total,
                limit,
                onPageChange: setPage,
                onLimitChange: (next) => {
                  setLimit(next);
                  setPage(1);
                },
              }
            : undefined
        }
      />
      <AlertModal isOpen={alert.open} message={alert.message} onClose={() => setAlert({ open: false, message: '' })} />
    </FiscalPageLayout>
  );
};

// —— Contador ——
const emptyAccountantForm = () => ({
  name: '',
  email: '',
  crc: '',
  canExport: true,
  canEmit: false,
});

export const FiscalAccountantsPage: React.FC = () => {
  const can = useFiscalAccess();
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [form, setForm] = useState(emptyAccountantForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '' });

  const load = useCallback(async () => {
    const result = await fetchAccountants({ page, limit });
    setRows(result.items);
    setMeta(result.meta);
  }, [page, limit]);

  useEffect(() => {
    if (can) load();
  }, [can, load]);

  const closeAccountantModal = () => {
    if (isSaving) return;
    setShowForm(false);
    setEditingId(null);
    setForm(emptyAccountantForm());
  };

  const openEditAccountant = (row: any) => {
    setEditingId(row.id);
    setForm({
      name: row.name ?? '',
      email: row.email ?? '',
      crc: row.crc ?? '',
      canExport: row.canExport ?? true,
      canEmit: row.canEmit ?? false,
    });
    setShowForm(true);
  };

  if (!can) return <AccessDenied />;

  return (
    <FiscalPageLayout
      title="Usuário contador"
      description="Acesso do escritório contábil para exportação e consulta."
      actions={
        <button
          type="button"
          className="catalog-action-button"
          onClick={() => {
            setEditingId(null);
            setForm(emptyAccountantForm());
            setShowForm(true);
          }}
        >
          Novo contador
        </button>
      }
    >
      <RegistryFormModal
        isOpen={showForm}
        title={editingId ? 'Editar contador' : 'Novo contador'}
        subtitle="Cadastre o acesso do escritório contábil para exportação e consulta."
        isSaving={isSaving}
        onClose={closeAccountantModal}
        onSubmit={async (e) => {
          e.preventDefault();
          setIsSaving(true);
          const wasEditing = Boolean(editingId);
          try {
            if (editingId) {
              await updateAccountant(editingId, form);
            } else {
              await createAccountant(form);
            }
            await load();
            setShowForm(false);
            setEditingId(null);
            setForm(emptyAccountantForm());
            setAlert({ open: true, message: wasEditing ? 'Contador atualizado.' : 'Contador cadastrado.' });
          } catch (err) {
            setAlert({ open: true, message: errMsg(err) });
          } finally {
            setIsSaving(false);
          }
        }}
        footer={registryModalFooterButtons({
          onClose: closeAccountantModal,
          isSaving,
          submitLabel: editingId ? 'Salvar contador' : 'Adicionar contador',
        })}
      >
        <div className="catalog-form-grid">
          <FiscalField label="Nome">
            <input
              className="premium-text-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </FiscalField>
          <FiscalField label="E-mail">
            <input
              type="email"
              className="premium-text-input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </FiscalField>
          <FiscalField label="CRC">
            <input
              className="premium-text-input"
              value={form.crc}
              onChange={(e) => setForm({ ...form, crc: e.target.value })}
            />
          </FiscalField>
        </div>
      </RegistryFormModal>
      <FiscalTable
        title="Contadores cadastrados"
        headers={['Nome', 'E-mail', 'Exportar', 'Ativo', 'Ações']}
        rows={rows.map((r) => [
          r.name,
          r.email,
          r.canExport ? 'Sim' : 'Não',
          r.active ? 'Sim' : 'Não',
          <div key={r.id} className="finance-table-actions">
            <CatalogRegistryIconActions
              editLabel={`Editar contador ${r.name}`}
              deleteLabel={`Excluir contador ${r.name}`}
              onEdit={() => openEditAccountant(r)}
              onDelete={() => setConfirmDelete({ id: r.id, label: r.name })}
            />
          </div>,
        ])}
        pagination={
          meta && meta.total > 0
            ? {
                page: meta.page,
                totalPages: meta.totalPages,
                total: meta.total,
                limit,
                onPageChange: setPage,
                onLimitChange: (next) => {
                  setLimit(next);
                  setPage(1);
                },
              }
            : undefined
        }
      />
      <AlertModal isOpen={alert.open} message={alert.message} onClose={() => setAlert({ open: false, message: '' })} />
      <ConfirmModal
        isOpen={Boolean(confirmDelete)}
        title="Excluir contador"
        subtitle="Esta ação não pode ser desfeita."
        message={confirmDelete ? `O contador "${confirmDelete.label}" será removido permanentemente.` : ''}
        confirmLabel="Excluir"
        isLoading={isDeleting}
        loadingLabel="Excluindo…"
        onClose={() => !isDeleting && setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          setIsDeleting(true);
          try {
            await deleteAccountant(confirmDelete.id);
            setConfirmDelete(null);
            await load();
            setAlert({ open: true, message: 'Contador excluído.' });
          } catch (err) {
            setAlert({ open: true, message: errMsg(err) });
          } finally {
            setIsDeleting(false);
          }
        }}
      />
    </FiscalPageLayout>
  );
};
