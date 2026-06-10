import React, { useCallback, useEffect, useMemo, useState } from 'react';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertModal from '../../components/AlertModal';
import ConfirmModal from '../../components/ConfirmModal';
import PremiumSelect from '../../components/PremiumSelect';
import RegistryFormModal, { registryModalFooterButtons } from '../../components/RegistryFormModal';
import {
  createAdvance,
  createBill,
  createBankLine,
  createCardReceivable,
  createPrepaidWallet,
  createReceipt,
  createRecurring,
  createTransfer,
  depositCard,
  fetchAdvances,
  fetchBankLines,
  fetchBills,
  fetchCalendar,
  fetchCardReceivables,
  fetchCashFlow,
  fetchCashSessions,
  fetchDailyReconciliation,
  fetchDre,
  fetchFinanceDashboard,
  fetchPayrollRuns,
  fetchPayrollUsers,
  fetchPrepaidWallets,
  fetchReceipts,
  fetchRecurring,
  fetchStatement,
  fetchTransfers,
  matchBankLine,
  openCashSession,
  closeCashSession,
  createPayrollRun,
  deletePayrollRun,
  prepaidMovement,
  runRecurringDue,
  settleByCounterparty,
  upsertDailyReconciliation,
} from '../../services/financeApi';
import type { FinanceBill, FinanceBillType } from '../../types/finance';
import {
  FinanceField,
  FinanceFormActions,
  FinancePeriodBar,
  FinanceSection,
  FinanceSummaryBar,
  firstDayOfMonth,
  formatDateBr,
  formatMoney,
  todayIso,
  useFinanceAccess,
  useFinanceMasterData,
} from './financeShared';
import CatalogPagination from '../../components/catalog/CatalogPagination';
import CatalogRegistryIconActions from '../../components/catalog/CatalogRegistryIconActions';
import CatalogSortableTh from '../../components/catalog/CatalogSortableTh';
import {
  DEFAULT_PAGE_SIZE,
  type PaginatedMeta,
  type SortDirection,
  type TablePaginationProps,
} from '../../types/pagination';
import type { FinanceListResult } from '../../services/financeApi';
import './Finance.css';

type FinanceAlert = { open: boolean; message: string; type: 'success' | 'error' };
const closedAlert: FinanceAlert = { open: false, message: '', type: 'success' };

function errMsg(e: unknown): string {
  const ax = e as { response?: { data?: { message?: string } } };
  return ax.response?.data?.message || 'Erro ao processar solicitação.';
}

function successAlert(message: string): FinanceAlert {
  return { open: true, message, type: 'success' };
}

function errorAlert(err: unknown): FinanceAlert {
  return { open: true, message: errMsg(err), type: 'error' };
}

function AccessDenied() {
  return <div className="container">Acesso negado.</div>;
}

