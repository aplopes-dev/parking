import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import CatalogRegistryIconActions from '../../components/catalog/CatalogRegistryIconActions';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertModal from '../../components/AlertModal';
import ConfirmModal from '../../components/ConfirmModal';
import { AuthContext } from '../../contexts/AuthContext';
import {
  createFinanceAccount,
  createFinanceCategory,
  createFinanceSource,
  createFinanceTag,
  createFinanceTransaction,
  deleteFinanceAccount,
  deleteFinanceCategory,
  deleteFinanceSource,
  deleteFinanceTag,
  deleteFinanceTransaction,
  fetchFinanceOverview,
  updateFinanceAccount,
  updateFinanceCategory,
  updateFinanceSource,
  updateFinanceTag,
  updateFinanceTransaction,
} from '../../services/financeApi';
import type {
  FinanceAccount,
  FinanceAccountType,
  FinanceCategory,
  FinanceOverview,
  FinanceSource,
  FinanceTag,
  FinanceTransaction,
  FinanceTransactionType,
} from '../../types/finance';
import {
  FinanceSummaryBar,
  FinanceTransactionFilterBar,
  firstDayOfMonth,
  formatDateBr,
  formatMoney,
  todayIso,
  useFinanceAccess,
} from './financeShared';
import FinanceTransactionModal from './FinanceTransactionModal';
import FinanceMasterModal, { type FinanceMasterFormValues } from './FinanceMasterModal';
import {
  FINANCE_LANCAMENTOS_PATH,
  FINANCE_MODULE_LABEL,
  FINANCE_TAB_DESCRIPTIONS,
  FINANCE_TAB_LABELS,
  financePathForTab,
  financeTabFromPath,
  type FinanceMasterTab,
} from './financeTabRoutes';
import './Finance.css';

const ACCOUNT_TYPE_LABELS: Record<FinanceAccountType, string> = {
  bank: 'Banco',
  cash: 'Caixa',
  card: 'Cartão',
  digital: 'Digital',
  other: 'Outro',
};

const MASTER_ENTITY_LABEL: Record<Exclude<FinanceMasterTab, 'transactions'>, string> = {
  accounts: 'conta',
  sources: 'fonte',
  categories: 'categoria',
  tags: 'tag',
};

function masterValuesFromAccount(row: FinanceAccount): FinanceMasterFormValues {
  return {
    name: row.name,
    type: row.type,
    level: 'macro',
    description: row.description ?? '',
    color: '#2c4778',
    active: row.active,
  };
}

function masterValuesFromSource(row: FinanceSource): FinanceMasterFormValues {
  return {
    name: row.name,
    type: row.type,
    level: 'macro',
    description: '',
    color: '#2c4778',
    active: row.active,
  };
}

function masterValuesFromCategory(row: FinanceCategory): FinanceMasterFormValues {
  return {
    name: row.name,
    type: row.type,
    level: row.level,
    description: '',
    color: '#2c4778',
    active: row.active,
  };
}

function masterValuesFromTag(row: FinanceTag): FinanceMasterFormValues {
  return {
    name: row.name,
    type: 'expense',
    level: 'macro',
    description: '',
    color: row.color,
    active: row.active,
  };
}

