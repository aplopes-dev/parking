import React, { useCallback, useEffect, useState } from 'react';
import AlertModal from '../../components/AlertModal';
import ModalPortal from '../../components/ModalPortal';
import PremiumSelect from '../../components/PremiumSelect';
import '../../components/AppModal.css';
import {
  cancelFiscalInvoice,
  createAccountant,
  createFiscalOrder,
  createFiscalOrderFromPdv,
  createFiscalReturn,
  deleteFiscalReturn,
  createNumberVoid,
  emitFiscalInvoice,
  fetchAccountants,
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
import type { PaginatedMeta, SortDirection } from '../../types/pagination';
import CatalogPagination from '../../components/catalog/CatalogPagination';
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

function SettingsForm({ onSaved }: { onSaved?: () => void }) {
  const [form, setForm] = useState({
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
  const [alert, setAlert] = useState<{
    open: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ open: false, message: '', type: 'success' });

  useEffect(() => {
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
  }, []);

  return (
    <FiscalSection title="Configuração do emitente" kicker="Emitente">
      <form
        className="catalog-form"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await updateFiscalSettings({
              ...form,
              nfeSeries: parseInt(form.nfeSeries, 10),
              nfceSeries: parseInt(form.nfceSeries, 10),
            });
            onSaved?.();
            setAlert({ open: true, message: 'Configurações salvas.', type: 'success' });
          } catch (err) {
            setAlert({ open: true, message: errMsg(err), type: 'error' });
          }
        }}
      >
        <div className="catalog-form-grid">
          <FiscalField label="Razão social">
            <input
              className="premium-text-input"
              value={form.legalName}
              onChange={(e) => setForm({ ...form, legalName: e.target.value })}
              required
            />
          </FiscalField>
          <FiscalField label="Nome fantasia">
            <input
              className="premium-text-input"
              value={form.tradeName}
              onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
            />
          </FiscalField>
          <FiscalField label="CNPJ">
            <input
              className="premium-text-input"
              value={form.cnpj}
              onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
            />
          </FiscalField>
          <FiscalField label="Inscrição estadual">
            <input
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
          <FiscalField label="Série NF-e">
            <input
              type="number"
              className="premium-text-input"
              value={form.nfeSeries}
              onChange={(e) => setForm({ ...form, nfeSeries: e.target.value })}
            />
          </FiscalField>
          <FiscalField label="Série NFC-e">
            <input
              type="number"
              className="premium-text-input"
              value={form.nfceSeries}
              onChange={(e) => setForm({ ...form, nfceSeries: e.target.value })}
            />
          </FiscalField>
        </div>
        <FiscalFormActions>
          <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary">
            Salvar configurações
          </button>
        </FiscalFormActions>
      </form>
      <AlertModal
        isOpen={alert.open}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ open: false, message: '', type: 'success' })}
      />
    </FiscalSection>
  );
}

