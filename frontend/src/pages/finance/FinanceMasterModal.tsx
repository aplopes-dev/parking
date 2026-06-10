import React, { useEffect, useMemo, useState } from 'react';
import ModalPortal from '../../components/ModalPortal';
import PremiumSelect from '../../components/PremiumSelect';
import type { FinanceMasterTab } from './financeTabRoutes';
import '../../components/AppModal.css';
import '../catalog/ProductGroupFormModal.css';

type MasterKind = Exclude<FinanceMasterTab, 'transactions'>;

export type FinanceMasterFormValues = {
  name: string;
  type: string;
  level: string;
  description: string;
  color: string;
  active: boolean;
};

interface FinanceMasterModalProps {
  isOpen: boolean;
  kind: MasterKind;
  editingId?: string | null;
  initialValues?: FinanceMasterFormValues | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: FinanceMasterFormValues) => void | Promise<void>;
}

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'bank', label: 'Banco' },
  { value: 'cash', label: 'Caixa' },
  { value: 'card', label: 'Cartão' },
  { value: 'digital', label: 'Digital' },
  { value: 'other', label: 'Outro' },
];

const TX_TYPE_OPTIONS = [
  { value: 'expense', label: 'Despesa' },
  { value: 'income', label: 'Receita' },
];

const CATEGORY_LEVEL_OPTIONS = [
  { value: 'macro', label: 'Macro' },
  { value: 'sub', label: 'Sub-categoria' },
];

const CREATE_TITLE: Record<MasterKind, string> = {
  accounts: 'Nova conta financeira',
  sources: 'Nova fonte',
  categories: 'Nova categoria',
  tags: 'Nova tag',
};

const EDIT_TITLE: Record<MasterKind, string> = {
  accounts: 'Editar conta financeira',
  sources: 'Editar fonte',
  categories: 'Editar categoria',
  tags: 'Editar tag',
};

const SUBTITLE: Record<MasterKind, string> = {
  accounts: 'Cadastre uma conta para organizar seus lançamentos.',
  sources: 'Cadastre uma fonte de receita ou despesa.',
  categories: 'Cadastre uma categoria para classificar lançamentos.',
  tags: 'Cadastre uma tag opcional para lançamentos.',
};

const emptyValues = (): FinanceMasterFormValues => ({
  name: '',
  type: 'bank',
  level: 'macro',
  description: '',
  color: '#2c4778',
  active: true,
});

const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Ativo' },
  { value: 'false', label: 'Inativo' },
];

const FinanceMasterModal: React.FC<FinanceMasterModalProps> = ({
  isOpen,
  kind,
  editingId = null,
  initialValues = null,
  isSaving,
  onClose,
  onSubmit,
}) => {
  const [values, setValues] = useState<FinanceMasterFormValues>(emptyValues);
  const isEditing = Boolean(editingId);

  useEffect(() => {
    if (!isOpen) return;
    if (initialValues) {
      setValues(initialValues);
      return;
    }
    const v = emptyValues();
    if (kind === 'sources' || kind === 'categories') v.type = 'expense';
    setValues(v);
  }, [isOpen, kind, initialValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSubmit(values);
  };

  const modalTitle = isEditing ? EDIT_TITLE[kind] : CREATE_TITLE[kind];

  const submitLabel = useMemo(() => {
    if (isEditing) return 'Salvar alterações';
    const labels: Record<MasterKind, string> = {
      accounts: 'Criar conta',
      sources: 'Criar fonte',
      categories: 'Criar categoria',
      tags: 'Criar tag',
    };
    return labels[kind];
  }, [isEditing, kind]);

  return (
    <ModalPortal isOpen={isOpen}>
      <div
        className="app-modal-overlay"
        onClick={isSaving ? undefined : onClose}
        role="presentation"
      >
        <div
          className="app-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="finance-master-modal-title"
        >
          <div className="app-modal-header">
            <div>
              <h3 id="finance-master-modal-title">{modalTitle}</h3>
              <p className="app-modal-subtitle">{SUBTITLE[kind]}</p>
            </div>
            <button
              type="button"
              className="app-modal-close"
              onClick={onClose}
              disabled={isSaving}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>

          <form className="pg-form-modal-body" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="fm-name">Nome *</label>
              <input
                id="fm-name"
                className="premium-text-input"
                value={values.name}
                onChange={(e) => setValues({ ...values, name: e.target.value })}
                required
                minLength={2}
                maxLength={120}
                autoFocus
              />
            </div>

            {kind === 'accounts' && (
              <>
                <PremiumSelect
                  label="Tipo de conta"
                  value={values.type}
                  options={ACCOUNT_TYPE_OPTIONS}
                  onChange={(v) => setValues({ ...values, type: v })}
                />
                <div className="form-group">
                  <label htmlFor="fm-description">Descrição</label>
                  <textarea
                    id="fm-description"
                    className="premium-text-input"
                    rows={2}
                    value={values.description}
                    onChange={(e) => setValues({ ...values, description: e.target.value })}
                  />
                </div>
              </>
            )}

            {kind === 'sources' && (
              <PremiumSelect
                label="Tipo"
                value={values.type}
                options={TX_TYPE_OPTIONS}
                onChange={(v) => setValues({ ...values, type: v })}
              />
            )}

            {kind === 'categories' && (
              <>
                <PremiumSelect
                  label="Tipo"
                  value={values.type}
                  options={TX_TYPE_OPTIONS}
                  onChange={(v) => setValues({ ...values, type: v })}
                />
                <PremiumSelect
                  label="Nível"
                  value={values.level}
                  options={CATEGORY_LEVEL_OPTIONS}
                  onChange={(v) => setValues({ ...values, level: v })}
                />
              </>
            )}

            {kind === 'tags' && (
              <div className="form-group">
                <label htmlFor="fm-color">Cor</label>
                <input
                  id="fm-color"
                  type="color"
                  className="premium-text-input"
                  value={values.color}
                  onChange={(e) => setValues({ ...values, color: e.target.value })}
                  style={{ padding: 4, height: 48 }}
                />
              </div>
            )}

            {isEditing ? (
              <PremiumSelect
                label="Status"
                value={values.active ? 'true' : 'false'}
                options={ACTIVE_OPTIONS}
                onChange={(v) => setValues({ ...values, active: v === 'true' })}
              />
            ) : null}

            <div className="app-modal-footer pg-form-modal-footer">
              <button
                type="button"
                className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                disabled={isSaving}
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`catalog-form-footer-btn catalog-form-footer-btn--primary${isSaving ? ' is-loading' : ''}`}
                disabled={isSaving}
              >
                {isSaving ? 'Salvando…' : submitLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default FinanceMasterModal;
