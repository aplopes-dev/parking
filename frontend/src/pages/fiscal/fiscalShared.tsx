import React, { useContext, useId, useRef } from 'react';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import { AuthContext } from '../../contexts/AuthContext';
import '../catalog/Catalog.css';
import '../finance/Finance.css';

export const FISCAL_MODULE_LABEL = 'Fiscal';

/** Primeira rota do módulo (breadcrumb “voltar”). */
export const FISCAL_HOME_PATH = '/fiscal/pedidos';

export function formatMoney(value: number | string): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useFiscalAccess() {
  const { user } = useContext(AuthContext) || {};
  return Boolean(user);
}

export function errMsg(e: unknown): string {
  const ax = e as { response?: { data?: { message?: string | string[] } } };
  const m = ax.response?.data?.message;
  if (Array.isArray(m)) return m.join(', ');
  return (typeof m === 'string' ? m : null) || 'Erro ao processar solicitação.';
}

export function AccessDenied() {
  return (
    <CatalogPageLayout className="finance-page" moduleLabel={FISCAL_MODULE_LABEL} title="Fiscal">
      <p className="catalog-empty">Acesso negado.</p>
    </CatalogPageLayout>
  );
}

export const FiscalField: React.FC<{
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

export const FiscalSection: React.FC<{
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

export const FiscalFormActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="catalog-form-footer finance-form-actions">{children}</div>
);

type FiscalPageLayoutProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export const FiscalPageLayout: React.FC<FiscalPageLayoutProps> = ({
  title,
  description,
  actions,
  children,
}) => (
  <CatalogPageLayout
    className="finance-page"
    moduleLabel={FISCAL_MODULE_LABEL}
    modulePath={FISCAL_HOME_PATH}
    title={title}
    description={description}
    actions={actions}
  >
    {children}
  </CatalogPageLayout>
);

export function FiscalTable({
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

/** Campo de arquivo XML (padrão catálogo). */
export const FiscalFileField: React.FC<{
  label: string;
  accept?: string;
  hint?: string;
  fileName: string | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}> = ({ label, accept = '.xml', hint, fileName, onFileChange, disabled }) => {
  const inputId = useId().replace(/:/g, '');
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <FiscalField label={label} htmlFor={inputId}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="catalog-photo-file-input"
        accept={accept}
        disabled={disabled}
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        className="catalog-photo-choose-btn"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {fileName ? 'Trocar arquivo' : 'Escolher arquivo'}
      </button>
      {fileName ? <p className="catalog-photo-hint">{fileName}</p> : null}
      {hint ? <p className="catalog-photo-hint">{hint}</p> : null}
    </FiscalField>
  );
};

export const ORDER_TYPE_LABEL: Record<string, string> = {
  sale: 'Venda',
  purchase: 'Compra',
};

export const INVOICE_TYPE_LABEL: Record<string, string> = {
  nfe: 'NF-e',
  nfce: 'NFC-e',
};

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  processing: 'Processando',
  authorized: 'Autorizada',
  rejected: 'Rejeitada',
  voided: 'Inutilizada',
};
