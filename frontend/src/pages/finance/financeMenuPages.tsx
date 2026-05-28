import React, { useCallback, useEffect, useMemo, useState } from 'react';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertModal from '../../components/AlertModal';
import ConfirmModal from '../../components/ConfirmModal';
import PremiumSelect from '../../components/PremiumSelect';
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
import CatalogSortableTh from '../../components/catalog/CatalogSortableTh';
import type { SortDirection } from '../../types/pagination';
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
}: {
  headers: string[];
  rows: React.ReactNode[][];
  title?: string;
}) {
  return (
    <section className="catalog-surface finance-list-panel">
      <h2 className="finance-list-panel__title">{title}</h2>
      {!rows.length ? (
        <p className="catalog-empty">Nenhum registro.</p>
      ) : (
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
      )}
    </section>
  );
}

// —— Contas a pagar e receber ——
export const FinanceBillsPage: React.FC = () => {
  const can = useFinanceAccess();
  const { accounts, categories, reload: reloadMaster } = useFinanceMasterData();
  const [billType, setBillType] = useState<FinanceBillType>('payable');
  const [items, setItems] = useState<FinanceBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<FinanceAlert>(closedAlert);
  const [form, setForm] = useState({
    description: '',
    counterpartyName: '',
    amount: '',
    dueDate: todayIso(),
    accountId: '',
    categoryId: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchBills(billType));
    } catch (err) {
      setAlert(errorAlert(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [billType]);

  useEffect(() => {
    if (can) load();
  }, [can, load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setForm({ description: '', counterpartyName: '', amount: '', dueDate: todayIso(), accountId: '', categoryId: '' });
      await load();
      await reloadMaster();
      setAlert(successAlert('Título cadastrado.'));
    } catch (err) {
      setAlert(errorAlert(err));
    }
  };

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout
      className="finance-page"
      moduleLabel="Gestão financeira"
      modulePath="/financeiro/lancamentos"
      title="Contas a pagar e receber"
      description="Fornecedores, clientes e títulos em aberto."
    >
      <section className="finance-toolbar">
        <PremiumSelect
          label="Tipo"
          value={billType}
          options={[
            { value: 'payable', label: 'A pagar' },
            { value: 'receivable', label: 'A receber' },
          ]}
          onChange={(v) => setBillType(v as FinanceBillType)}
        />
      </section>

      <FinanceSection title="Novo título" kicker="Cadastro">
        <form className="catalog-form" onSubmit={submit}>
          <div className="catalog-form-grid">
            <FinanceField label="Descrição">
              <input
                className="premium-text-input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </FinanceField>
            <FinanceField label="Fornecedor / Cliente">
              <input
                className="premium-text-input"
                value={form.counterpartyName}
                onChange={(e) => setForm({ ...form, counterpartyName: e.target.value })}
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
            <FinanceField label="Vencimento">
              <input
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
          <FinanceFormActions>
            <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary">
              Salvar título
            </button>
          </FinanceFormActions>
        </form>
      </FinanceSection>

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
      <FinanceSection title="Baixa em lote" kicker="Operação">
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
export const FinanceTransfersPage: React.FC = () => {
  const can = useFinanceAccess();
  const { accounts } = useFinanceMasterData();
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ fromAccountId: '', toAccountId: '', amount: '', transferDate: todayIso(), description: '' });
  const [alert, setAlert] = useState<FinanceAlert>(closedAlert);

  const load = useCallback(async () => {
    setRows(await fetchTransfers());
  }, []);

  useEffect(() => {
    if (can) load();
  }, [can, load]);

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout className="finance-page" moduleLabel="Gestão financeira" modulePath="/financeiro/lancamentos" title="Transferência entre contas" description="Movimentação entre caixa, banco e contas digitais.">
      <FinanceSection title="Nova transferência" kicker="Cadastro">
        <form className="catalog-form" onSubmit={async (e) => {
          e.preventDefault();
          try {
            await createTransfer({ ...form, amount: parseFloat(form.amount) });
            await load();
            setAlert(successAlert('Transferência registrada.'));
          } catch (err) {
            setAlert(errorAlert(err));
          }
        }}>
          <div className="catalog-form-grid">
            <PremiumSelect label="Origem" value={form.fromAccountId} options={accounts.map((a) => ({ value: a.id, label: a.name }))} onChange={(v) => setForm({ ...form, fromAccountId: v })} required />
            <PremiumSelect label="Destino" value={form.toAccountId} options={accounts.map((a) => ({ value: a.id, label: a.name }))} onChange={(v) => setForm({ ...form, toAccountId: v })} required />
            <label>Valor<input type="number" step="0.01" className="premium-text-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></label>
            <label>Data<input type="date" className="premium-text-input" value={form.transferDate} onChange={(e) => setForm({ ...form, transferDate: e.target.value })} /></label>
            <label>Descrição<input className="premium-text-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          </div>
          <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary">Transferir</button>
        </form>
      </FinanceSection>
      <FinanceTable headers={['Data', 'Valor', 'Descrição']} rows={rows.map((r) => [r.transferDate?.slice(0, 10), formatMoney(r.amount), r.description || '—'])} />
      <AlertModal isOpen={alert.open} message={alert.message} type={alert.type} onClose={() => setAlert(closedAlert)} />
    </CatalogPageLayout>
  );
};

