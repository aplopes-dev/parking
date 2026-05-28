import React, { useContext } from 'react';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import { AuthContext } from '../../contexts/AuthContext';
import '../catalog/Catalog.css';
import '../finance/Finance.css';
import './Analytics.css';

export const ANALYTICS_MODULE_LABEL = 'Analytics';

/** Primeira rota do módulo (breadcrumb “voltar”). */
export const ANALYTICS_HOME_PATH = '/analytics/tempo-real';

export const REPORTS_MODULE_LABEL = 'Relatórios';

export const REPORTS_HOME_PATH = '/relatorios';

export function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatPct(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function firstDayOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function useAnalyticsAccess() {
  const { user } = useContext(AuthContext) || {};
  return Boolean(user);
}

export function errMsg(e: unknown): string {
  const ax = e as { response?: { data?: { message?: string | string[] } } };
  const m = ax.response?.data?.message;
  if (Array.isArray(m)) return m.join(', ');
  return (typeof m === 'string' ? m : null) || 'Erro ao carregar dados.';
}

export function AccessDenied({ moduleLabel = ANALYTICS_MODULE_LABEL }: { moduleLabel?: string }) {
  return (
    <CatalogPageLayout className="finance-page" moduleLabel={moduleLabel} title={moduleLabel}>
      <p className="catalog-empty">Acesso negado.</p>
    </CatalogPageLayout>
  );
}

export const ORDER_TYPE_LABEL: Record<string, string> = {
  balcao: 'Balcão',
  comanda: 'Comanda',
  delivery: 'Delivery',
  tablet: 'Tablet',
  online: 'Online',
};

export const PAYMENT_LABEL: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_debito: 'Débito',
  cartao_credito: 'Crédito',
  vale: 'Vale',
};

export const AnalyticsPeriodBar: React.FC<{
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  extra?: React.ReactNode;
}> = ({ from, to, onFrom, onTo, extra }) => (
  <section className="finance-toolbar" aria-label="Período">
    <div className="form-group">
      <label htmlFor="analytics-filter-from">De</label>
      <input
        id="analytics-filter-from"
        type="date"
        className="premium-text-input"
        value={from}
        onChange={(e) => onFrom(e.target.value)}
      />
    </div>
    <div className="form-group">
      <label htmlFor="analytics-filter-to">Até</label>
      <input
        id="analytics-filter-to"
        type="date"
        className="premium-text-input"
        value={to}
        onChange={(e) => onTo(e.target.value)}
      />
    </div>
    {extra ? <div className="finance-toolbar__actions">{extra}</div> : null}
  </section>
);

export const AnalyticsField: React.FC<{
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

export const AnalyticsSection: React.FC<{
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

export const AnalyticsFormActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="catalog-form-footer finance-form-actions">{children}</div>
);

type AnalyticsPageLayoutProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export const AnalyticsPageLayout: React.FC<AnalyticsPageLayoutProps> = ({
  title,
  description,
  actions,
  children,
}) => (
  <CatalogPageLayout
    className="finance-page"
    moduleLabel={ANALYTICS_MODULE_LABEL}
    modulePath={ANALYTICS_HOME_PATH}
    title={title}
    description={description}
    actions={actions}
  >
    {children}
  </CatalogPageLayout>
);

export const ReportsPageLayout: React.FC<AnalyticsPageLayoutProps> = ({
  title,
  description,
  actions,
  children,
}) => (
  <CatalogPageLayout
    className="finance-page"
    moduleLabel={REPORTS_MODULE_LABEL}
    modulePath={REPORTS_HOME_PATH}
    title={title}
    description={description}
    actions={actions}
  >
    {children}
  </CatalogPageLayout>
);

export function MetricCards({
  items,
  label = 'Indicadores',
}: {
  items: { label: string; value: string; hint?: string; sub?: string }[];
  label?: string;
}) {
  return (
    <section className="catalog-stats-grid" aria-label={label}>
      {items.map((item) => (
        <article key={item.label} className="catalog-stat-card">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.sub ? <p>{item.sub}</p> : null}
          {item.hint ? <p>{item.hint}</p> : null}
        </article>
      ))}
    </section>
  );
}

export function AnalyticsTable({
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
        <p className="catalog-empty finance-empty">Nenhum dado no período.</p>
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

export function SimpleBarChart({
  data,
  labelKey,
  valueKey,
}: {
  data: { [key: string]: string | number }[];
  labelKey: string;
  valueKey: string;
}) {
  const max = Math.max(...data.map((d) => Number(d[valueKey])), 1);
  if (!data.length) {
    return <p className="catalog-empty">Nenhum dado no período.</p>;
  }
  return (
    <div className="analytics-bars">
      {data.map((row, i) => (
        <div key={i} className="analytics-bar-row">
          <span className="analytics-bar-label">{String(row[labelKey])}</span>
          <div className="analytics-bar-track">
            <div
              className="analytics-bar-fill"
              style={{ width: `${(Number(row[valueKey]) / max) * 100}%` }}
            />
          </div>
          <span className="analytics-bar-value">{Number(row[valueKey]).toLocaleString('pt-BR')}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Shared report components (print-friendly) ── */

export function formatDateLabel(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function ReportTable({
  title,
  headers,
  rows,
  footer,
}: {
  title: string;
  headers: string[];
  rows: React.ReactNode[][];
  footer?: React.ReactNode[];
}) {
  return (
    <section className="report-section">
      <h3 className="report-section__title">{title}</h3>
      {!rows.length ? (
        <p className="report-empty">Nenhum dado no período.</p>
      ) : (
        <table className="report-table">
          <thead>
            <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((cells, i) => (
              <tr key={i}>{cells.map((c, j) => <td key={j}>{c}</td>)}</tr>
            ))}
          </tbody>
          {footer && (
            <tfoot>
              <tr>{footer.map((c, j) => <td key={j}>{c}</td>)}</tr>
            </tfoot>
          )}
        </table>
      )}
    </section>
  );
}

export function ReportSummaryCards({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="report-summary-cards">
      {items.map((item) => (
        <div key={item.label} className="report-summary-card">
          <span className="report-summary-card__label">{item.label}</span>
          <strong className="report-summary-card__value">{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function ReportPrintHeader({
  title,
  subtitle,
  meta,
}: {
  title: string;
  subtitle?: string;
  meta?: { label: string; value: string }[];
}) {
  return (
    <header className="print-only report-header">
      <div className="report-header__top">
        <div>
          <h1 className="report-header__title">{title}</h1>
          {subtitle && <p className="report-header__subtitle">{subtitle}</p>}
        </div>
        <p className="report-header__date">Emitido em {new Date().toLocaleDateString('pt-BR')}</p>
      </div>
      {meta && meta.length > 0 && (
        <div className="report-header__meta">
          {meta.map((m) => (
            <span key={m.label}><strong>{m.label}:</strong> {m.value}</span>
          ))}
        </div>
      )}
    </header>
  );
}

export function ReportPrintFooter() {
  return (
    <footer className="print-only report-footer">
      <div className="report-footer__line" />
      <p>Relatório gerado automaticamente pelo sistema em {new Date().toLocaleString('pt-BR')}. Dados sujeitos a atualização.</p>
    </footer>
  );
}
