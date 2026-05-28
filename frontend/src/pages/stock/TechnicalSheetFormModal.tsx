import React, { useEffect, useMemo, useState } from 'react';
import ModalPortal from '../../components/ModalPortal';
import PremiumSelect from '../../components/PremiumSelect';
import { ProductUnit, TechnicalSheet } from '../../types';
import '../../components/AppModal.css';
import '../catalog/ProductGroupFormModal.css';

export type TechnicalSheetItemForm = {
  ingredientProductId: string;
  quantity: string;
  unit: ProductUnit;
};

export interface TechnicalSheetFormValues {
  productId: string;
  name: string;
  yieldQuantity: string;
  notes: string;
  active: boolean;
  items: TechnicalSheetItemForm[];
}

interface TechnicalSheetFormModalProps {
  isOpen: boolean;
  editing: TechnicalSheet | null;
  productOptions: { value: string; label: string }[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: TechnicalSheetFormValues) => void | Promise<void>;
}

const emptyItem = (): TechnicalSheetItemForm => ({
  ingredientProductId: '',
  quantity: '1',
  unit: 'un',
});

const emptyValues = (): TechnicalSheetFormValues => ({
  productId: '',
  name: '',
  yieldQuantity: '1',
  notes: '',
  active: true,
  items: [emptyItem()],
});

const unitOptions = [
  { value: 'un', label: 'Unidade' },
  { value: 'kg', label: 'Kg' },
  { value: 'l', label: 'Litro' },
  { value: 'porcao', label: 'Porção' },
];

const TechnicalSheetFormModal: React.FC<TechnicalSheetFormModalProps> = ({
  isOpen,
  editing,
  productOptions,
  isSaving,
  onClose,
  onSubmit,
}) => {
  const [values, setValues] = useState<TechnicalSheetFormValues>(emptyValues);

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setValues({
        productId: editing.productId,
        name: editing.name,
        yieldQuantity: String(editing.yieldQuantity),
        notes: editing.notes || '',
        active: editing.active,
        items: editing.items.map((i) => ({
          ingredientProductId: i.ingredientProductId,
          quantity: String(i.quantity),
          unit: i.unit,
        })),
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

  const updateItem = (index: number, patch: Partial<TechnicalSheetItemForm>) => {
    const next = [...values.items];
    next[index] = { ...next[index], ...patch };
    setValues({ ...values, items: next });
  };

  return (
    <ModalPortal isOpen={isOpen}>
      <div
        className="app-modal-overlay"
        onClick={isSaving ? undefined : onClose}
        role="presentation"
      >
        <div
          className="app-modal app-modal--wide"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ts-form-modal-title"
        >
          <div className="app-modal-header">
            <div>
              <h3 id="ts-form-modal-title">{editing ? 'Editar ficha técnica' : 'Nova ficha técnica'}</h3>
              <p className="app-modal-subtitle">
                Cadastre insumos e rendimento para produção e custo.
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
            <div className="catalog-form-grid">
              <PremiumSelect
                label="Produto acabado *"
                value={values.productId}
                options={[{ value: '', label: 'Selecione' }, ...productOptions]}
                onChange={(v) => setValues({ ...values, productId: v })}
              />
              <div className="form-group">
                <label htmlFor="ts-form-name">Nome da ficha *</label>
                <input
                  id="ts-form-name"
                  className="premium-text-input"
                  value={values.name}
                  onChange={(e) => setValues({ ...values, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="ts-form-yield">Rendimento (qtd produzida) *</label>
                <input
                  id="ts-form-yield"
                  className="premium-text-input"
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={values.yieldQuantity}
                  onChange={(e) => setValues({ ...values, yieldQuantity: e.target.value })}
                  required
                />
              </div>
              <PremiumSelect
                label="Status"
                value={values.active ? 'true' : 'false'}
                options={activeOptions}
                onChange={(v) => setValues({ ...values, active: v === 'true' })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="ts-form-notes">Observações</label>
              <textarea
                id="ts-form-notes"
                className="premium-text-input"
                rows={2}
                value={values.notes}
                onChange={(e) => setValues({ ...values, notes: e.target.value })}
              />
            </div>

            <h4 style={{ margin: '16px 0 8px', fontSize: '0.95rem' }}>Insumos</h4>
            {values.items.map((item, index) => (
              <div className="catalog-form-grid" key={index}>
                <PremiumSelect
                  label="Insumo"
                  value={item.ingredientProductId}
                  options={[{ value: '', label: 'Selecione' }, ...productOptions]}
                  onChange={(v) => updateItem(index, { ingredientProductId: v })}
                />
                <div className="form-group">
                  <label>Qtd</label>
                  <input
                    className="premium-text-input"
                    type="number"
                    min="0.0001"
                    step="0.0001"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: e.target.value })}
                  />
                </div>
                <PremiumSelect
                  label="Unidade"
                  value={item.unit}
                  options={unitOptions}
                  onChange={(v) => updateItem(index, { unit: v as ProductUnit })}
                />
                {values.items.length > 1 && (
                  <button
                    type="button"
                    className="catalog-card-button is-danger"
                    style={{ alignSelf: 'end' }}
                    onClick={() =>
                      setValues({
                        ...values,
                        items: values.items.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="catalog-card-button"
              onClick={() => setValues({ ...values, items: [...values.items, emptyItem()] })}
            >
              + Insumo
            </button>

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
                disabled={isSaving || !values.productId}
              >
                {isSaving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar ficha'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default TechnicalSheetFormModal;
