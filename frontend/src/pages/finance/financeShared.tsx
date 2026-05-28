import React, { useCallback, useContext, useEffect, useState } from 'react';
import PremiumSelect from '../../components/PremiumSelect';
import { AuthContext } from '../../contexts/AuthContext';
import { fetchFinanceOverview } from '../../services/financeApi';
import type { FinanceOverview, FinanceTransactionType } from '../../types/finance';

export function formatMoney(value: number | string): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function firstDayOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Data ISO (yyyy-mm-dd) → dd/mm/aaaa para tabelas. */
export function formatDateBr(iso: string): string {
  const part = iso.slice(0, 10);
  const [y, m, d] = part.split('-');
  if (!y || !m || !d) return part;
  return `${d}/${m}/${y}`;
}

export function useFinanceAccess() {
  const { user } = useContext(AuthContext) || {};
  return Boolean(user);
}

export function useFinanceMasterData() {
  const [data, setData] = useState<FinanceOverview | null>(null);
  const can = useFinanceAccess();

  const reload = useCallback(async () => {
    if (!can) return;
    const overview = await fetchFinanceOverview({ from: firstDayOfMonth(), to: todayIso() });
    setData(overview);
  }, [can]);

  useEffect(() => {
    reload().catch(() => setData(null));
  }, [reload]);

  return { data, reload, accounts: data?.accounts ?? [], categories: data?.categories ?? [] };
}

type SummaryProps = { summary?: FinanceOverview['summary'] };

export const FinanceSummaryBar: React.FC<SummaryProps> = ({ summary }) => {
  if (!summary) return null;
  return (
    <section className="catalog-stats-grid" aria-label="Resumo financeiro">
      <article className="catalog-stat-card">
        <span>Receitas</span>
        <strong>{formatMoney(summary.totalIncome)}</strong>
        <p>Total no intervalo dos filtros.</p>
      </article>
      <article className="catalog-stat-card">
        <span>Despesas</span>
        <strong>{formatMoney(summary.totalExpense)}</strong>
        <p>Total no intervalo dos filtros.</p>
      </article>
      <article className="catalog-stat-card">
        <span>Saldo</span>
        <strong>{formatMoney(summary.balance)}</strong>
        <p>Receitas menos despesas no período.</p>
      </article>
    </section>
  );
};

type PeriodProps = {
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  extra?: React.ReactNode;
};

export const FinancePeriodBar: React.FC<PeriodProps> = ({ from, to, onFrom, onTo, extra }) => (
  <section className="finance-toolbar" aria-label="Período">
    <div className="form-group">
      <label htmlFor="finance-filter-from">De</label>
      <input
        id="finance-filter-from"
        type="date"
        className="premium-text-input"
        value={from}
        onChange={(e) => onFrom(e.target.value)}
      />
    </div>
    <div className="form-group">
      <label htmlFor="finance-filter-to">Até</label>
      <input
        id="finance-filter-to"
        type="date"
        className="premium-text-input"
        value={to}
        onChange={(e) => onTo(e.target.value)}
      />
    </div>
    {extra ? <div className="finance-toolbar__actions">{extra}</div> : null}
  </section>
);

type TransactionFilterProps = {
  from: string;
  to: string;
  type: '' | FinanceTransactionType;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onType: (v: string) => void;
};

export const FinanceTransactionFilterBar: React.FC<TransactionFilterProps> = ({
  from,
  to,
  type,
  onFrom,
  onTo,
  onType,
}) => (
  <section className="finance-toolbar" aria-label="Filtrar lançamentos do período">
    <div className="form-group">
      <label htmlFor="finance-tx-from">De</label>
      <input
        id="finance-tx-from"
        type="date"
        className="premium-text-input"
        value={from}
        onChange={(e) => onFrom(e.target.value)}
      />
    </div>
    <div className="form-group">
      <label htmlFor="finance-tx-to">Até</label>
      <input
        id="finance-tx-to"
        type="date"
        className="premium-text-input"
        value={to}
        onChange={(e) => onTo(e.target.value)}
      />
    </div>
    <PremiumSelect
      label="Tipo"
      value={type}
      onChange={(v) => onType(v)}
      options={[
        { value: '', label: 'Todos' },
        { value: 'income', label: 'Receita' },
        { value: 'expense', label: 'Despesa' },
      ]}
    />
  </section>
);

export const FinanceField: React.FC<{
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, htmlFor, children, className }) => (
  <div className={`form-group finance-field ${className ?? ''}`.trim()}>
    <label htmlFor={htmlFor}>{label}</label>
    {children}
  </div>
);

export const FinanceSection: React.FC<{
  title: string;
  kicker?: string;
  children: React.ReactNode;
}> = ({ title, kicker, children }) => (
  <section className="catalog-surface catalog-form-surface--premium finance-section">
    <div className="catalog-section-header">
      <div>
        {kicker ? <span className="catalog-section-kicker">{kicker}</span> : null}
        <h2>{title}</h2>
      </div>
    </div>
    {children}
  </section>
);

export const FinanceFormActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="catalog-form-footer finance-form-actions">{children}</div>
);

export const FinanceListPanel: React.FC<{
  title?: string;
  children: React.ReactNode;
  loading?: boolean;
}> = ({ title, children, loading }) => (
  <section className="catalog-surface finance-list-panel">
    {title ? <h2 className="finance-list-panel__title">{title}</h2> : null}
    {loading ? children : children}
  </section>
);