// —— Pedidos venda/compra ——
export const FiscalOrdersPage: React.FC = () => {
  const can = useFiscalAccess();
  const [orderType, setOrderType] = useState<FiscalOrderType>('sale');
  const [form, setForm] = useState({
    counterpartyName: '',
    counterpartyDocument: '',
    issueDate: todayIso(),
    notes: '',
    productName: '',
    quantity: '1',
    unitPrice: '',
  });
  const [pdvOrderId, setPdvOrderId] = useState('');
  const [alert, setAlert] = useState({ open: false, message: '' });

  if (!can) return <AccessDenied />;

  return (
    <FiscalPageLayout
      title="Pedidos de venda e compra"
      description="Registre pedidos fiscais manuais ou importe do PDV."
    >
      <SettingsForm />
      <FiscalSection title="Importar do PDV" kicker="Integração">
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
      <FiscalSection title="Pedido manual" kicker="Cadastro">
        <form
          className="catalog-form"
          onSubmit={async (e) => {
            e.preventDefault();
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
              setAlert({ open: true, message: 'Pedido fiscal salvo.' });
            } catch (err) {
              setAlert({ open: true, message: errMsg(err) });
            }
          }}
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
          <FiscalFormActions>
            <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary">
              Criar pedido
            </button>
          </FiscalFormActions>
        </form>
      </FiscalSection>
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

  const load = useCallback(async () => {
    setRows(
      await fetchFiscalOrders({
        orderType: filterType || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
    );
  }, [filterType, from, to]);

  useEffect(() => {
    if (can) load();
  }, [can, load]);

  if (!can) return <AccessDenied />;

  return (
    <FiscalPageLayout title="Listagem de pedidos" description="Todos os pedidos fiscais do estabelecimento.">
      <section className="finance-toolbar" aria-label="Filtros">
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
        <div className="finance-toolbar__actions">
          <button type="button" className="catalog-form-footer-btn catalog-form-footer-btn--primary" onClick={load}>
            Filtrar
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
  const [limit, setLimit] = useState(20);
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
      <ModalPortal isOpen={showForm}>
        <div
          className="app-modal-overlay"
          role="presentation"
          onClick={isSaving ? undefined : closeFormModal}
        >
          <div
            className="app-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fiscal-return-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="app-modal-header">
              <div>
                <h3 id="fiscal-return-modal-title">
                  {editingId ? 'Editar devolução' : 'Nova devolução'}
                </h3>
                <p className="app-modal-subtitle">
                  Registre devoluções de venda ou de compra vinculadas a pedidos fiscais.
                </p>
              </div>
              <button
                type="button"
                className="app-modal-close"
                onClick={closeFormModal}
                disabled={isSaving}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <form className="app-modal-body catalog-form" onSubmit={handleSubmitReturn}>
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
              <div className="app-modal-footer">
                <button
                  type="button"
                  className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                  onClick={closeFormModal}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="catalog-form-footer-btn catalog-form-footer-btn--primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Registrar devolução'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
      <section className="catalog-surface">
        <div className="catalog-toolbar fiscal-returns-toolbar">
          <div className="form-group catalog-search fiscal-returns-toolbar__search">
            <label htmlFor="fiscal-returns-search">Buscar</label>
            <input
              id="fiscal-returns-search"
              className="premium-text-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Motivo ou tipo…"
            />
          </div>
          <div className="form-group fiscal-returns-toolbar__field">
            <label htmlFor="fiscal-returns-type">Tipo</label>
            <PremiumSelect
              label="Tipo"
              value={returnTypeFilter}
              options={[
                { value: '', label: 'Todos' },
                { value: 'sale_return', label: 'Devolução de venda' },
                { value: 'purchase_return', label: 'Devolução de compra' },
              ]}
              onChange={(v) => {
                setReturnTypeFilter(v as '' | 'sale_return' | 'purchase_return');
                setPage(1);
              }}
            />
          </div>
          <div className="form-group fiscal-returns-toolbar__field">
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
          <div className="form-group fiscal-returns-toolbar__field">
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
            className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
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
                  <div className="catalog-card-actions fiscal-returns-actions">
                    <button
                      type="button"
                      className="catalog-card-button"
                      onClick={() => {
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
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="catalog-card-button"
                      onClick={async () => {
                        try {
                          await deleteFiscalReturn(r.id);
                          setAlert({ open: true, message: 'Devolução excluída.', type: 'success' });
                          await loadReturns();
                        } catch (err) {
                          setAlert({ open: true, message: errMsg(err), type: 'error' });
                        }
                      }}
                    >
                      Excluir
                    </button>
                  </div>
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
    </FiscalPageLayout>
  );
};

// —— Notas ——
export const FiscalInvoicesPage: React.FC = () => {
  const can = useFiscalAccess();
  const [rows, setRows] = useState<any[]>([]);
  const [direction, setDirection] = useState<'' | 'emitted' | 'received'>('');

  const load = useCallback(async () => {
    setRows(await fetchFiscalInvoices({ direction: direction || undefined }));
  }, [direction]);

  useEffect(() => {
    if (can) load();
  }, [can, load]);

  if (!can) return <AccessDenied />;

  return (
    <FiscalPageLayout title="Notas emitidas e recebidas" description="NF-e e NFC-e autorizadas, recebidas ou canceladas.">
      <section className="finance-toolbar" aria-label="Filtros">
        <PremiumSelect
          label="Direção"
          value={direction}
          options={[
            { value: '', label: 'Todas' },
            { value: 'emitted', label: 'Emitidas' },
            { value: 'received', label: 'Recebidas' },
          ]}
          onChange={(v) => setDirection(v as typeof direction)}
        />
        <div className="finance-toolbar__actions">
          <button type="button" className="catalog-form-footer-btn catalog-form-footer-btn--primary" onClick={load}>
            Atualizar
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
      <FiscalSection title="Importar XML" kicker="Entrada">
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
  const [alert, setAlert] = useState({ open: false, message: '' });

  useEffect(() => {
    if (can) fetchFiscalOrders({ status: 'draft' }).then(setOrders).catch(() => setOrders([]));
  }, [can]);

  if (!can) return <AccessDenied />;

  return (
    <FiscalPageLayout
      title="Emissão NF-e / NFC-e"
      description="Emita nota a partir de pedido fiscal ou pedido PDV (homologação simula autorização)."
    >
      <SettingsForm />
      <FiscalSection title="Emitir documento" kicker="Operação">
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
      fetchFiscalInvoices({ direction: 'emitted', status: 'authorized' }).then(setInvoices);
    }
  }, [can]);

  if (!can) return <AccessDenied />;

  return (
    <FiscalPageLayout
      title="Cancelar NF-e / NFC-e"
      description="Cancelamento de notas autorizadas (homologação/produção conforme configuração)."
    >
      <FiscalSection title="Cancelar nota" kicker="Operação">
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
                  setInvoices(await fetchFiscalInvoices({ direction: 'emitted', status: 'authorized' }));
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
export const FiscalVoidPage: React.FC = () => {
  const can = useFiscalAccess();
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({
    invoiceType: 'nfce' as FiscalInvoiceType,
    series: '1',
    numberFrom: '',
    numberTo: '',
    reason: '',
    voidDate: todayIso(),
  });
  const [alert, setAlert] = useState({ open: false, message: '' });

  useEffect(() => {
    if (can) fetchNumberVoids().then(setRows);
  }, [can]);

  if (!can) return <AccessDenied />;

  return (
    <FiscalPageLayout title="Inutilização de notas" description="Registre faixa de numeração inutilizada na SEFAZ.">
      <FiscalSection title="Nova inutilização" kicker="Cadastro">
        <form
          className="catalog-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await createNumberVoid({
                ...form,
                series: parseInt(form.series, 10),
                numberFrom: parseInt(form.numberFrom, 10),
                numberTo: parseInt(form.numberTo, 10),
              });
              setRows(await fetchNumberVoids());
              setAlert({ open: true, message: 'Inutilização registrada.' });
            } catch (err) {
              setAlert({ open: true, message: errMsg(err) });
            }
          }}
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
          <FiscalFormActions>
            <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary">
              Registrar inutilização
            </button>
          </FiscalFormActions>
        </form>
      </FiscalSection>
      <FiscalTable
        title="Faixas inutilizadas"
        headers={['Tipo', 'Série', 'Faixa', 'Data']}
        rows={rows.map((r) => [r.invoiceType, r.series, `${r.numberFrom}-${r.numberTo}`, r.voidDate?.slice(0, 10)])}
      />
      <AlertModal isOpen={alert.open} message={alert.message} onClose={() => setAlert({ open: false, message: '' })} />
    </FiscalPageLayout>
  );
};

