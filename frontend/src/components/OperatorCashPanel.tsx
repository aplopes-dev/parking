import React from 'react';
import PremiumSelect from './PremiumSelect';
import '../pages/catalog/Catalog.css';

export type OperatorCashAccountOption = { value: string; label: string };

export type OperatorCashPanelProps = {
  isOpen: boolean;
  accountOptions: OperatorCashAccountOption[];
  accountId: string;
  onAccountIdChange: (value: string) => void;
  openingBalance: string;
  onOpeningBalanceChange: (value: string) => void;
  countedBalance: string;
  onCountedBalanceChange: (value: string) => void;
  onOpen: () => void;
  onClose: () => void;
  openStatusLine?: string;
  summaryLine?: string;
  closedHint?: string;
  title?: string;
};

const OperatorCashPanel: React.FC<OperatorCashPanelProps> = ({
  isOpen,
  accountOptions,
  accountId,
  onAccountIdChange,
  openingBalance,
  onOpeningBalanceChange,
  countedBalance,
  onCountedBalanceChange,
  onOpen,
  onClose,
  openStatusLine,
  summaryLine,
  closedHint = 'Abra o caixa para registrar operações.',
  title = 'Caixa do operador',
}) => (
  <section className="catalog-surface catalog-operation-panel">
    <header className="catalog-operation-panel__header">
      <div>
        <h2 className="catalog-operation-panel__title">{title}</h2>
        {isOpen ? (
          <>
            {openStatusLine ? (
              <p className="catalog-registry-panel__meta">{openStatusLine}</p>
            ) : null}
            {summaryLine ? <p className="catalog-registry-panel__meta">{summaryLine}</p> : null}
          </>
        ) : (
          <p className="catalog-registry-panel__meta">{closedHint}</p>
        )}
      </div>
    </header>

    <div className="catalog-toolbar catalog-filter-toolbar">
      {!isOpen ? (
        <PremiumSelect
          label="Conta caixa"
          value={accountId}
          options={accountOptions}
          wrapperClassName="form-group catalog-filter-toolbar__field"
          onChange={onAccountIdChange}
        />
      ) : null}
      <div className="form-group catalog-filter-toolbar__field">
        <label htmlFor="operator-cash-amount">{isOpen ? 'Valor contado' : 'Saldo inicial'}</label>
        <input
          id="operator-cash-amount"
          type="number"
          min={0}
          step="0.01"
          className="premium-text-input"
          value={isOpen ? countedBalance : openingBalance}
          onChange={(e) =>
            isOpen ? onCountedBalanceChange(e.target.value) : onOpeningBalanceChange(e.target.value)
          }
          placeholder="0,00"
        />
      </div>
      {isOpen ? (
        <button
          type="button"
          className="catalog-form-footer-btn catalog-form-footer-btn--ghost catalog-filter-toolbar__action"
          onClick={onClose}
        >
          Fechar caixa
        </button>
      ) : (
        <button
          type="button"
          className="catalog-form-footer-btn catalog-form-footer-btn--primary catalog-filter-toolbar__action"
          onClick={onOpen}
        >
          Abrir caixa
        </button>
      )}
    </div>
  </section>
);

export default OperatorCashPanel;