function FinanceTable({
  headers,
  rows,
  title = 'Registros',
  pagination,
  emptyMessage = 'Nenhum registro.',
}: {
  headers: string[];
  rows: React.ReactNode[][];
  title?: string;
  pagination?: TablePaginationProps;
  emptyMessage?: string;
}) {
  const showEmpty = !rows.length && (!pagination || pagination.total === 0);
  return (
    <section className="catalog-surface finance-list-panel">
      <h2 className="finance-list-panel__title">{title}</h2>
      {showEmpty ? (
        <p className="catalog-empty">{emptyMessage}</p>
      ) : (
        <>
          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  {headers.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((cells, i) => (
                  <tr key={i}>
                    {cells.map((c, j) => (
                      <td key={j}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && pagination.total > 0 ? (
            <CatalogPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              disabled={pagination.disabled}
              onPageChange={pagination.onPageChange}
              onLimitChange={pagination.onLimitChange}
            />
          ) : null}
        </>
      )}
    </section>
  );
}

function useFinanceTableData<T>(
  loadFn: (page: number, limit: number) => Promise<FinanceListResult<T>>,
  resetDeps: unknown[] = [],
) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loadFn(page, limit);
      setItems(result.items);
      setMeta(result.meta);
    } finally {
      setLoading(false);
    }
  }, [loadFn, page, limit]);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  useEffect(() => {
    void reload();
  }, [reload]);

  const pagination: TablePaginationProps | undefined =
    meta && meta.total > 0
      ? {
          page: meta.page,
          totalPages: meta.totalPages,
          total: meta.total,
          limit,
          disabled: loading,
          onPageChange: setPage,
          onLimitChange: (next) => {
            setLimit(next);
            setPage(1);
          },
        }
      : undefined;

  return { items, loading, reload, pagination, meta };
}

// —— Contas a pagar e receber ——
const emptyBillForm = () => ({
  description: '',
  counterpartyName: '',
  amount: '',
  dueDate: todayIso(),
  accountId: '',
  categoryId: '',
});

export const FinanceBillsPage: React.FC = () => {
  const can = useFinanceAccess();
  const { accounts, categories, reload: reloadMaster } = useFinanceMasterData();
  const [billType, setBillType] = useState<FinanceBillType>('payable');
  const loadBills = useCallback(
    (page: number, limit: number) => fetchBills({ billType, page, limit }),
    [billType],
  );
  const { items, loading, reload, pagination } = useFinanceTableData<FinanceBill>(loadBills, [billType, can]);
  const [alert, setAlert] = useState<FinanceAlert>(closedAlert);
  const [form, setForm] = useState(emptyBillForm);
  const [showNewBillModal, setShowNewBillModal] = useState(false);
  const [isSavingBill, setIsSavingBill] = useState(false);

  const closeNewBillModal = () => {
    if (isSavingBill) return;
    setShowNewBillModal(false);
    setForm(emptyBillForm());
  };

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout
      className="finance-page"
      moduleLabel="Gestão financeira"
      modulePath="/financeiro/lancamentos"
      title="Contas a pagar e receber"
      description="Fornecedores, clientes e títulos em aberto."
      actions={
        <button type="button" className="catalog-action-button" onClick={() => setShowNewBillModal(true)}>
          Novo título
        </button>
      }
    >
      <section className="catalog-surface">
        <div className="catalog-toolbar catalog-filter-toolbar finance-toolbar">
          <PremiumSelect
            label="Tipo"
            value={billType}
            wrapperClassName="form-group catalog-filter-toolbar__field"
            options={[
              { value: 'payable', label: 'A pagar' },
              { value: 'receivable', label: 'A receber' },
            ]}
            onChange={(v) => setBillType(v as FinanceBillType)}
          />
        </div>
      </section>

      <RegistryFormModal
        isOpen={showNewBillModal}
        wide
        title="Novo título"
        subtitle={
          billType === 'payable'
            ? 'Cadastre uma conta a pagar para fornecedor.'
            : 'Cadastre uma conta a receber de cliente.'
        }
        isSaving={isSavingBill}
        onClose={closeNewBillModal}
        onSubmit={async (e) => {
          e.preventDefault();
          setIsSavingBill(true);
          try {
            await createBill({
              billType,
              description: form.description.trim(),
              counterpartyName: form.counterpartyName.trim(),
              amount: parseFloat(form.amount),
              dueDate: form.dueDate,
              accountId: form.accountId || undefined,
              categoryId: form.categoryId || undefined,
            });
            setShowNewBillModal(false);
            setForm(emptyBillForm());
            await reload();
            await reloadMaster();
            setAlert(successAlert('Título cadastrado.'));
          } catch (err) {
            setAlert(errorAlert(err));
          } finally {
            setIsSavingBill(false);
          }
        }}
        footer={registryModalFooterButtons({
          onClose: closeNewBillModal,
          isSaving: isSavingBill,
          submitLabel: 'Salvar título',
        })}
      >
        <div className="catalog-form-grid">
          <FinanceField label="Descrição" htmlFor="bill-description">
            <input
              id="bill-description"
              className="premium-text-input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </FinanceField>
          <FinanceField label="Fornecedor / Cliente" htmlFor="bill-counterparty">
            <input
              id="bill-counterparty"
              className="premium-text-input"
              value={form.counterpartyName}
              onChange={(e) => setForm({ ...form, counterpartyName: e.target.value })}
              required
            />
          </FinanceField>
          <FinanceField label="Valor (R$)" htmlFor="bill-amount">
            <input
              id="bill-amount"
              type="number"
              step="0.01"
              className="premium-text-input"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </FinanceField>
          <FinanceField label="Vencimento" htmlFor="bill-due-date">
            <input
              id="bill-due-date"
              type="date"
              className="premium-text-input"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              required
            />
          </FinanceField>
          <PremiumSelect
            label="Conta"
            value={form.accountId}
            options={[{ value: '', label: '—' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
            onChange={(v) => setForm({ ...form, accountId: v })}
          />
          <PremiumSelect
            label="Categoria"
            value={form.categoryId}
            options={[{ value: '', label: '—' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
            onChange={(v) => setForm({ ...form, categoryId: v })}
          />
        </div>
      </RegistryFormModal>

      {loading ? (
        <section className="catalog-surface finance-list-panel">
          <LoadingSpinner />
        </section>
      ) : (
        <FinanceTable
          title="Títulos cadastrados"
          headers={['Descrição', 'Contraparte', 'Valor', 'Pago', 'Venc.', 'Status']}
          rows={items.map((b) => [
            b.description,
            b.counterpartyName,
            formatMoney(b.amount),
            formatMoney(b.paidAmount),
            b.dueDate?.slice(0, 10),
            b.status,
          ])}
          pagination={pagination}
        />
      )}
      <AlertModal isOpen={alert.open} message={alert.message} type={alert.type} onClose={() => setAlert(closedAlert)} />
    </CatalogPageLayout>
  );
};

// —— Baixa por pessoa e período ——
export const FinanceSettlePage: React.FC = () => {
  const can = useFinanceAccess();
  const { accounts } = useFinanceMasterData();
  const [form, setForm] = useState({ counterpartyName: '', from: firstDayOfMonth(), to: todayIso(), paymentDate: todayIso(), accountId: '' });
  const [alert, setAlert] = useState<FinanceAlert>(closedAlert);

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout className="finance-page" moduleLabel="Gestão financeira" modulePath="/financeiro/lancamentos" title="Baixa por pessoa e período" description="Liquida todos os títulos em aberto de um fornecedor/cliente no intervalo.">
      <FinanceSection title="Baixa em lote">
        <form className="catalog-form" onSubmit={async (e) => {
          e.preventDefault();
          try {
            const r = await settleByCounterparty(form);
            setAlert(successAlert(`Baixa aplicada (${JSON.stringify(r)})`));
          } catch (err) {
            setAlert(errorAlert(err));
          }
        }}>
          <div className="catalog-form-grid">
            <label>Nome contraparte<input className="premium-text-input" value={form.counterpartyName} onChange={(e) => setForm({ ...form, counterpartyName: e.target.value })} required /></label>
            <label>De<input type="date" className="premium-text-input" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></label>
            <label>Até<input type="date" className="premium-text-input" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></label>
            <label>Pagamento<input type="date" className="premium-text-input" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} /></label>
            <PremiumSelect label="Conta" value={form.accountId} options={[{ value: '', label: 'Selecione' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} onChange={(v) => setForm({ ...form, accountId: v })} required />
          </div>
          <FinanceFormActions>
            <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary">
              Baixar títulos
            </button>
          </FinanceFormActions>
        </form>
      </FinanceSection>
      <AlertModal isOpen={alert.open} message={alert.message} type={alert.type} onClose={() => setAlert(closedAlert)} />
    </CatalogPageLayout>
  );
};

// —— Transferências ——
const emptyTransferForm = () => ({
  fromAccountId: '',
  toAccountId: '',
  amount: '',
  transferDate: todayIso(),
  description: '',
});

export const FinanceTransfersPage: React.FC = () => {
  const can = useFinanceAccess();
  const { accounts } = useFinanceMasterData();
  const loadTransfers = useCallback((page: number, limit: number) => fetchTransfers({ page, limit }), []);
  const { items: rows, reload: load, pagination } = useFinanceTableData(loadTransfers, [can]);
  const [form, setForm] = useState(emptyTransferForm);
  const [showNewTransferModal, setShowNewTransferModal] = useState(false);
  const [isSavingTransfer, setIsSavingTransfer] = useState(false);
  const [alert, setAlert] = useState<FinanceAlert>(closedAlert);

  const closeNewTransferModal = () => {
    if (isSavingTransfer) return;
    setShowNewTransferModal(false);
    setForm(emptyTransferForm());
  };

  if (!can) return <AccessDenied />;

  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }));

  return (
    <CatalogPageLayout
      className="finance-page"
      moduleLabel="Gestão financeira"
      modulePath="/financeiro/lancamentos"
      title="Transferência entre contas"
      description="Movimentação entre caixa, banco e contas digitais."
      actions={
        <button type="button" className="catalog-action-button" onClick={() => setShowNewTransferModal(true)}>
          Nova transferência
        </button>
      }
    >
      <RegistryFormModal
        isOpen={showNewTransferModal}
        wide
        title="Nova transferência"
        subtitle="Movimente valor entre contas financeiras do estabelecimento."
        isSaving={isSavingTransfer}
        onClose={closeNewTransferModal}
        onSubmit={async (e) => {
          e.preventDefault();
          setIsSavingTransfer(true);
          try {
            await createTransfer({ ...form, amount: parseFloat(form.amount) });
            setShowNewTransferModal(false);
            setForm(emptyTransferForm());
            await load();
            setAlert(successAlert('Transferência registrada.'));
          } catch (err) {
            setAlert(errorAlert(err));
          } finally {
            setIsSavingTransfer(false);
          }
        }}
        footer={registryModalFooterButtons({
          onClose: closeNewTransferModal,
          isSaving: isSavingTransfer,
          submitLabel: 'Transferir',
        })}
      >
        <div className="catalog-form-grid">
          <PremiumSelect
            label="Origem"
            value={form.fromAccountId}
            options={accountOptions}
            onChange={(v) => setForm({ ...form, fromAccountId: v })}
            required
          />
          <PremiumSelect
            label="Destino"
            value={form.toAccountId}
            options={accountOptions}
            onChange={(v) => setForm({ ...form, toAccountId: v })}
            required
          />
          <FinanceField label="Valor (R$)" htmlFor="transfer-amount">
            <input
              id="transfer-amount"
              type="number"
              step="0.01"
              className="premium-text-input"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </FinanceField>
          <FinanceField label="Data" htmlFor="transfer-date">
            <input
              id="transfer-date"
              type="date"
              className="premium-text-input"
              value={form.transferDate}
              onChange={(e) => setForm({ ...form, transferDate: e.target.value })}
            />
          </FinanceField>
          <FinanceField label="Descrição" htmlFor="transfer-description">
            <input
              id="transfer-description"
              className="premium-text-input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </FinanceField>
        </div>
      </RegistryFormModal>
      <FinanceTable
        headers={['Data', 'Valor', 'Descrição']}
        rows={rows.map((r) => [r.transferDate?.slice(0, 10), formatMoney(r.amount), r.description || '—'])}
        pagination={pagination}
      />
      <AlertModal isOpen={alert.open} message={alert.message} type={alert.type} onClose={() => setAlert(closedAlert)} />
    </CatalogPageLayout>
  );
};

// —— Calendário ——
type CalendarTransactionRow = {
  type: string;
  amount: number | string;
  description?: string;
  notes?: string | null;
};

type CalendarBillRow = {
  description?: string;
  counterpartyName?: string;
  amount?: number | string;
  billType?: string;
  status?: string;
};

type CalendarDayData = {
  transactions?: CalendarTransactionRow[];
  bills?: CalendarBillRow[];
};

type CalendarApiResponse = {
  month?: string;
  days?: Record<string, CalendarDayData>;
};

function calendarItemMatchesSearch(
  term: string,
  fields: Array<string | null | undefined>,
): boolean {
  if (!term) return true;
  const q = term.toLowerCase();
  return fields.some((field) => field?.toLowerCase().includes(q));
}

function buildCalendarTableRows(
  days: Record<string, CalendarDayData>,
  search: string,
): string[][] {
  const out: string[][] = [];
  const term = search.trim();

  Object.keys(days)
    .sort()
    .forEach((date) => {
      const day = days[date];
      let income = 0;
      let expense = 0;
      let hasMatch = !term;

      for (const tx of day.transactions ?? []) {
        const matches = calendarItemMatchesSearch(term, [tx.description, tx.notes]);
        if (!matches) continue;
        hasMatch = true;
        const v = Number(tx.amount);
        if (tx.type === 'income') income += v;
        else expense += v;
      }

      for (const bill of day.bills ?? []) {
        const billLabel = bill.billType === 'receivable' ? 'A receber' : 'A pagar';
        const matches = calendarItemMatchesSearch(term, [
          bill.description,
          bill.counterpartyName,
          billLabel,
          bill.status,
        ]);
        if (!matches) continue;
        hasMatch = true;
        const v = Number(bill.amount ?? 0);
        if (bill.billType === 'receivable') income += v;
        else expense += v;
      }

      if (hasMatch) {
        out.push([formatDateBr(date), formatMoney(income), formatMoney(expense)]);
      }
    });

  return out;
}

export const FinanceCalendarPage: React.FC = () => {
  const can = useFinanceAccess();
  const [month, setMonth] = useState(todayIso().slice(0, 7));
  const [calendarDays, setCalendarDays] = useState<Record<string, CalendarDayData>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  const loadCalendar = useCallback(async () => {
    if (!can) return;
    setLoading(true);
    try {
      const data = (await fetchCalendar(month)) as CalendarApiResponse;
      setCalendarDays(data?.days ?? {});
    } catch {
      setCalendarDays({});
    } finally {
      setLoading(false);
    }
  }, [can, month]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  const rows = useMemo(
    () => buildCalendarTableRows(calendarDays, searchDebounced),
    [calendarDays, searchDebounced],
  );

  const applySearch = () => setSearchDebounced(search.trim());

  const clearSearch = () => {
    setSearch('');
    setSearchDebounced('');
  };

  if (!can) return <AccessDenied />;

  const emptyMessage = searchDebounced
    ? `Nenhum lançamento ou título encontrado para "${searchDebounced}" neste mês.`
    : 'Nenhum movimento registrado neste mês.';

  return (
    <CatalogPageLayout
      className="finance-page"
      moduleLabel="Gestão financeira"
      modulePath="/financeiro/lancamentos"
      title="Listagem por data"
      description="Visão mensal de receitas e despesas por dia."
    >
      <section className="catalog-surface">
        <div className="catalog-toolbar catalog-filter-toolbar finance-toolbar">
          <div className="form-group catalog-filter-toolbar__field catalog-filter-toolbar__field--compact">
            <label htmlFor="finance-month-filter">Mês</label>
            <input
              id="finance-month-filter"
              type="month"
              className="premium-text-input"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <div className="form-group catalog-search catalog-filter-toolbar__search catalog-filter-toolbar__search--wide">
            <label htmlFor="finance-calendar-search">Buscar</label>
            <input
              id="finance-calendar-search"
              className="premium-text-input"
              type="search"
              placeholder="Descrição, contraparte, observação ou status"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applySearch();
              }}
            />
          </div>
          <button
            type="button"
            className="catalog-form-footer-btn catalog-form-footer-btn--primary catalog-filter-toolbar__action"
            onClick={applySearch}
          >
            Buscar
          </button>
          <button
            type="button"
            className="catalog-form-footer-btn catalog-form-footer-btn--ghost catalog-filter-toolbar__action"
            onClick={clearSearch}
          >
            Limpar
          </button>
        </div>
      </section>

      {loading ? (
        <section className="catalog-surface finance-list-panel">
          <LoadingSpinner />
        </section>
      ) : (
        <FinanceTable
          title="Resumo por dia"
          headers={['Data', 'Receitas', 'Despesas']}
          rows={rows.length ? rows : []}
          emptyMessage={emptyMessage}
        />
      )}
    </CatalogPageLayout>
  );
};

// —— Recorrentes ——
const emptyRecurringForm = () => ({
  description: '',
  type: 'expense',
  amount: '',
  frequency: 'monthly',
  nextDueDate: todayIso(),
  accountId: '',
  categoryId: '',
});

export const FinanceRecurringPage: React.FC = () => {
  const can = useFinanceAccess();
  const { accounts, categories } = useFinanceMasterData();
  const loadRecurring = useCallback((page: number, limit: number) => fetchRecurring({ page, limit }), []);
  const { items: rows, reload: load, pagination } = useFinanceTableData(loadRecurring, [can]);
  const [form, setForm] = useState(emptyRecurringForm);
  const [showNewRecurringModal, setShowNewRecurringModal] = useState(false);
  const [isSavingRecurring, setIsSavingRecurring] = useState(false);
  const [runningDue, setRunningDue] = useState(false);
  const [alert, setAlert] = useState<FinanceAlert>(closedAlert);

  const closeNewRecurringModal = () => {
    if (isSavingRecurring) return;
    setShowNewRecurringModal(false);
    setForm(emptyRecurringForm());
  };

  const handleRunDue = async () => {
    setRunningDue(true);
    try {
      const r = await runRecurringDue();
      await load();
      setAlert(successAlert(`Processados: ${r?.generated ?? 0}`));
    } catch (err) {
      setAlert(errorAlert(err));
    } finally {
      setRunningDue(false);
    }
  };

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout
      className="finance-page"
      moduleLabel="Gestão financeira"
      modulePath="/financeiro/lancamentos"
      title="Receitas e despesas recorrentes"
      description="Aluguel, assinaturas e receitas fixas."
      actions={
        <>
          <button
            type="button"
            className="catalog-action-button is-secondary"
            disabled={runningDue}
            onClick={() => void handleRunDue()}
          >
            {runningDue ? 'Gerando…' : 'Gerar vencidos'}
          </button>
          <button type="button" className="catalog-action-button" onClick={() => setShowNewRecurringModal(true)}>
            Nova regra
          </button>
        </>
      }
    >
      <RegistryFormModal
        isOpen={showNewRecurringModal}
        wide
        title="Nova regra recorrente"
        subtitle="Cadastre receitas ou despesas com vencimento periódico."
        isSaving={isSavingRecurring}
        onClose={closeNewRecurringModal}
        onSubmit={async (e) => {
          e.preventDefault();
          setIsSavingRecurring(true);
          try {
            await createRecurring({ ...form, amount: parseFloat(form.amount) });
            setShowNewRecurringModal(false);
            setForm(emptyRecurringForm());
            await load();
            setAlert(successAlert('Regra criada.'));
          } catch (err) {
            setAlert(errorAlert(err));
          } finally {
            setIsSavingRecurring(false);
          }
        }}
        footer={registryModalFooterButtons({
          onClose: closeNewRecurringModal,
          isSaving: isSavingRecurring,
          submitLabel: 'Salvar regra',
        })}
      >
        <div className="catalog-form-grid">
          <FinanceField label="Descrição" htmlFor="recurring-description">
            <input
              id="recurring-description"
              className="premium-text-input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </FinanceField>
          <PremiumSelect
            label="Tipo"
            value={form.type}
            options={[
              { value: 'income', label: 'Receita' },
              { value: 'expense', label: 'Despesa' },
            ]}
            onChange={(v) => setForm({ ...form, type: v })}
          />
          <FinanceField label="Valor (R$)" htmlFor="recurring-amount">
            <input
              id="recurring-amount"
              type="number"
              step="0.01"
              className="premium-text-input"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </FinanceField>
          <PremiumSelect
            label="Frequência"
            value={form.frequency}
            options={[
              { value: 'weekly', label: 'Semanal' },
              { value: 'monthly', label: 'Mensal' },
              { value: 'yearly', label: 'Anual' },
            ]}
            onChange={(v) => setForm({ ...form, frequency: v })}
          />
          <FinanceField label="Próximo vencimento" htmlFor="recurring-next-due">
            <input
              id="recurring-next-due"
              type="date"
              className="premium-text-input"
              value={form.nextDueDate}
              onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
            />
          </FinanceField>
          <PremiumSelect
            label="Conta"
            value={form.accountId}
            options={[{ value: '', label: '—' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
            onChange={(v) => setForm({ ...form, accountId: v })}
          />
          <PremiumSelect
            label="Categoria"
            value={form.categoryId}
            options={[{ value: '', label: '—' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
            onChange={(v) => setForm({ ...form, categoryId: v })}
          />
        </div>
      </RegistryFormModal>
      <FinanceTable
        headers={['Descrição', 'Tipo', 'Valor', 'Próximo']}
        rows={rows.map((r) => [r.description, r.type, formatMoney(r.amount), r.nextDueDate?.slice(0, 10)])}
        pagination={pagination}
      />
      <AlertModal isOpen={alert.open} message={alert.message} type={alert.type} onClose={() => setAlert(closedAlert)} />
    </CatalogPageLayout>
  );
};

// —— Adiantamento ——
const emptyAdvanceForm = () => ({
  userId: '',
  amount: '',
  advanceDate: todayIso(),
  notes: '',
});

export const FinanceAdvancesPage: React.FC = () => {
  const can = useFinanceAccess();
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const loadAdvances = useCallback((page: number, limit: number) => fetchAdvances({ page, limit }), []);
  const { items: rows, reload, pagination } = useFinanceTableData(loadAdvances, [can]);
  const [form, setForm] = useState(emptyAdvanceForm);
  const [showNewAdvanceModal, setShowNewAdvanceModal] = useState(false);
  const [isSavingAdvance, setIsSavingAdvance] = useState(false);
  const [alert, setAlert] = useState<FinanceAlert>(closedAlert);

  const closeNewAdvanceModal = () => {
    if (isSavingAdvance) return;
    setShowNewAdvanceModal(false);
    setForm(emptyAdvanceForm());
  };

  useEffect(() => {
    if (!can) return;
    fetchPayrollUsers().then((u) => setUsers(u.map((x) => ({ id: x.id, name: x.name }))));
  }, [can]);

  if (!can) return <AccessDenied />;

  const userOptions = [{ value: '', label: 'Selecione' }, ...users.map((u) => ({ value: u.id, label: u.name }))];

  return (
    <CatalogPageLayout
      className="finance-page"
      moduleLabel="Gestão financeira"
      modulePath="/financeiro/lancamentos"
      title="Adiantamento"
      description="Adiantamentos a colaboradores."
      actions={
        <button type="button" className="catalog-action-button" onClick={() => setShowNewAdvanceModal(true)}>
          Novo adiantamento
        </button>
      }
    >
      <RegistryFormModal
        isOpen={showNewAdvanceModal}
        title="Novo adiantamento"
        subtitle="Registre um adiantamento para colaborador da folha."
        isSaving={isSavingAdvance}
        onClose={closeNewAdvanceModal}
        onSubmit={async (e) => {
          e.preventDefault();
          setIsSavingAdvance(true);
          try {
            await createAdvance({ ...form, amount: parseFloat(form.amount) });
            setShowNewAdvanceModal(false);
            setForm(emptyAdvanceForm());
            await reload();
            setAlert(successAlert('Adiantamento registrado.'));
          } catch (err) {
            setAlert(errorAlert(err));
          } finally {
            setIsSavingAdvance(false);
          }
        }}
        footer={registryModalFooterButtons({
          onClose: closeNewAdvanceModal,
          isSaving: isSavingAdvance,
          submitLabel: 'Registrar',
        })}
      >
        <div className="catalog-form-grid">
          <PremiumSelect
            label="Colaborador"
            value={form.userId}
            options={userOptions}
            onChange={(v) => setForm({ ...form, userId: v })}
            required
          />
          <FinanceField label="Valor (R$)" htmlFor="advance-amount">
            <input
              id="advance-amount"
              type="number"
              step="0.01"
              className="premium-text-input"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </FinanceField>
          <FinanceField label="Data" htmlFor="advance-date">
            <input
              id="advance-date"
              type="date"
              className="premium-text-input"
              value={form.advanceDate}
              onChange={(e) => setForm({ ...form, advanceDate: e.target.value })}
            />
          </FinanceField>
        </div>
      </RegistryFormModal>
      <FinanceTable
        headers={['Colaborador', 'Valor', 'Data', 'Status']}
        rows={rows.map((r) => [r.user?.name ?? r.userId, formatMoney(r.amount), r.advanceDate?.slice(0, 10), r.status])}
        pagination={pagination}
      />
      <AlertModal isOpen={alert.open} message={alert.message} type={alert.type} onClose={() => setAlert(closedAlert)} />
    </CatalogPageLayout>
  );
};

// —— Extrato ——
export const FinanceStatementPage: React.FC = () => {
  const can = useFinanceAccess();
  const { accounts } = useFinanceMasterData();
  const [accountId, setAccountId] = useState('');
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayIso());
  const [stmt, setStmt] = useState<any>(null);

  const load = useCallback(async () => {
    if (!accountId) return;
    setStmt(await fetchStatement(accountId, { from, to }));
  }, [accountId, from, to]);

  useEffect(() => {
    if (can && accountId) load();
  }, [can, load, accountId]);

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout className="finance-page" moduleLabel="Gestão financeira" modulePath="/financeiro/lancamentos" title="Extrato de caixa e bancos" description="Movimentações por conta financeira.">
      <FinancePeriodBar from={from} to={to} onFrom={setFrom} onTo={setTo} extra={
        <PremiumSelect label="Conta" value={accountId} options={[{ value: '', label: 'Selecione' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} onChange={setAccountId} />
      } />
      <button type="button" className="catalog-action-button" onClick={load}>Atualizar</button>
      {stmt && (
        <>
          <p>Saldo final: {formatMoney(stmt.closingBalance)}</p>
          <FinanceTable headers={['Data', 'Descrição', 'Valor', 'Saldo']} rows={(stmt.lines ?? []).map((t: any) => [t.date?.slice(0, 10), t.description, formatMoney(t.amount), formatMoney(t.balanceAfter)])} />
        </>
      )}
    </CatalogPageLayout>
  );
};

// —— Folha ——
const PAYROLL_STATUS_LABEL: Record<string, string> = { draft: 'Rascunho', closed: 'Fechada' };

const emptyPayrollRunForm = () => ({
  reference: '',
  periodStart: firstDayOfMonth(),
  periodEnd: todayIso(),
});

export const FinancePayrollPage: React.FC = () => {
  const can = useFinanceAccess();
  const loadPayroll = useCallback((page: number, limit: number) => fetchPayrollRuns({ page, limit }), []);
  const { items: paged, reload, pagination, meta } = useFinanceTableData(loadPayroll, [can]);
  const [newRun, setNewRun] = useState(emptyPayrollRunForm);
  const [showNewRunModal, setShowNewRunModal] = useState(false);
  const [isSavingNewRun, setIsSavingNewRun] = useState(false);
  const [alert, setAlert] = useState<FinanceAlert>(closedAlert);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const closeNewRunModal = () => {
    if (isSavingNewRun) return;
    setShowNewRunModal(false);
    setNewRun(emptyPayrollRunForm());
  };

  const [sortBy, setSortBy] = useState('periodEnd');
  const [sortOrder, setSortOrder] = useState<SortDirection>('DESC');

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder((o) => (o === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(col);
      setSortOrder('ASC');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deletePayrollRun(confirmDelete.id);
      await reload();
      setAlert(successAlert('Folha excluída.'));
    } catch (err) {
      setAlert(errorAlert(err));
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout
      className="finance-page"
      moduleLabel="Gestão financeira"
      modulePath="/financeiro/lancamentos"
      title="Folha de pagamento"
      description="Competências, linhas por colaborador e fechamento."
      actions={
        <button type="button" className="catalog-action-button" onClick={() => setShowNewRunModal(true)}>
          Nova folha
        </button>
      }
    >
      <RegistryFormModal
        isOpen={showNewRunModal}
        title="Nova folha de pagamento"
        subtitle="Informe a referência e o período de competência."
        isSaving={isSavingNewRun}
        onClose={closeNewRunModal}
        onSubmit={async (e) => {
          e.preventDefault();
          setIsSavingNewRun(true);
          try {
            await createPayrollRun(newRun);
            setShowNewRunModal(false);
            setNewRun(emptyPayrollRunForm());
            await reload();
            setAlert(successAlert('Folha criada.'));
          } catch (err) {
            setAlert(errorAlert(err));
          } finally {
            setIsSavingNewRun(false);
          }
        }}
        footer={registryModalFooterButtons({
          onClose: closeNewRunModal,
          isSaving: isSavingNewRun,
          submitLabel: 'Criar folha',
        })}
      >
        <div className="catalog-form-grid">
          <FinanceField label="Referência" htmlFor="pr-ref">
            <input
              id="pr-ref"
              className="premium-text-input"
              value={newRun.reference}
              onChange={(e) => setNewRun({ ...newRun, reference: e.target.value })}
              required
            />
          </FinanceField>
          <FinanceField label="Início" htmlFor="pr-start">
            <input
              id="pr-start"
              type="date"
              className="premium-text-input"
              value={newRun.periodStart}
              onChange={(e) => setNewRun({ ...newRun, periodStart: e.target.value })}
            />
          </FinanceField>
          <FinanceField label="Fim" htmlFor="pr-end">
            <input
              id="pr-end"
              type="date"
              className="premium-text-input"
              value={newRun.periodEnd}
              onChange={(e) => setNewRun({ ...newRun, periodEnd: e.target.value })}
            />
          </FinanceField>
        </div>
      </RegistryFormModal>

      <section className="catalog-surface">
        <div className="catalog-section-header">
          <div>
            <h2>Folhas cadastradas</h2>
          </div>
          <p>{meta?.total ?? paged.length} registro(s)</p>
        </div>

        {paged.length === 0 ? (
          <div className="catalog-empty">Nenhuma folha encontrada.</div>
        ) : (
          <div className="catalog-data-table-wrap finance-table-wrap">
            <table className="finance-table catalog-data-table">
              <colgroup>
                <col />
                <col />
                <col />
                <col />
                <col />
                <col className="catalog-data-table__col--actions" />
              </colgroup>
              <thead>
                <tr>
                  <th><CatalogSortableTh column="reference" label="Referência" activeSortBy={sortBy} activeSortOrder={sortOrder} onSort={handleSort} /></th>
                  <th><CatalogSortableTh column="periodStart" label="Início" activeSortBy={sortBy} activeSortOrder={sortOrder} onSort={handleSort} /></th>
                  <th><CatalogSortableTh column="periodEnd" label="Fim" activeSortBy={sortBy} activeSortOrder={sortOrder} onSort={handleSort} /></th>
                  <th><CatalogSortableTh column="status" label="Status" activeSortBy={sortBy} activeSortOrder={sortOrder} onSort={handleSort} /></th>
                  <th><CatalogSortableTh column="totalNet" label="Total líquido" activeSortBy={sortBy} activeSortOrder={sortOrder} onSort={handleSort} align="right" /></th>
                  <th className="catalog-data-table__actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r: any) => (
                  <tr key={r.id}>
                    <td>{r.reference}</td>
                    <td>{r.periodStart ? formatDateBr(r.periodStart) : '—'}</td>
                    <td>{r.periodEnd ? formatDateBr(r.periodEnd) : '—'}</td>
                    <td>
                      <span className={`catalog-pill catalog-pill--sm ${r.status === 'closed' ? 'is-role' : 'is-muted'}`}>
                        {PAYROLL_STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(r.totalNet)}</td>
                    <td className="catalog-data-table__actions finance-table-actions">
                      {r.status !== 'closed' && (
                        <div className="catalog-data-table__actions-group">
                          <CatalogRegistryIconActions
                            editLabel=""
                            deleteLabel={`Excluir folha ${r.reference}`}
                            showEdit={false}
                            onDelete={() => setConfirmDelete({ id: r.id, label: r.reference })}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination ? (
          <CatalogPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            disabled={pagination.disabled}
            onPageChange={pagination.onPageChange}
            onLimitChange={pagination.onLimitChange}
          />
        ) : null}
      </section>

      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Excluir folha de pagamento"
        message={confirmDelete ? `Deseja excluir a folha "${confirmDelete.label}"? Esta ação não pode ser desfeita.` : ''}
        confirmLabel="Excluir"
        variant="danger"
        isLoading={deleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setConfirmDelete(null)}
      />
      <AlertModal isOpen={alert.open} message={alert.message} type={alert.type} onClose={() => setAlert(closedAlert)} />
    </CatalogPageLayout>
  );
};

// —— Recibos ——
export const FinanceReceiptsPage: React.FC = () => {
  const can = useFinanceAccess();
  const loadReceipts = useCallback((page: number, limit: number) => fetchReceipts({ page, limit }), []);
  const { items: rows, reload, pagination } = useFinanceTableData(loadReceipts, [can]);
  const [form, setForm] = useState({ issuedTo: '', amount: '', issuedAt: todayIso(), description: '' });
  const [alert, setAlert] = useState<FinanceAlert>(closedAlert);

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout className="finance-page" moduleLabel="Gestão financeira" modulePath="/financeiro/lancamentos" title="Geração de recibos" description="Comprovantes de pagamento ou recebimento.">
      <FinanceSection title="Novo recibo">
        <form className="catalog-form" onSubmit={async (e) => {
          e.preventDefault();
          try {
            await createReceipt({ ...form, amount: parseFloat(form.amount) });
            await reload();
            setAlert(successAlert('Recibo criado.'));
          } catch (err) {
            setAlert(errorAlert(err));
          }
        }}>
          <div className="catalog-form-grid">
            <label>Emitido para<input className="premium-text-input" value={form.issuedTo} onChange={(e) => setForm({ ...form, issuedTo: e.target.value })} required /></label>
            <label>Valor<input type="number" className="premium-text-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></label>
            <label>Data<input type="date" className="premium-text-input" value={form.issuedAt} onChange={(e) => setForm({ ...form, issuedAt: e.target.value })} /></label>
            <label>Descrição<input className="premium-text-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          </div>
          <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary">Emitir</button>
        </form>
      </FinanceSection>
      <FinanceTable
        headers={['Nº', 'Para', 'Valor', 'Data']}
        rows={rows.map((r) => [r.receiptNumber, r.issuedTo, formatMoney(r.amount), r.issuedAt?.slice(0, 10)])}
        pagination={pagination}
      />
      <AlertModal isOpen={alert.open} message={alert.message} type={alert.type} onClose={() => setAlert(closedAlert)} />
    </CatalogPageLayout>
  );
};

// —— Conferência diária ——
export const FinanceDailyPage: React.FC = () => {
  const can = useFinanceAccess();
  const [date, setDate] = useState(todayIso());
  const [row, setRow] = useState<any>(null);
  const [form, setForm] = useState({ cashCounted: '', notes: '' });
  const [alert, setAlert] = useState<FinanceAlert>(closedAlert);

  const load = useCallback(async () => {
    const list = await fetchDailyReconciliation({ from: date, to: date });
    const first = Array.isArray(list) ? list[0] : list;
    setRow(first ?? null);
    if (first) setForm({ cashCounted: String(first.cashCounted ?? ''), notes: first.notes ?? '' });
  }, [date]);

  useEffect(() => {
    if (can) load();
  }, [can, load]);

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout className="finance-page" moduleLabel="Gestão financeira" modulePath="/financeiro/lancamentos" title="Conferência diária" description="Compara PDV, lançamentos e caixa contado.">
      <section className="finance-toolbar">
        <FinanceField label="Data">
          <input type="date" className="premium-text-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </FinanceField>
      </section>
      {row && (
        <FinanceSummaryBar
          summary={{
            totalIncome: Number(row.financeIncomeTotal),
            totalExpense: Number(row.pdvSalesTotal),
            balance: Number(row.difference),
          }}
        />
      )}
      <FinanceSection title="Conferência">
        <form
          className="catalog-toolbar catalog-filter-toolbar"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await upsertDailyReconciliation({
                reconciliationDate: date,
                cashCounted: parseFloat(form.cashCounted),
                notes: form.notes,
              });
              await load();
              setAlert(successAlert('Conferência salva.'));
            } catch (err) {
              setAlert(errorAlert(err));
            }
          }}
        >
          <div className="form-group catalog-filter-toolbar__field">
            <label htmlFor="finance-recon-counted">Caixa contado</label>
            <input
              id="finance-recon-counted"
              type="number"
              step="0.01"
              className="premium-text-input"
              value={form.cashCounted}
              onChange={(e) => setForm({ ...form, cashCounted: e.target.value })}
            />
          </div>
          <div className="form-group catalog-filter-toolbar__field">
            <label htmlFor="finance-recon-notes">Obs.</label>
            <input
              id="finance-recon-notes"
              className="premium-text-input"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <button
            type="submit"
            className="catalog-form-footer-btn catalog-form-footer-btn--primary catalog-filter-toolbar__action"
          >
            Salvar
          </button>
        </form>
      </FinanceSection>
      <AlertModal isOpen={alert.open} message={alert.message} type={alert.type} onClose={() => setAlert(closedAlert)} />
    </CatalogPageLayout>
  );
};

// —— Caixas ——
export const FinanceCashPage: React.FC = () => {
  const can = useFinanceAccess();
  const { accounts } = useFinanceMasterData();
  const loadSessions = useCallback((page: number, limit: number) => fetchCashSessions({ page, limit }), []);
  const { items: sessions, reload: load, pagination } = useFinanceTableData(loadSessions, [can]);
  const [openForm, setOpenForm] = useState({ accountId: '', openingBalance: '0', notes: '' });
  const [closeId, setCloseId] = useState('');
  const [closeForm, setCloseForm] = useState({ countedBalance: '', notes: '' });
  const [alert, setAlert] = useState<FinanceAlert>(closedAlert);

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout className="finance-page" moduleLabel="Gestão financeira" modulePath="/financeiro/lancamentos" title="Conferência e gestão de caixas" description="Abertura e fechamento de sessão de caixa.">
      <FinanceSection title="Abrir caixa">
        <form
          className="catalog-toolbar catalog-filter-toolbar"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await openCashSession({ ...openForm, openingBalance: parseFloat(openForm.openingBalance) });
              await load();
              setAlert(successAlert('Caixa aberto.'));
            } catch (err) {
              setAlert(errorAlert(err));
            }
          }}
        >
          <PremiumSelect
            label="Conta caixa"
            value={openForm.accountId}
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            wrapperClassName="form-group catalog-filter-toolbar__field"
            onChange={(v) => setOpenForm({ ...openForm, accountId: v })}
          />
          <div className="form-group catalog-filter-toolbar__field">
            <label htmlFor="finance-open-balance">Saldo inicial</label>
            <input
              id="finance-open-balance"
              type="number"
              min={0}
              step="0.01"
              className="premium-text-input"
              value={openForm.openingBalance}
              onChange={(e) => setOpenForm({ ...openForm, openingBalance: e.target.value })}
            />
          </div>
          <button
            type="submit"
            className="catalog-form-footer-btn catalog-form-footer-btn--primary catalog-filter-toolbar__action"
          >
            Abrir caixa
          </button>
        </form>
      </FinanceSection>
      <FinanceTable
        headers={['Conta', 'Abertura', 'Status', 'Saldo abertura']}
        rows={sessions.map((s) => [s.account?.name, s.openedAt?.slice(0, 16), s.status, formatMoney(s.openingBalance)])}
        pagination={pagination}
      />
      <FinanceSection title="Fechar caixa">
        <div className="catalog-toolbar catalog-filter-toolbar">
          <PremiumSelect
            label="Fechar sessão"
            value={closeId}
            options={sessions.filter((s) => s.status === 'open').map((s) => ({
              value: s.id,
              label: s.account?.name ?? s.id,
            }))}
            wrapperClassName="form-group catalog-filter-toolbar__field"
            onChange={setCloseId}
          />
          <div className="form-group catalog-filter-toolbar__field">
            <label htmlFor="finance-close-counted">Valor contado</label>
            <input
              id="finance-close-counted"
              type="number"
              min={0}
              step="0.01"
              className="premium-text-input"
              value={closeForm.countedBalance}
              onChange={(e) => setCloseForm({ ...closeForm, countedBalance: e.target.value })}
            />
          </div>
          <button
            type="button"
            className="catalog-form-footer-btn catalog-form-footer-btn--ghost catalog-filter-toolbar__action"
            onClick={async () => {
              try {
                await closeCashSession(closeId, {
                  ...closeForm,
                  countedBalance: parseFloat(closeForm.countedBalance),
                });
                await load();
                setAlert(successAlert('Caixa fechado.'));
              } catch (err) {
                setAlert(errorAlert(err));
              }
            }}
          >
            Fechar caixa
          </button>
        </div>
      </FinanceSection>
      <AlertModal isOpen={alert.open} message={alert.message} type={alert.type} onClose={() => setAlert(closedAlert)} />
    </CatalogPageLayout>
  );
};

// —— DRE ——
export const FinanceDrePage: React.FC = () => {
  const can = useFinanceAccess();
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayIso());
  const [dre, setDre] = useState<any>(null);

  const load = useCallback(async () => setDre(await fetchDre({ from, to })), [from, to]);

  useEffect(() => {
    if (can) load();
  }, [can, load]);

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout className="finance-page" moduleLabel="Gestão financeira" modulePath="/financeiro/lancamentos" title="Resumo financeiro (DRE)" description="Receitas, despesas e resultado por categoria.">
      <FinancePeriodBar from={from} to={to} onFrom={setFrom} onTo={setTo} extra={<button type="button" className="catalog-action-button" onClick={load}>Atualizar</button>} />
      {dre && (
        <>
          <FinanceSummaryBar summary={{ totalIncome: dre.income, totalExpense: dre.expense, balance: dre.result }} />
          <FinanceTable headers={['Tipo', 'Categoria', 'Total']} rows={(dre.byCategory ?? []).map((l: any) => [l.type, l.category, formatMoney(l.total)])} />
          <p>A pagar em aberto: {formatMoney(dre.openPayables)}</p>
        </>
      )}
    </CatalogPageLayout>
  );
};

