import React, { useEffect, useMemo, useState } from 'react';
import ModalPortal from '../../components/ModalPortal';
import PremiumSelect from '../../components/PremiumSelect';
import { ProductGroup } from '../../types';
import '../../components/AppModal.css';
import './ProductGroupFormModal.css';

export interface ProductGroupFormValues {
  name: string;
  description: string;
  active: boolean;
}

interface ProductGroupFormModalProps {
  isOpen: boolean;
  editing: ProductGroup | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: ProductGroupFormValues) => void | Promise<void>;
}

const emptyValues = (): ProductGroupFormValues => ({
  name: '',
  description: '',
  active: true,
});

const ProductGroupFormModal: React.FC<ProductGroupFormModalProps> = ({
  isOpen,
  editing,
  isSaving,
  onClose,
  onSubmit,
}) => {
  const [values, setValues] = useState<ProductGroupFormValues>(emptyValues);

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setValues({
        name: editing.name,
        description: editing.description || '',
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
          aria-labelledby="pg-form-modal-title"
        >
          <div className="app-modal-header">
            <div>
              <h3 id="pg-form-modal-title">{editing ? 'Editar grupo' : 'Novo grupo'}</h3>
              <p className="app-modal-subtitle">
                {editing
                  ? 'Atualize nome, descrição e status do grupo.'
                  : 'Crie uma categoria para organizar itens do cardápio.'}
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
              <label htmlFor="pg-form-name">Nome *</label>
              <input
                id="pg-form-name"
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
              <label htmlFor="pg-form-desc">Descrição</label>
              <textarea
                id="pg-form-desc"
                className="premium-text-input"
                rows={3}
                value={values.description}
                onChange={(e) => setValues({ ...values, description: e.target.value })}
                placeholder="Ex.: Bebidas geladas e sucos"
              />
            </div>
            <PremiumSelect
              label="Status"
              value={values.active ? 'true' : 'false'}
              options={activeOptions}
              onChange={(v) => setValues({ ...values, active: v === 'true' })}
            />

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
                {isSaving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar grupo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ProductGroupFormModal;
