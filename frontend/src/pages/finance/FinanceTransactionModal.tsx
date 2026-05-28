import React, { useEffect, useId, useRef, useState } from 'react';
import ModalPortal from '../../components/ModalPortal';
import PremiumSelect from '../../components/PremiumSelect';
import '../../components/AppModal.css';
import '../catalog/Catalog.css';
import './FinanceTransactionModal.css';
import type { FinanceTransaction, FinanceTransactionType } from '../../types/finance';

export type FinanceTxFormState = {
  type: FinanceTransactionType;
  description: string;
  amount: string;
  transactionDate: string;
  accountId: string;
  sourceId: string;
  categoryId: string;
  notes: string;
  tagIds: string[];
};

type Option = { value: string; label: string };

type FinanceTransactionModalProps = {
  isOpen: boolean;
  editing: FinanceTransaction | null;
  saving: boolean;
  form: FinanceTxFormState;
  accountOptions: Option[];
  sourceOptions: Option[];
  categoryOptions: Option[];
  onClose: () => void;
  onChange: (patch: Partial<FinanceTxFormState>) => void;
  onTypeChange: (type: FinanceTransactionType) => void;
  onFileChange: (file: File | null) => void;
  onSubmit: () => void | Promise<void>;
};

const FinanceTransactionModal: React.FC<FinanceTransactionModalProps> = ({
  isOpen,
  editing,
  saving,
  form,
  accountOptions,
  sourceOptions,
  categoryOptions,
  onClose,
  onChange,
  onTypeChange,
  onFileChange,
  onSubmit,
}) => {
  const fileInputId = useId().replace(/:/g, '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setFileName(null);
    }
  }, [isOpen]);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    onFileChange(file);
    setFileName(file?.name ?? null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSubmit();
  };

  return (
    <ModalPortal isOpen={isOpen}>
      <div
        className="app-modal-overlay"
        role="presentation"
        onClick={saving ? undefined : onClose}
      >
        <div
          className="app-modal finance-tx-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="finance-tx-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="app-modal-header">
            <div>
              <h3 id="finance-tx-modal-title">
                {editing ? 'Editar lançamento' : 'Novo lançamento'}
              </h3>
              <p className="app-modal-subtitle">
                Registre receita ou despesa com conta, categoria e comprovante opcional.
              </p>
            </div>
            <button
              type="button"
              className="app-modal-close"
              onClick={onClose}
              disabled={saving}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>

          <form className="finance-tx-modal-body" onSubmit={handleSubmit}>
            <div className="catalog-form-grid">
              <PremiumSelect
                label="Tipo"
                value={form.type}
                onChange={(v) => onTypeChange(v as FinanceTransactionType)}
                options={[
                  { value: 'expense', label: 'Despesa' },
                  { value: 'income', label: 'Receita' },
                ]}
              />
              <div className="form-group">
                <label htmlFor="finance-tx-date">Data</label>
                <input
                  id="finance-tx-date"
                  type="date"
                  className="premium-text-input"
                  value={form.transactionDate}
                  onChange={(e) => onChange({ transactionDate: e.target.value })}
                />
              </div>
              <div className="form-group form-group--full">
                <label htmlFor="finance-tx-description">Descrição</label>
                <input
                  id="finance-tx-description"
                  className="premium-text-input"
                  value={form.description}
                  onChange={(e) => onChange({ description: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="finance-tx-amount">Valor (R$)</label>
                <input
                  id="finance-tx-amount"
                  className="premium-text-input"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => onChange({ amount: e.target.value })}
                  required
                />
              </div>
              <PremiumSelect
                label="Conta"
                value={form.accountId}
                onChange={(v) => onChange({ accountId: v })}
                options={[{ value: '', label: '—' }, ...accountOptions]}
              />
              <PremiumSelect
                label="Fonte"
                value={form.sourceId}
                onChange={(v) => onChange({ sourceId: v })}
                options={[{ value: '', label: '—' }, ...sourceOptions]}
              />
              <PremiumSelect
                label="Categoria"
                value={form.categoryId}
                onChange={(v) => onChange({ categoryId: v })}
                options={[{ value: '', label: '—' }, ...categoryOptions]}
              />
            </div>

            <div className="form-group">
              <label htmlFor="finance-tx-notes">Observações</label>
              <textarea
                id="finance-tx-notes"
                className="premium-text-input"
                rows={2}
                value={form.notes}
                onChange={(e) => onChange({ notes: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label htmlFor={fileInputId}>Comprovante</label>
              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                className="catalog-photo-file-input"
                accept=".pdf,image/*,application/pdf"
                onChange={handleFileChange}
              />
              <button
                type="button"
                className="catalog-photo-choose-btn"
                onClick={openFilePicker}
                disabled={saving}
              >
                {fileName ? 'Trocar arquivo' : 'Escolher arquivo'}
              </button>
              {fileName ? (
                <p className="catalog-photo-hint finance-tx-modal__file-name">{fileName}</p>
              ) : null}
              <p className="catalog-photo-hint">PDF ou imagem · opcional</p>
            </div>

            <div className="app-modal-footer finance-tx-modal-footer">
              <button
                type="button"
                className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                onClick={onClose}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`catalog-form-footer-btn catalog-form-footer-btn--primary${saving ? ' is-loading' : ''}`}
                disabled={saving}
              >
                {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar lançamento'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default FinanceTransactionModal;