// —— DRC (fluxo de caixa) ——
export const FinanceDrcPage: React.FC = () => {
  const can = useFinanceAccess();
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayIso());
  const [flow, setFlow] = useState<any>(null);

  const load = useCallback(async () => setFlow(await fetchCashFlow({ from, to })), [from, to]);

  useEffect(() => {
    if (can) load();
  }, [can, load]);

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout className="finance-page" moduleLabel="Gestão financeira" modulePath="/financeiro/lancamentos" title="Fluxo de caixa (DRC)" description="Entradas e saídas por período.">
      <FinancePeriodBar from={from} to={to} onFrom={setFrom} onTo={setTo} extra={<button type="button" className="catalog-action-button" onClick={load}>Atualizar</button>} />
      {flow && <FinanceTable headers={['Mês', 'Entrada', 'Saída', 'Líquido']} rows={(flow.months ?? []).map((d: any) => [d.month, formatMoney(d.inflow), formatMoney(d.outflow), formatMoney(d.net)])} />}
    </CatalogPageLayout>
  );
};

// —— Cartão ——
const emptyCardReceivableForm = () => ({
  acquirer: '',
  grossAmount: '',
  feeAmount: '0',
  expectedDepositDate: todayIso(),
  referenceDate: todayIso(),
});

export const FinanceCardPage: React.FC = () => {
  const can = useFinanceAccess();
  const { accounts } = useFinanceMasterData();
  const loadCards = useCallback((page: number, limit: number) => fetchCardReceivables({ page, limit }), []);
  const { items: rows, reload: load, pagination } = useFinanceTableData(loadCards, [can]);
  const [form, setForm] = useState(emptyCardReceivableForm);
  const [showNewCardModal, setShowNewCardModal] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [depositId, setDepositId] = useState('');
  const [depositAccount, setDepositAccount] = useState('');
  const [alert, setAlert] = useState<FinanceAlert>(closedAlert);

  const closeNewCardModal = () => {
    if (isSavingCard) return;
    setShowNewCardModal(false);
    setForm(emptyCardReceivableForm());
  };

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout
      className="finance-page"
      moduleLabel="Gestão financeira"
      modulePath="/financeiro/lancamentos"
      title="Gestão de cartão"
      description="Recebíveis de adquirente e depósito em conta."
      actions={
        <button type="button" className="catalog-action-button" onClick={() => setShowNewCardModal(true)}>
          Novo recebível
        </button>
      }
    >
      <RegistryFormModal
        isOpen={showNewCardModal}
        wide
        title="Novo recebível de cartão"
        subtitle="Registre vendas no cartão e taxas da adquirente."
        isSaving={isSavingCard}
        onClose={closeNewCardModal}
        onSubmit={async (e) => {
          e.preventDefault();
          setIsSavingCard(true);
          try {
            await createCardReceivable({
              ...form,
              grossAmount: parseFloat(form.grossAmount),
              feeAmount: parseFloat(form.feeAmount),
            });
            setShowNewCardModal(false);
            setForm(emptyCardReceivableForm());
            await load();
            setAlert(successAlert('Recebível registrado.'));
          } catch (err) {
            setAlert(errorAlert(err));
          } finally {
            setIsSavingCard(false);
          }
        }}
        footer={registryModalFooterButtons({
          onClose: closeNewCardModal,
          isSaving: isSavingCard,
          submitLabel: 'Registrar',
        })}
      >
        <div className="catalog-form-grid">
          <FinanceField label="Adquirente" htmlFor="card-acquirer">
            <input
              id="card-acquirer"
              className="premium-text-input"
              value={form.acquirer}
              onChange={(e) => setForm({ ...form, acquirer: e.target.value })}
              placeholder="PagBank / adquirente"
            />
          </FinanceField>
          <FinanceField label="Data da venda" htmlFor="card-reference-date">
            <input
              id="card-reference-date"
              type="date"
              className="premium-text-input"
              value={form.referenceDate}
              onChange={(e) => setForm({ ...form, referenceDate: e.target.value })}
            />
          </FinanceField>
          <FinanceField label="Valor bruto (R$)" htmlFor="card-gross">
            <input
              id="card-gross"
              type="number"
              step="0.01"
              className="premium-text-input"
              value={form.grossAmount}
              onChange={(e) => setForm({ ...form, grossAmount: e.target.value })}
              required
            />
          </FinanceField>
          <FinanceField label="Taxa (R$)" htmlFor="card-fee">
            <input
              id="card-fee"
              type="number"
              step="0.01"
              className="premium-text-input"
              value={form.feeAmount}
              onChange={(e) => setForm({ ...form, feeAmount: e.target.value })}
            />
          </FinanceField>
          <FinanceField label="Previsão de depósito" htmlFor="card-expected-deposit">
            <input
              id="card-expected-deposit"
              type="date"
              className="premium-text-input"
              value={form.expectedDepositDate}
              onChange={(e) => setForm({ ...form, expectedDepositDate: e.target.value })}
            />
          </FinanceField>
        </div>
      </RegistryFormModal>
      <FinanceTable
        headers={['Adquirente', 'Líquido', 'Status', 'Previsão']}
        rows={rows.map((r) => [r.acquirer, formatMoney(r.netAmount), r.status, r.expectedDepositDate?.slice(0, 10)])}
        pagination={pagination}
      />
      <section className="catalog-surface">
        <div className="catalog-toolbar catalog-filter-toolbar finance-filters">
        <PremiumSelect label="Recebível" value={depositId} options={rows.filter((r) => r.status === 'pending').map((r) => ({ value: r.id, label: r.acquirerName }))} wrapperClassName="form-group catalog-filter-toolbar__field" onChange={setDepositId} />
        <PremiumSelect label="Conta destino" value={depositAccount} options={accounts.map((a) => ({ value: a.id, label: a.name }))} wrapperClassName="form-group catalog-filter-toolbar__field" onChange={setDepositAccount} />
        <button type="button" className="catalog-form-footer-btn catalog-form-footer-btn--primary catalog-filter-toolbar__action" onClick={async () => {
          try {
            await depositCard(depositId, depositAccount);
            await load();
            setAlert(successAlert('Depositado.'));
          } catch (err) {
            setAlert(errorAlert(err));
          }
        }}>Depositar</button>
        </div>
      </section>
      <AlertModal isOpen={alert.open} message={alert.message} type={alert.type} onClose={() => setAlert(closedAlert)} />
    </CatalogPageLayout>
  );
};