// —— Calendário ——
export const FinanceCalendarPage: React.FC = () => {
  const can = useFinanceAccess();
  const [month, setMonth] = useState(todayIso().slice(0, 7));
  const [rows, setRows] = useState<string[][]>([]);

  useEffect(() => {
    if (!can) return;
    fetchCalendar(month)
      .then((data: { days?: Record<string, { transactions?: { type: string; amount: number | string }[] }> }) => {
        const out: string[][] = [];
        const days = data?.days ?? {};
        Object.keys(days)
          .sort()
          .forEach((date) => {
            let income = 0;
            let expense = 0;
            for (const tx of days[date].transactions ?? []) {
              const v = Number(tx.amount);
              if (tx.type === 'income') income += v;
              else expense += v;
            }
            out.push([date, formatMoney(income), formatMoney(expense)]);
          });
        setRows(out);
      })
      .catch(() => setRows([]));
  }, [can, month]);

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout className="finance-page" moduleLabel="Gestão financeira" modulePath="/financeiro/lancamentos" title="Listagem por data" description="Visão mensal de receitas e despesas por dia.">
      <section className="finance-toolbar">
        <FinanceField label="Mês">
          <input type="month" className="premium-text-input" value={month} onChange={(e) => setMonth(e.target.value)} />
        </FinanceField>
      </section>
      <FinanceTable title="Resumo por dia" headers={['Data', 'Receitas', 'Despesas']} rows={rows} />
    </CatalogPageLayout>
  );
};