// —— Contador ——
export const FiscalAccountantsPage: React.FC = () => {
  const can = useFiscalAccess();
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', email: '', crc: '', canExport: true, canEmit: false });
  const [alert, setAlert] = useState({ open: false, message: '' });

  const load = useCallback(() => fetchAccountants().then(setRows), []);

  useEffect(() => {
    if (can) load();
  }, [can, load]);

  if (!can) return <AccessDenied />;

  return (
    <FiscalPageLayout title="Usuário contador" description="Acesso do escritório contábil para exportação e consulta.">
      <FiscalSection title="Novo contador" kicker="Cadastro">
        <form
          className="catalog-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await createAccountant(form);
              await load();
              setForm({ name: '', email: '', crc: '', canExport: true, canEmit: false });
              setAlert({ open: true, message: 'Contador cadastrado.' });
            } catch (err) {
              setAlert({ open: true, message: errMsg(err) });
            }
          }}
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
          <FiscalFormActions>
            <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary">
              Adicionar contador
            </button>
          </FiscalFormActions>
        </form>
      </FiscalSection>
      <FiscalTable
        title="Contadores cadastrados"
        headers={['Nome', 'E-mail', 'Exportar', 'Ativo', '']}
        rows={rows.map((r) => [
          r.name,
          r.email,
          r.canExport ? 'Sim' : 'Não',
          r.active ? 'Sim' : 'Não',
          <button
            key={r.id}
            type="button"
            className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
            onClick={async () => {
              await updateAccountant(r.id, { active: !r.active });
              await load();
            }}
          >
            {r.active ? 'Desativar' : 'Ativar'}
          </button>,
        ])}
      />
      <AlertModal isOpen={alert.open} message={alert.message} onClose={() => setAlert({ open: false, message: '' })} />
    </FiscalPageLayout>
  );
};