// —— Conciliação ——
export const FinanceReconciliationPage: React.FC = () => {
  const can = useFinanceAccess();
  const { accounts, data } = useFinanceMasterData();
  const [accountId, setAccountId] = useState('');
  const [bankPage, setBankPage] = useState(1);
  const [bankLimit, setBankLimit] = useState(DEFAULT_PAGE_SIZE);
  const [lines, setLines] = useState<any[]>([]);
  const [linesMeta, setLinesMeta] = useState<PaginatedMeta | null>(null);
  const [form, setForm] = useState({ lineDate: todayIso(), description: '', amount: '' });
  const [matchLine, setMatchLine] = useState('');
  const [matchTx, setMatchTx] = useState('');
  const [alert, setAlert] = useState<FinanceAlert>(closedAlert);

  const loadLines = useCallback(async () => {
    if (!accountId) return;
    const result = await fetchBankLines({ accountId, page: bankPage, limit: bankLimit });
    setLines(result.items);
    setLinesMeta(result.meta);
  }, [accountId, bankPage, bankLimit]);

  useEffect(() => {
    setBankPage(1);
  }, [accountId]);

  useEffect(() => {
    if (can && accountId) void loadLines();
  }, [can, accountId, loadLines]);

  const bankPagination: TablePaginationProps | undefined =
    linesMeta && linesMeta.total > 0
      ? {
          page: linesMeta.page,
          totalPages: linesMeta.totalPages,
          total: linesMeta.total,
          limit: bankLimit,
          onPageChange: setBankPage,
          onLimitChange: (next) => {
            setBankLimit(next);
            setBankPage(1);
          },
        }
      : undefined;

  if (!can) return <AccessDenied />;

  const txs = data?.transactions ?? [];

  return (
    <CatalogPageLayout className="finance-page" moduleLabel="Gestão financeira" modulePath="/financeiro/lancamentos" title="Conciliação bancária" description="Linhas de extrato e vínculo com lançamentos.">
      <section className="finance-toolbar" aria-label="Conta bancária">
        <PremiumSelect
          label="Conta"
          value={accountId}
          options={[{ value: '', label: 'Selecione' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
          onChange={setAccountId}
        />
      </section>

      {!accountId ? (
        <p className="catalog-empty">Selecione uma conta para importar e conciliar linhas.</p>
      ) : (
        <>
          <FinanceSection title="Importar linha do extrato">
            <form
              className="catalog-form"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await createBankLine({ accountId, ...form, amount: parseFloat(form.amount) });
                  await loadLines();
                  setForm({ lineDate: todayIso(), description: '', amount: '' });
                  setAlert(successAlert('Linha importada.'));
                } catch (err) {
                  setAlert(errorAlert(err));
                }
              }}
            >
              <div className="catalog-form-grid">
                <FinanceField label="Data">
                  <input
                    type="date"
                    className="premium-text-input"
                    value={form.lineDate}
                    onChange={(e) => setForm({ ...form, lineDate: e.target.value })}
                    required
                  />
                </FinanceField>
                <FinanceField label="Descrição">
                  <input
                    className="premium-text-input"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                  />
                </FinanceField>
                <FinanceField label="Valor (R$)">
                  <input
                    type="number"
                    step="0.01"
                    className="premium-text-input"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </FinanceField>
              </div>
              <FinanceFormActions>
                <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary">
                  Importar linha
                </button>
              </FinanceFormActions>
            </form>
          </FinanceSection>

          <FinanceTable
            title="Linhas do extrato"
            headers={['Data', 'Descrição', 'Valor', 'Conciliado']}
            rows={lines.map((l) => [
              l.lineDate?.slice(0, 10),
              l.description,
              formatMoney(l.amount),
              l.matchedTransactionId ? 'Sim' : 'Não',
            ])}
            pagination={bankPagination}
          />

          <FinanceSection title="Vincular a lançamento">
            <section className="finance-toolbar" aria-label="Vincular linha e lançamento">
              <PremiumSelect
                label="Linha do extrato"
                value={matchLine}
                options={[
                  { value: '', label: 'Selecione' },
                  ...lines
                    .filter((l) => !l.matchedTransactionId)
                    .map((l) => ({ value: l.id, label: l.description })),
                ]}
                onChange={setMatchLine}
              />
              <PremiumSelect
                label="Lançamento"
                value={matchTx}
                options={[
                  { value: '', label: 'Selecione' },
                  ...txs.map((t) => ({ value: t.id, label: t.description })),
                ]}
                onChange={setMatchTx}
              />
              <div className="finance-toolbar__actions">
                <button
                  type="button"
                  className="catalog-form-footer-btn catalog-form-footer-btn--primary"
                  onClick={async () => {
                    if (!matchLine || !matchTx) {
                      setAlert({ open: true, message: 'Selecione a linha e o lançamento.', type: 'error' });
                      return;
                    }
                    try {
                      await matchBankLine(matchLine, matchTx);
                      await loadLines();
                      setMatchLine('');
                      setMatchTx('');
                      setAlert(successAlert('Conciliado.'));
                    } catch (err) {
                      setAlert(errorAlert(err));
                    }
                  }}
                >
                  Vincular
                </button>
              </div>
            </section>
          </FinanceSection>
        </>
      )}

      <AlertModal isOpen={alert.open} message={alert.message} type={alert.type} onClose={() => setAlert(closedAlert)} />
    </CatalogPageLayout>
  );
};