// —— Recorrentes ——
export const FinanceRecurringPage: React.FC = () => {
  const can = useFinanceAccess();
  const { accounts, categories } = useFinanceMasterData();
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ description: '', type: 'expense', amount: '', frequency: 'monthly', nextDueDate: todayIso(), accountId: '', categoryId: '' });
  const [alert, setAlert] = useState<FinanceAlert>(closedAlert);

  const load = useCallback(async () => setRows(await fetchRecurring()), []);

  useEffect(() => {
    if (can) load();
  }, [can, load]);

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout className="finance-page" moduleLabel="Gestão financeira" modulePath="/financeiro/lancamentos" title="Receitas e despesas recorrentes" description="Aluguel, assinaturas e receitas fixas.">
      <FinanceSection title="Nova regra recorrente" kicker="Cadastro">
        <form className="catalog-form" onSubmit={async (e) => {
          e.preventDefault();
          try {
            await createRecurring({ ...form, amount: parseFloat(form.amount) });
            await load();
            setAlert(successAlert('Regra criada.'));
          } catch (err) {
            setAlert(errorAlert(err));
          }
        }}>
          <div className="catalog-form-grid">
            <label>Descrição<input className="premium-text-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></label>
            <PremiumSelect label="Tipo" value={form.type} options={[{ value: 'income', label: 'Receita' }, { value: 'expense', label: 'Despesa' }]} onChange={(v) => setForm({ ...form, type: v })} />
            <label>Valor<input type="number" step="0.01" className="premium-text-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></label>
            <PremiumSelect label="Frequência" value={form.frequency} options={[{ value: 'weekly', label: 'Semanal' }, { value: 'monthly', label: 'Mensal' }, { value: 'yearly', label: 'Anual' }]} onChange={(v) => setForm({ ...form, frequency: v })} />
            <label>Próximo venc.<input type="date" className="premium-text-input" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} /></label>
            <PremiumSelect label="Conta" value={form.accountId} options={[{ value: '', label: '—' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} onChange={(v) => setForm({ ...form, accountId: v })} />
            <PremiumSelect label="Categoria" value={form.categoryId} options={[{ value: '', label: '—' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} onChange={(v) => setForm({ ...form, categoryId: v })} />
          </div>
          <FinanceFormActions>
            <button
              type="button"
              className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
              onClick={async () => {
                try {
                  const r = await runRecurringDue();
                  await load();
                  setAlert(successAlert(`Processados: ${r?.generated ?? 0}`));
                } catch (err) {
                  setAlert(errorAlert(err));
                }
              }}
            >
              Gerar vencidos
            </button>
            <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary">
              Salvar
            </button>
          </FinanceFormActions>
        </form>
      </FinanceSection>
      <FinanceTable headers={['Descrição', 'Tipo', 'Valor', 'Próximo']} rows={rows.map((r) => [r.description, r.type, formatMoney(r.amount), r.nextDueDate?.slice(0, 10)])} />
      <AlertModal isOpen={alert.open} message={alert.message} type={alert.type} onClose={() => setAlert(closedAlert)} />
    </CatalogPageLayout>
  );
};

// —— Adiantamento ——
export const FinanceAdvancesPage: React.FC = () => {
  const can = useFinanceAccess();
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ userId: '', amount: '', advanceDate: todayIso(), notes: '' });
  const [alert, setAlert] = useState<FinanceAlert>(closedAlert);

  useEffect(() => {
    if (!can) return;
    fetchPayrollUsers().then((u) => setUsers(u.map((x) => ({ id: x.id, name: x.name }))));
    fetchAdvances().then(setRows);
  }, [can]);

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout className="finance-page" moduleLabel="Gestão financeira" modulePath="/financeiro/lancamentos" title="Adiantamento" description="Adiantamentos a colaboradores.">
      <FinanceSection title="Novo adiantamento" kicker="Cadastro">
        <form className="catalog-form" onSubmit={async (e) => {
          e.preventDefault();
          try {
            await createAdvance({ ...form, amount: parseFloat(form.amount) });
            setRows(await fetchAdvances());
            setAlert(successAlert('Adiantamento registrado.'));
          } catch (err) {
            setAlert(errorAlert(err));
          }
        }}>
          <div className="catalog-form-grid">
            <PremiumSelect label="Colaborador" value={form.userId} options={[{ value: '', label: 'Selecione' }, ...users.map((u) => ({ value: u.id, label: u.name }))]} onChange={(v) => setForm({ ...form, userId: v })} required />
            <label>Valor<input type="number" step="0.01" className="premium-text-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></label>
            <label>Data<input type="date" className="premium-text-input" value={form.advanceDate} onChange={(e) => setForm({ ...form, advanceDate: e.target.value })} /></label>
          </div>
          <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary">Registrar</button>
        </form>
      </FinanceSection>
      <FinanceTable headers={['Colaborador', 'Valor', 'Data', 'Status']} rows={rows.map((r) => [r.user?.name ?? r.userId, formatMoney(r.amount), r.advanceDate?.slice(0, 10), r.status])} />
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
const PAYROLL_PAGE_SIZE = 10;

export const FinancePayrollPage: React.FC = () => {
  const can = useFinanceAccess();
  const [allRuns, setAllRuns] = useState<any[]>([]);
  const [newRun, setNewRun] = useState({ reference: '', periodStart: firstDayOfMonth(), periodEnd: todayIso() });
  const [alert, setAlert] = useState<FinanceAlert>(closedAlert);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAYROLL_PAGE_SIZE);
  const [sortBy, setSortBy] = useState('periodEnd');
  const [sortOrder, setSortOrder] = useState<SortDirection>('DESC');

  const reload = useCallback(async () => {
    setAllRuns(await fetchPayrollRuns());
  }, []);

  useEffect(() => {
    if (can) reload();
  }, [can, reload]);

  const filtered = useMemo(() => {
    let list = [...allRuns];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.reference?.toLowerCase().includes(q) ||
          (PAYROLL_STATUS_LABEL[r.status] ?? r.status).toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      const aVal = a[sortBy] ?? '';
      const bVal = b[sortBy] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortOrder === 'ASC' ? cmp : -cmp;
    });
    return list;
  }, [allRuns, search, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * limit, safePage * limit);

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder((o) => (o === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(col);
      setSortOrder('ASC');
    }
    setPage(1);
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
    <CatalogPageLayout className="finance-page" moduleLabel="Gestão financeira" modulePath="/financeiro/lancamentos" title="Folha de pagamento" description="Competências, linhas por colaborador e fechamento.">
      <FinanceSection title="Nova folha de pagamento" kicker="Competência">
        <form className="catalog-form" onSubmit={async (e) => {
          e.preventDefault();
          try {
            await createPayrollRun(newRun);
            setNewRun({ reference: '', periodStart: firstDayOfMonth(), periodEnd: todayIso() });
            await reload();
            setAlert(successAlert('Folha criada.'));
          } catch (err) {
            setAlert(errorAlert(err));
          }
        }}>
          <div className="catalog-form-grid">
            <div className="form-group">
              <label htmlFor="pr-ref">Referência</label>
              <input id="pr-ref" className="premium-text-input" value={newRun.reference} onChange={(e) => setNewRun({ ...newRun, reference: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="pr-start">Início</label>
              <input id="pr-start" type="date" className="premium-text-input" value={newRun.periodStart} onChange={(e) => setNewRun({ ...newRun, periodStart: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="pr-end">Fim</label>
              <input id="pr-end" type="date" className="premium-text-input" value={newRun.periodEnd} onChange={(e) => setNewRun({ ...newRun, periodEnd: e.target.value })} />
            </div>
          </div>
          <div className="catalog-form-footer">
            <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary">Criar folha</button>
          </div>
        </form>
      </FinanceSection>

      <section className="catalog-surface">
        <div className="catalog-section-header">
          <div>
            <span className="catalog-section-kicker">Histórico</span>
            <h2>Folhas cadastradas</h2>
          </div>
          <p>{filtered.length} registro(s)</p>
        </div>

        <div className="finance-filters" style={{ marginBottom: 16 }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <input
              className="premium-text-input"
              placeholder="Buscar por referência…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {paged.length === 0 ? (
          <div className="catalog-empty">Nenhuma folha encontrada.</div>
        ) : (
          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th><CatalogSortableTh column="reference" label="Referência" activeSortBy={sortBy} activeSortOrder={sortOrder} onSort={handleSort} /></th>
                  <th><CatalogSortableTh column="periodStart" label="Início" activeSortBy={sortBy} activeSortOrder={sortOrder} onSort={handleSort} /></th>
                  <th><CatalogSortableTh column="periodEnd" label="Fim" activeSortBy={sortBy} activeSortOrder={sortOrder} onSort={handleSort} /></th>
                  <th><CatalogSortableTh column="status" label="Status" activeSortBy={sortBy} activeSortOrder={sortOrder} onSort={handleSort} /></th>
                  <th><CatalogSortableTh column="totalNet" label="Total líquido" activeSortBy={sortBy} activeSortOrder={sortOrder} onSort={handleSort} align="right" /></th>
                  <th aria-label="Ações" />
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
                    <td>
                      <div className="finance-table-actions">
                        {r.status !== 'closed' && (
                          <button
                            type="button"
                            className="catalog-form-footer-btn catalog-form-footer-btn--danger"
                            onClick={() => setConfirmDelete({ id: r.id, label: r.reference })}
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <CatalogPagination
          page={safePage}
          totalPages={totalPages}
          total={filtered.length}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(v) => { setLimit(v); setPage(1); }}
        />
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
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ issuedTo: '', amount: '', issuedAt: todayIso(), description: '' });
  const [alert, setAlert] = useState<FinanceAlert>(closedAlert);

  useEffect(() => {
    if (can) fetchReceipts().then(setRows);
  }, [can]);

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout className="finance-page" moduleLabel="Gestão financeira" modulePath="/financeiro/lancamentos" title="Geração de recibos" description="Comprovantes de pagamento ou recebimento.">
      <FinanceSection title="Novo recibo" kicker="Cadastro">
        <form className="catalog-form" onSubmit={async (e) => {
          e.preventDefault();
          try {
            await createReceipt({ ...form, amount: parseFloat(form.amount) });
            setRows(await fetchReceipts());
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
      <FinanceTable headers={['Nº', 'Para', 'Valor', 'Data']} rows={rows.map((r) => [r.receiptNumber, r.issuedTo, formatMoney(r.amount), r.issuedAt?.slice(0, 10)])} />
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
      <FinanceSection title="Conferência" kicker="Caixa">
        <form className="catalog-form" onSubmit={async (e) => {
        e.preventDefault();
        try {
          await upsertDailyReconciliation({ reconciliationDate: date, cashCounted: parseFloat(form.cashCounted), notes: form.notes });
          await load();
          setAlert(successAlert('Conferência salva.'));
        } catch (err) {
          setAlert(errorAlert(err));
        }
      }}>
        <label>Caixa contado<input type="number" step="0.01" className="premium-text-input" value={form.cashCounted} onChange={(e) => setForm({ ...form, cashCounted: e.target.value })} /></label>
        <label>Obs.<input className="premium-text-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        <FinanceFormActions>
          <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary">
            Salvar
          </button>
        </FinanceFormActions>
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
  const [sessions, setSessions] = useState<any[]>([]);
  const [openForm, setOpenForm] = useState({ accountId: '', openingBalance: '0', notes: '' });
  const [closeId, setCloseId] = useState('');
  const [closeForm, setCloseForm] = useState({ countedBalance: '', notes: '' });
  const [alert, setAlert] = useState<FinanceAlert>(closedAlert);

  const load = useCallback(async () => setSessions(await fetchCashSessions()), []);

  useEffect(() => {
    if (can) load();
  }, [can, load]);

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout className="finance-page" moduleLabel="Gestão financeira" modulePath="/financeiro/lancamentos" title="Conferência e gestão de caixas" description="Abertura e fechamento de sessão de caixa.">
      <FinanceSection title="Abrir caixa" kicker="Sessão">
        <form className="catalog-form" onSubmit={async (e) => {
          e.preventDefault();
          try {
            await openCashSession({ ...openForm, openingBalance: parseFloat(openForm.openingBalance) });
            await load();
            setAlert(successAlert('Caixa aberto.'));
          } catch (err) {
            setAlert(errorAlert(err));
          }
        }}>
          <PremiumSelect label="Conta caixa" value={openForm.accountId} options={accounts.map((a) => ({ value: a.id, label: a.name }))} onChange={(v) => setOpenForm({ ...openForm, accountId: v })} />
          <label>Saldo inicial<input type="number" className="premium-text-input" value={openForm.openingBalance} onChange={(e) => setOpenForm({ ...openForm, openingBalance: e.target.value })} /></label>
          <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary">Abrir caixa</button>
        </form>
      </FinanceSection>
      <FinanceTable headers={['Conta', 'Abertura', 'Status', 'Saldo abertura']} rows={sessions.map((s) => [s.account?.name, s.openedAt?.slice(0, 16), s.status, formatMoney(s.openingBalance)])} />
      <FinanceSection title="Fechar caixa" kicker="Operação">
        <div className="catalog-form finance-filters">
          <PremiumSelect label="Fechar sessão" value={closeId} options={sessions.filter((s) => s.status === 'open').map((s) => ({ value: s.id, label: s.account?.name ?? s.id }))} onChange={setCloseId} />
          <FinanceField label="Valor contado">
            <input type="number" className="premium-text-input" value={closeForm.countedBalance} onChange={(e) => setCloseForm({ ...closeForm, countedBalance: e.target.value })} />
          </FinanceField>
          <FinanceFormActions>
            <button type="button" className="catalog-action-button" onClick={async () => {
              try {
                await closeCashSession(closeId, { ...closeForm, countedBalance: parseFloat(closeForm.countedBalance) });
                await load();
                setAlert(successAlert('Caixa fechado.'));
              } catch (err) {
                setAlert(errorAlert(err));
              }
            }}>Fechar caixa</button>
          </FinanceFormActions>
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
export const FinanceCardPage: React.FC = () => {
  const can = useFinanceAccess();
  const { accounts } = useFinanceMasterData();
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ acquirer: '', grossAmount: '', feeAmount: '0', expectedDepositDate: todayIso(), referenceDate: todayIso() });
  const [depositId, setDepositId] = useState('');
  const [depositAccount, setDepositAccount] = useState('');
  const [alert, setAlert] = useState<FinanceAlert>(closedAlert);

  const load = useCallback(async () => setRows(await fetchCardReceivables()), []);

  useEffect(() => {
    if (can) load();
  }, [can, load]);

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout className="finance-page" moduleLabel="Gestão financeira" modulePath="/financeiro/lancamentos" title="Gestão de cartão" description="Recebíveis de adquirente e depósito em conta.">
      <form className="catalog-form" onSubmit={async (e) => {
        e.preventDefault();
        try {
          await createCardReceivable({ ...form, grossAmount: parseFloat(form.grossAmount), feeAmount: parseFloat(form.feeAmount) });
          await load();
        } catch (err) {
          setAlert(errorAlert(err));
        }
      }}>
        <div className="catalog-form-grid">
          <label>Adquirente<input className="premium-text-input" value={form.acquirer} onChange={(e) => setForm({ ...form, acquirer: e.target.value })} /></label>
          <label>Data venda<input type="date" className="premium-text-input" value={form.referenceDate} onChange={(e) => setForm({ ...form, referenceDate: e.target.value })} /></label>
          <label>Bruto<input type="number" className="premium-text-input" value={form.grossAmount} onChange={(e) => setForm({ ...form, grossAmount: e.target.value })} required /></label>
          <label>Taxa<input type="number" className="premium-text-input" value={form.feeAmount} onChange={(e) => setForm({ ...form, feeAmount: e.target.value })} /></label>
        </div>
        <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary">Registrar</button>
      </form>
      <FinanceTable headers={['Adquirente', 'Líquido', 'Status', 'Previsão']} rows={rows.map((r) => [r.acquirer, formatMoney(r.netAmount), r.status, r.expectedDepositDate?.slice(0, 10)])} />
      <div className="finance-filters">
        <PremiumSelect label="Recebível" value={depositId} options={rows.filter((r) => r.status === 'pending').map((r) => ({ value: r.id, label: r.acquirerName }))} onChange={setDepositId} />
        <PremiumSelect label="Conta destino" value={depositAccount} options={accounts.map((a) => ({ value: a.id, label: a.name }))} onChange={setDepositAccount} />
        <button type="button" className="catalog-action-button" onClick={async () => {
          try {
            await depositCard(depositId, depositAccount);
            await load();
            setAlert(successAlert('Depositado.'));
          } catch (err) {
            setAlert(errorAlert(err));
          }
        }}>Depositar</button>
      </div>
      <AlertModal isOpen={alert.open} message={alert.message} type={alert.type} onClose={() => setAlert(closedAlert)} />
    </CatalogPageLayout>
  );
};

// —— Conciliação ——
export const FinanceReconciliationPage: React.FC = () => {
  const can = useFinanceAccess();
  const { accounts, data } = useFinanceMasterData();
  const [accountId, setAccountId] = useState('');
  const [lines, setLines] = useState<any[]>([]);
  const [form, setForm] = useState({ lineDate: todayIso(), description: '', amount: '' });
  const [matchLine, setMatchLine] = useState('');
  const [matchTx, setMatchTx] = useState('');
  const [alert, setAlert] = useState<FinanceAlert>(closedAlert);

  useEffect(() => {
    if (can && accountId) fetchBankLines(accountId).then(setLines);
  }, [can, accountId]);

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
          <FinanceSection title="Importar linha do extrato" kicker="Extrato">
            <form
              className="catalog-form"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await createBankLine({ accountId, ...form, amount: parseFloat(form.amount) });
                  setLines(await fetchBankLines(accountId));
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
          />

          <FinanceSection title="Vincular a lançamento" kicker="Conciliação">
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
                      setLines(await fetchBankLines(accountId));
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
export const FinancePrepaidPage: React.FC = () => {
  const can = useFinanceAccess();
  const [wallets, setWallets] = useState<any[]>([]);
  const [form, setForm] = useState({ holderName: '' });
  const [movWallet, setMovWallet] = useState('');
  const [mov, setMov] = useState({ movementType: 'credit', amount: '', description: '' });
  const [alert, setAlert] = useState<FinanceAlert>(closedAlert);

  const load = useCallback(async () => setWallets(await fetchPrepaidWallets()), []);

  useEffect(() => {
    if (can) load();
  }, [can, load]);

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout className="finance-page" moduleLabel="Gestão financeira" modulePath="/financeiro/lancamentos" title="Crédito pré-pago" description="Carteira de crédito para clientes.">
      <FinanceSection title="Nova carteira" kicker="Cadastro">
        <form
          className="catalog-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await createPrepaidWallet(form);
              await load();
              setForm({ holderName: '' });
              setAlert(successAlert('Carteira criada.'));
            } catch (err) {
              setAlert(errorAlert(err));
            }
          }}
        >
          <FinanceField label="Titular">
            <input
              className="premium-text-input"
              value={form.holderName}
              onChange={(e) => setForm({ ...form, holderName: e.target.value })}
              required
            />
          </FinanceField>
          <FinanceFormActions>
            <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary">
              Criar carteira
            </button>
          </FinanceFormActions>
        </form>
      </FinanceSection>

      <FinanceTable
        title="Carteiras cadastradas"
        headers={['Titular', 'Saldo']}
        rows={wallets.map((w) => [w.holderName, formatMoney(w.balance)])}
      />

      <FinanceSection title="Registrar movimento" kicker="Operação">
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