const FinancePage: React.FC = () => {
  const { user } = useContext(AuthContext) || {};
  const { pathname } = useLocation();
  const tab = useMemo(() => financeTabFromPath(pathname), [pathname]);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [filterFrom, setFilterFrom] = useState(firstDayOfMonth());
  const [filterTo, setFilterTo] = useState(todayIso());
  const [filterType, setFilterType] = useState<'' | FinanceTransactionType>('');
  const [alert, setAlert] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });
  const [confirm, setConfirm] = useState<{
    open: boolean;
    message: string;
    onConfirm: () => Promise<void>;
  }>({ open: false, message: '', onConfirm: async () => {} });

  const [txModal, setTxModal] = useState(false);
  const [editingTx, setEditingTx] = useState<FinanceTransaction | null>(null);
  const [txForm, setTxForm] = useState({
    type: 'expense' as FinanceTransactionType,
    description: '',
    amount: '',
    transactionDate: todayIso(),
    accountId: '',
    sourceId: '',
    categoryId: '',
    notes: '',
    tagIds: [] as string[],
  });
  const [txFile, setTxFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const canManage = useFinanceAccess();
  const hasLoadedOnce = useRef(false);

  const load = useCallback(async () => {
    if (!canManage) return;
    const showFullLoader = !hasLoadedOnce.current;
    if (showFullLoader) setLoading(true);
    try {
      const data = await fetchFinanceOverview({
        from: filterFrom || undefined,
        to: filterTo || undefined,
        type: filterType || undefined,
      });
      setOverview(data);
      hasLoadedOnce.current = true;
    } catch {
      setAlert({ open: true, message: 'Erro ao carregar dados financeiros.' });
    } finally {
      setLoading(false);
    }
  }, [canManage, filterFrom, filterTo, filterType]);

  useEffect(() => {
    load();
  }, [load]);

  const accountOptions = useMemo(
    () =>
      (overview?.accounts ?? [])
        .filter((a) => a.active)
        .map((a) => ({ value: a.id, label: a.name })),
    [overview?.accounts],
  );

  const sourcesForType = useCallback(
    (type: FinanceTransactionType) =>
      (overview?.sources ?? []).filter((s) => s.active && s.type === type),
    [overview?.sources],
  );

  const categoriesForType = useCallback(
    (type: FinanceTransactionType) =>
      (overview?.categories ?? []).filter((c) => c.active && c.type === type),
    [overview?.categories],
  );

  const txSourceOptions = useMemo(
    () =>
      sourcesForType(txForm.type).map((s) => ({
        value: s.id,
        label: s.name,
      })),
    [sourcesForType, txForm.type],
  );

  const txCategoryOptions = useMemo(
    () =>
      categoriesForType(txForm.type).map((c) => ({
        value: c.id,
        label: c.name,
      })),
    [categoriesForType, txForm.type],
  );

  const openNewTx = () => {
    setEditingTx(null);
    setTxForm({
      type: 'expense',
      description: '',
      amount: '',
      transactionDate: todayIso(),
      accountId: '',
      sourceId: '',
      categoryId: '',
      notes: '',
      tagIds: [],
    });
    setTxFile(null);
    setTxModal(true);
  };

  const openEditTx = (tx: FinanceTransaction) => {
    setEditingTx(tx);
    setTxForm({
      type: tx.type,
      description: tx.description,
      amount: String(tx.amount),
      transactionDate: tx.transactionDate.slice(0, 10),
      accountId: tx.accountId ?? '',
      sourceId: tx.sourceId ?? '',
      categoryId: tx.categoryId ?? '',
      notes: tx.notes ?? '',
      tagIds: (tx.tags ?? []).map((t) => t.id),
    });
    setTxFile(null);
    setTxModal(true);
  };

  const saveTx = async () => {
    if (!txForm.description.trim() || !txForm.amount) {
      setAlert({ open: true, message: 'Preencha descrição e valor.' });
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('type', txForm.type);
      fd.append('description', txForm.description.trim());
      fd.append('amount', txForm.amount.replace(',', '.'));
      fd.append('transactionDate', txForm.transactionDate);
      if (txForm.accountId) fd.append('accountId', txForm.accountId);
      if (txForm.sourceId) fd.append('sourceId', txForm.sourceId);
      if (txForm.categoryId) fd.append('categoryId', txForm.categoryId);
      if (txForm.notes) fd.append('notes', txForm.notes);
      if (txForm.tagIds.length) {
        fd.append('tagIds', JSON.stringify(txForm.tagIds));
      }
      if (txFile) fd.append('attachment', txFile);

      if (editingTx) {
        await updateFinanceTransaction(editingTx.id, fd);
      } else {
        await createFinanceTransaction(fd);
      }
      setTxModal(false);
      await load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Erro ao salvar lançamento.';
      setAlert({ open: true, message: msg });
    } finally {
      setSaving(false);
    }
  };

  const removeTx = (tx: FinanceTransaction) => {
    setConfirm({
      open: true,
      message: `Excluir lançamento "${tx.description}"?`,
      onConfirm: async () => {
        await deleteFinanceTransaction(tx.id);
        await load();
      },
    });
  };

  const [masterModal, setMasterModal] = useState(false);
  const [masterSaving, setMasterSaving] = useState(false);
  const [editingMasterId, setEditingMasterId] = useState<string | null>(null);
  const [masterInitialValues, setMasterInitialValues] = useState<FinanceMasterFormValues | null>(null);

  const openMasterModal = () => {
    setEditingMasterId(null);
    setMasterInitialValues(null);
    setMasterModal(true);
  };

  const openEditMaster = (row: FinanceAccount | FinanceSource | FinanceCategory | FinanceTag) => {
    if (tab === 'transactions') return;
    setEditingMasterId(row.id);
    if (tab === 'accounts') {
      setMasterInitialValues(masterValuesFromAccount(row as FinanceAccount));
    } else if (tab === 'sources') {
      setMasterInitialValues(masterValuesFromSource(row as FinanceSource));
    } else if (tab === 'categories') {
      setMasterInitialValues(masterValuesFromCategory(row as FinanceCategory));
    } else {
      setMasterInitialValues(masterValuesFromTag(row as FinanceTag));
    }
    setMasterModal(true);
  };

  const closeMasterModal = () => {
    if (masterSaving) return;
    setMasterModal(false);
    setEditingMasterId(null);
    setMasterInitialValues(null);
  };

  const saveMaster = async (values: FinanceMasterFormValues) => {
    if (!values.name.trim()) return;
    setMasterSaving(true);
    try {
      if (editingMasterId) {
        if (tab === 'accounts') {
          await updateFinanceAccount(editingMasterId, {
            name: values.name.trim(),
            type: (values.type as FinanceAccount['type']) || 'bank',
            description: values.description.trim() || undefined,
            active: values.active,
          });
        } else if (tab === 'sources') {
          await updateFinanceSource(editingMasterId, {
            name: values.name.trim(),
            type: (values.type as FinanceTransactionType) || 'expense',
            active: values.active,
          });
        } else if (tab === 'categories') {
          await updateFinanceCategory(editingMasterId, {
            name: values.name.trim(),
            type: (values.type as FinanceTransactionType) || 'expense',
            level: (values.level as FinanceCategory['level']) || 'macro',
            active: values.active,
          });
        } else if (tab === 'tags') {
          await updateFinanceTag(editingMasterId, {
            name: values.name.trim(),
            color: values.color,
            active: values.active,
          });
        }
      } else if (tab === 'accounts') {
        await createFinanceAccount({
          name: values.name.trim(),
          type: (values.type as FinanceAccount['type']) || 'bank',
          description: values.description.trim() || undefined,
          active: true,
        });
      } else if (tab === 'sources') {
        await createFinanceSource({
          name: values.name.trim(),
          type: (values.type as FinanceTransactionType) || 'expense',
          active: true,
        });
      } else if (tab === 'categories') {
        await createFinanceCategory({
          name: values.name.trim(),
          type: (values.type as FinanceTransactionType) || 'expense',
          level: (values.level as FinanceCategory['level']) || 'macro',
          active: true,
        });
      } else if (tab === 'tags') {
        await createFinanceTag({ name: values.name.trim(), color: values.color, active: true });
      }
      setMasterModal(false);
      setEditingMasterId(null);
      setMasterInitialValues(null);
      await load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Erro ao salvar cadastro.';
      setAlert({ open: true, message: msg });
    } finally {
      setMasterSaving(false);
    }
  };

  const deleteMaster = (id: string, kind: FinanceMasterTab, label: string) => {
    setConfirm({
      open: true,
      message: `Excluir "${label}"?`,
      onConfirm: async () => {
        if (kind === 'accounts') await deleteFinanceAccount(id);
        else if (kind === 'sources') await deleteFinanceSource(id);
        else if (kind === 'categories') await deleteFinanceCategory(id);
        else await deleteFinanceTag(id);
        await load();
      },
    });
  };

  if (!canManage) {
    return (
      <CatalogPageLayout className="finance-page" moduleLabel="Financeiro" title="Gestão financeira">
        <p>Sem permissão para este módulo.</p>
      </CatalogPageLayout>
    );
  }

  return (
    <CatalogPageLayout
      className="finance-page"
      moduleLabel={FINANCE_MODULE_LABEL}
      modulePath={FINANCE_LANCAMENTOS_PATH}
      title={FINANCE_TAB_LABELS[tab]}
      description={FINANCE_TAB_DESCRIPTIONS[tab]}
      actions={
        tab === 'transactions' ? (
          <button
            type="button"
            className="catalog-action-button"
            onClick={(e) => {
              e.preventDefault();
              openNewTx();
            }}
          >
            Novo lançamento
          </button>
        ) : (
          <button
            type="button"
            className="catalog-action-button"
            onClick={openMasterModal}
          >
            {tab === 'accounts' ? 'Nova conta' : tab === 'sources' ? 'Nova fonte' : tab === 'categories' ? 'Nova categoria' : 'Nova tag'}
          </button>
        )
      }
    >
      <FinanceSummaryBar summary={overview?.summary} />

      <nav className="finance-tabs" role="tablist" aria-label="Seções financeiras">
        {(Object.keys(FINANCE_TAB_LABELS) as FinanceMasterTab[]).map((key) => (
          <NavLink
            key={key}
            to={financePathForTab(key)}
            role="tab"
            className={({ isActive }) => `finance-tab${isActive ? ' finance-tab--active' : ''}`}
            aria-current={tab === key ? 'page' : undefined}
          >
            {FINANCE_TAB_LABELS[key]}
          </NavLink>
        ))}
      </nav>

      {loading ? (
        <LoadingSpinner />
      ) : tab === 'transactions' && overview ? (
        <>
          <FinanceTransactionFilterBar
            from={filterFrom}
            to={filterTo}
            type={filterType}
            onFrom={setFilterFrom}
            onTo={setFilterTo}
            onType={(v) => setFilterType(v as '' | FinanceTransactionType)}
          />
          <section className="catalog-surface finance-list-panel" aria-labelledby="finance-tx-list-title">
            <h2 id="finance-tx-list-title" className="finance-list-panel__title">
              Lançamentos no período
            </h2>
            {overview.transactions.length === 0 ? (
              <p className="catalog-empty">Nenhum lançamento no período.</p>
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
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Tipo</th>
                      <th>Valor</th>
                      <th>Conta</th>
                      <th className="catalog-data-table__actions">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>{formatDateBr(tx.transactionDate)}</td>
                        <td>{tx.description}</td>
                        <td>
                          <span
                            className="catalog-pill catalog-pill--sm is-muted"
                          >
                            {tx.type === 'income' ? 'Receita' : 'Despesa'}
                          </span>
                        </td>
                        <td>
                          {formatMoney(tx.amount)}
                        </td>
                        <td>{tx.account?.name ?? '—'}</td>
                        <td className="catalog-data-table__actions finance-table-actions">
                          <div className="catalog-data-table__actions-group">
                            <CatalogRegistryIconActions
                              editLabel={`Editar lançamento ${tx.description}`}
                              deleteLabel={`Excluir lançamento ${tx.description}`}
                              onEdit={() => openEditTx(tx)}
                              onDelete={() => removeTx(tx)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : overview && tab !== 'transactions' ? (
        <MasterRegistryPanel
          tab={tab}
          rows={
            tab === 'accounts'
              ? overview.accounts
              : tab === 'sources'
                ? overview.sources
                : tab === 'categories'
                  ? overview.categories
                  : overview.tags
          }
          onEdit={openEditMaster}
          onDelete={(row) => deleteMaster(row.id, tab, row.name)}
        />
      ) : null}

      <FinanceTransactionModal
        isOpen={txModal}
        editing={editingTx}
        saving={saving}
        form={txForm}
        accountOptions={accountOptions}
        sourceOptions={txSourceOptions}
        categoryOptions={txCategoryOptions}
        onClose={() => setTxModal(false)}
        onChange={(patch) => setTxForm((f) => ({ ...f, ...patch }))}
        onTypeChange={(type) =>
          setTxForm((f) => ({
            ...f,
            type,
            sourceId: '',
            categoryId: '',
          }))
        }
        onFileChange={setTxFile}
        onSubmit={saveTx}
      />

      {tab !== 'transactions' && (
        <FinanceMasterModal
          isOpen={masterModal}
          kind={tab as Exclude<FinanceMasterTab, 'transactions'>}
          editingId={editingMasterId}
          initialValues={masterInitialValues}
          isSaving={masterSaving}
          onClose={closeMasterModal}
          onSubmit={saveMaster}
        />
      )}

      <AlertModal
        isOpen={alert.open}
        message={alert.message}
        type="error"
        onClose={() => setAlert({ open: false, message: '' })}
      />
      <ConfirmModal
        isOpen={confirm.open}
        message={confirm.message}
        variant="danger"
        onConfirm={async () => {
          await confirm.onConfirm();
          setConfirm({ open: false, message: '', onConfirm: async () => {} });
        }}
        onClose={() => setConfirm({ open: false, message: '', onConfirm: async () => {} })}
      />
    </CatalogPageLayout>
  );
};

type MasterRow = { id: string; name: string; active: boolean };

function masterDetail(
  tab: Exclude<FinanceMasterTab, 'transactions'>,
  row: FinanceAccount | FinanceSource | FinanceCategory | FinanceTag,
): React.ReactNode {
  if (tab === 'accounts') {
    const account = row as FinanceAccount;
    return ACCOUNT_TYPE_LABELS[account.type] ?? account.type;
  }
  if (tab === 'sources') {
    return (row as FinanceSource).type === 'income' ? 'Receita' : 'Despesa';
  }
  if (tab === 'categories') {
    const category = row as FinanceCategory;
    return `${category.level} · ${category.type === 'income' ? 'Receita' : 'Despesa'}`;
  }
  return <span className="finance-tag-swatch" style={{ background: (row as FinanceTag).color }} aria-hidden />;
}

function MasterRegistryPanel(props: {
  tab: Exclude<FinanceMasterTab, 'transactions'>;
  rows: (FinanceAccount | FinanceSource | FinanceCategory | FinanceTag)[];
  onEdit: (row: FinanceAccount | FinanceSource | FinanceCategory | FinanceTag) => void;
  onDelete: (row: MasterRow) => void;
}) {
  const entity = MASTER_ENTITY_LABEL[props.tab];
  const nameLabel =
    props.tab === 'accounts'
      ? 'Conta'
      : props.tab === 'sources'
        ? 'Fonte'
        : props.tab === 'categories'
          ? 'Categoria'
          : 'Tag';

  return (
    <section className="catalog-registry-panel" aria-labelledby="finance-master-panel-title">
      <header className="catalog-registry-panel__header">
        <div>
          <h2 id="finance-master-panel-title">{FINANCE_TAB_LABELS[props.tab]} cadastradas</h2>
          <p className="catalog-registry-panel__meta">{props.rows.length} registro(s)</p>
        </div>
      </header>

      {props.rows.length === 0 ? (
        <div className="catalog-empty">Nenhum registro cadastrado.</div>
      ) : (
        <div className="catalog-registry-table catalog-registry-table--finance-master">
          <div className="catalog-registry-table__head" role="row">
            <span>{nameLabel}</span>
            <span>Detalhe</span>
            <span>Status</span>
            <span>Ações</span>
          </div>
          <ul className="catalog-registry-list" aria-label={`Lista de ${FINANCE_TAB_LABELS[props.tab].toLowerCase()}`}>
            {props.rows.map((row) => (
              <li key={row.id} className="catalog-registry-row">
                <div className="catalog-registry-main">
                  <span className="catalog-registry-name">{row.name}</span>
                </div>

                <span className="catalog-registry-desc">{masterDetail(props.tab, row)}</span>

                <div className="catalog-registry-status">
                  <span className="catalog-pill is-muted">{row.active ? 'Ativo' : 'Inativo'}</span>
                </div>

                <CatalogRegistryIconActions
                  editLabel={`Editar ${entity} ${row.name}`}
                  deleteLabel={`Excluir ${entity} ${row.name}`}
                  onEdit={() => props.onEdit(row)}
                  onDelete={() => props.onDelete(row)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default FinancePage;