// —— Pré-pago ——
const emptyPrepaidWalletForm = () => ({ holderName: '' });

export const FinancePrepaidPage: React.FC = () => {
  const can = useFinanceAccess();
  const loadWallets = useCallback((page: number, limit: number) => fetchPrepaidWallets({ page, limit }), []);
  const { items: wallets, reload: load, pagination } = useFinanceTableData(loadWallets, [can]);
  const [form, setForm] = useState(emptyPrepaidWalletForm);
  const [showNewWalletModal, setShowNewWalletModal] = useState(false);
  const [isSavingWallet, setIsSavingWallet] = useState(false);
  const [movWallet, setMovWallet] = useState('');
  const [mov, setMov] = useState({ movementType: 'credit', amount: '', description: '' });
  const [alert, setAlert] = useState<FinanceAlert>(closedAlert);

  const closeNewWalletModal = () => {
    if (isSavingWallet) return;
    setShowNewWalletModal(false);
    setForm(emptyPrepaidWalletForm());
  };

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout
      className="finance-page"
      moduleLabel="Gestão financeira"
      modulePath="/financeiro/lancamentos"
      title="Crédito pré-pago"
      description="Carteira de crédito para clientes."
      actions={
        <button type="button" className="catalog-action-button" onClick={() => setShowNewWalletModal(true)}>
          Nova carteira
        </button>
      }
    >
      <RegistryFormModal
        isOpen={showNewWalletModal}
        title="Nova carteira"
        subtitle="Cadastre uma carteira de crédito pré-pago para um cliente."
        isSaving={isSavingWallet}
        onClose={closeNewWalletModal}
        onSubmit={async (e) => {
          e.preventDefault();
          setIsSavingWallet(true);
          try {
            await createPrepaidWallet(form);
            setShowNewWalletModal(false);
            setForm(emptyPrepaidWalletForm());
            await load();
            setAlert(successAlert('Carteira criada.'));
          } catch (err) {
            setAlert(errorAlert(err));
          } finally {
            setIsSavingWallet(false);
          }
        }}
        footer={registryModalFooterButtons({
          onClose: closeNewWalletModal,
          isSaving: isSavingWallet,
          submitLabel: 'Criar carteira',
        })}
      >
        <FinanceField label="Titular" htmlFor="prepaid-holder">
          <input
            id="prepaid-holder"
            className="premium-text-input"
            value={form.holderName}
            onChange={(e) => setForm({ ...form, holderName: e.target.value })}
            required
          />
        </FinanceField>
      </RegistryFormModal>

      <FinanceTable
        title="Carteiras cadastradas"
        headers={['Titular', 'Saldo']}
        rows={wallets.map((w) => [w.holderName, formatMoney(w.balance)])}
        pagination={pagination}
      />

      <FinanceSection title="Registrar movimento">
        {!wallets.length ? (
          <p className="catalog-empty">Crie uma carteira antes de registrar crédito ou débito.</p>
        ) : (
          <form
            className="catalog-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!movWallet) {
                setAlert({ open: true, message: 'Selecione a carteira.', type: 'error' });
                return;
              }
              try {
                await prepaidMovement(movWallet, { ...mov, amount: parseFloat(mov.amount) });
                await load();
                setMov({ movementType: 'credit', amount: '', description: '' });
                setAlert(successAlert('Movimento registrado.'));
              } catch (err) {
                setAlert(errorAlert(err));
              }
            }}
          >
            <div className="catalog-form-grid">
              <PremiumSelect
                label="Carteira"
                value={movWallet}
                options={[
                  { value: '', label: 'Selecione' },
                  ...wallets.map((w) => ({ value: w.id, label: w.holderName })),
                ]}
                onChange={setMovWallet}
              />
              <PremiumSelect
                label="Movimento"
                value={mov.movementType}
                options={[
                  { value: 'credit', label: 'Crédito' },
                  { value: 'debit', label: 'Débito' },
                ]}
                onChange={(v) => setMov({ ...mov, movementType: v })}
              />
              <FinanceField label="Valor (R$)">
                <input
                  type="number"
                  step="0.01"
                  className="premium-text-input"
                  value={mov.amount}
                  onChange={(e) => setMov({ ...mov, amount: e.target.value })}
                  required
                />
              </FinanceField>
              <FinanceField label="Descrição">
                <input
                  className="premium-text-input"
                  value={mov.description}
                  onChange={(e) => setMov({ ...mov, description: e.target.value })}
                  placeholder="Opcional"
                />
              </FinanceField>
            </div>
            <FinanceFormActions>
              <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary">
                Aplicar movimento
              </button>
            </FinanceFormActions>
          </form>
        )}
      </FinanceSection>

      <AlertModal isOpen={alert.open} message={alert.message} type={alert.type} onClose={() => setAlert(closedAlert)} />
    </CatalogPageLayout>
  );
};

// —— Relatórios financeiros ——
export const FinanceReportsPage: React.FC = () => {
  const can = useFinanceAccess();
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayIso());
  const [dash, setDash] = useState<any>(null);

  const load = useCallback(async () => setDash(await fetchFinanceDashboard({ from, to })), [from, to]);

  useEffect(() => {
    if (can) load();
  }, [can, load]);

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout className="finance-page" moduleLabel="Relatórios" modulePath="/relatorios" title="Relatórios financeiros" description="Painel consolidado do período.">
      <FinancePeriodBar from={from} to={to} onFrom={setFrom} onTo={setTo} extra={<button type="button" className="catalog-action-button" onClick={load}>Atualizar</button>} />
      {dash && (
        <>
          <FinanceSummaryBar summary={dash.overview} />
          <FinanceTable headers={['Indicador', 'Valor']} rows={[
            ['Resultado (DRE)', formatMoney(dash.dre?.result ?? 0)],
            ['A pagar em aberto', formatMoney(dash.dre?.openPayables ?? 0)],
            ['Títulos vencidos', String(dash.overdueBills ?? 0)],
          ]} />
        </>
      )}
    </CatalogPageLayout>
  );
};
