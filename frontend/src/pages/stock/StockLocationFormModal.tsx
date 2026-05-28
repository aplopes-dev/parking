import React, { useEffect, useMemo, useState } from 'react';
import ModalPortal from '../../components/ModalPortal';
import PremiumSelect from '../../components/PremiumSelect';
import { StockLocation } from '../../types';
import '../../components/AppModal.css';
import '../catalog/ProductGroupFormModal.css';

export interface StockLocationFormValues {
  name: string;
  description: string;
  isDefault: boolean;
  active: boolean;
}

interface StockLocationFormModalProps {
  isOpen: boolean;
  editing: StockLocation | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: StockLocationFormValues) => void | Promise<void>;
}

const emptyValues = (): StockLocationFormValues => ({
  name: '',
  description: '',
  isDefault: false,
  active: true,
});

const StockLocationFormModal: React.FC<StockLocationFormModalProps> = ({
  isOpen,
  editing,
  isSaving,
  onClose,
  onSubmit,
}) => {
  const [values, setValues] = useState<StockLocationFormValues>(emptyValues);

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setValues({
        name: editing.name,
        description: editing.description || '',
        isDefault: editing.isDefault,
        active: editing.active,
      });
    } else {
      setValues(emptyValues());
    }
  }, [isOpen, editing]);

  const activeOptions = useMemo(
    () => [
      { value: 'true', label: 'Ativo' },
      { value: 'false', label: 'Inativo' },
    ],
    [],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSubmit(values);
  };

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
          aria-labelledby="sl-form-modal-title"
        >
          <div className="app-modal-header">
            <div>
              <h3 id="sl-form-modal-title">{editing ? 'Editar local' : 'Novo local'}</h3>
              <p className="app-modal-subtitle">
                {editing
                  ? 'Atualize nome, descrição e status do depósito ou área.'
                  : 'Cadastre depósito, cozinha, bar ou câmara para saldos por local.'}
              </p>
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
              <label htmlFor="sl-form-name">Nome *</label>
              <input
                id="sl-form-name"
                className="premium-text-input"
                value={values.name}
                onChange={(e) => setValues({ ...values, name: e.target.value })}
                required
                minLength={2}
                maxLength={120}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="sl-form-desc">Descrição</label>
              <textarea
                id="sl-form-desc"
                className="premium-text-input"
                rows={2}
                value={values.description}
                onChange={(e) => setValues({ ...values, description: e.target.value })}
              />
            </div>
            <PremiumSelect
              label="Status"
              value={values.active ? 'true' : 'false'}
              options={activeOptions}
              onChange={(v) => setValues({ ...values, active: v === 'true' })}
            />
            <label className="form-group">
              <input
                type="checkbox"
                checked={values.isDefault}
                onChange={(e) => setValues({ ...values, isDefault: e.target.checked })}
              />{' '}
              Local padrão para movimentações
            </label>

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
                {isSaving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar local'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default StockLocationFormModal;
