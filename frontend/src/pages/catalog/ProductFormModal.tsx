import React, { useEffect, useMemo, useRef, useState } from 'react';
import ModalPortal from '../../components/ModalPortal';
import PremiumSelect from '../../components/PremiumSelect';
import FitImagePreview from '../../components/FitImagePreview';
import { getApiErrorMessage } from '../../utils/apiError';
import { getProductPhotoUrl } from '../../utils/productPhoto';
import api from '../../services/api';
import { Product, ProductGroup, ProductUnit } from '../../types';
import AlertModal from '../../components/AlertModal';
import '../../components/AppModal.css';
import './ProductGroupFormModal.css';

export interface ProductFormValues {
  name: string;
  groupId: string;
  description: string;
  sku: string;
  costPrice: string;
  salePrice: string;
  unit: ProductUnit;
  active: boolean;
}

interface ProductFormModalProps {
  isOpen: boolean;
  editing: Product | null;
  groups: ProductGroup[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: ProductFormValues, photoFile: File | null) => void | Promise<void>;
}

const emptyValues = (): ProductFormValues => ({
  name: '',
  groupId: '',
  description: '',
  sku: '',
  costPrice: '0',
  salePrice: '0',
  unit: 'un',
  active: true,
});

const unitOptions = [
  { value: 'un', label: 'Unidade' },
  { value: 'kg', label: 'Quilograma' },
  { value: 'l', label: 'Litro' },
  { value: 'porcao', label: 'Porção' },
];

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  editing,
  groups,
  isSaving,
  onClose,
  onSubmit,
}) => {
  const [values, setValues] = useState<ProductFormValues>(emptyValues);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoAlert, setPhotoAlert] = useState<{ message: string; type: 'error' | 'warning' } | null>(
    null,
  );
  const photoInputRef = useRef<HTMLInputElement>(null);
  const storedPhotoKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPhotoFile(null);
    setPhotoPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
    if (editing) {
      storedPhotoKeyRef.current = editing.photoKey ?? null;
      setValues({
        name: editing.name,
        groupId: editing.groupId || '',
        description: editing.description || '',
        sku: editing.sku || '',
        costPrice: String(editing.costPrice),
        salePrice: String(editing.salePrice),
        unit: editing.unit,
        active: editing.active,
      });
      setPhotoPreview(getProductPhotoUrl(editing));
    } else {
      storedPhotoKeyRef.current = null;
      setValues(emptyValues());
    }
  }, [isOpen, editing?.id]);

  const groupSelectOptions = useMemo(
    () => [
      { value: '', label: 'Sem grupo' },
      ...groups.map((g) => ({ value: g.id, label: g.name })),
    ],
    [groups],
  );

  const activeOptions = useMemo(
    () => [
      { value: 'true', label: 'Ativo' },
      { value: 'false', label: 'Inativo' },
    ],
    [],
  );

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoAlert({ message: 'Selecione um arquivo de imagem (JPEG, PNG ou WebP).', type: 'warning' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoAlert({ message: 'A imagem deve ter no máximo 5 MB.', type: 'warning' });
      return;
    }

    if (editing?.id && storedPhotoKeyRef.current) {
      try {
        await api.delete(`/products/${editing.id}/photo`);
        storedPhotoKeyRef.current = null;
      } catch (err: unknown) {
        setPhotoAlert({
          message: getApiErrorMessage(err, 'Não foi possível remover a foto anterior.'),
          type: 'error',
        });
        e.target.value = '';
        return;
      }
    }

    if (photoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const openPhotoPicker = () => photoInputRef.current?.click();

  const handleRemovePhoto = async () => {
    if (editing?.id && storedPhotoKeyRef.current) {
      try {
        await api.delete(`/products/${editing.id}/photo`);
        storedPhotoKeyRef.current = null;
      } catch (err: unknown) {
        setPhotoAlert({
          message: getApiErrorMessage(err, 'Não foi possível remover a foto.'),
          type: 'error',
        });
        return;
      }
    }
    if (photoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSubmit(values, photoFile);
  };

  return (
    <>
      <ModalPortal isOpen={isOpen}>
        <div
          className="app-modal-overlay"
          onClick={isSaving ? undefined : onClose}
          role="presentation"
        >
          <div
            className="app-modal app-modal--wide"
            onClick={(ev) => ev.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-form-modal-title"
          >
            <div className="app-modal-header">
              <div>
                <h3 id="product-form-modal-title">
                  {editing ? 'Editar produto' : 'Novo produto'}
                </h3>
                <p className="app-modal-subtitle">
                  {editing
                    ? 'Atualize dados, preços e foto do item.'
                    : 'Cadastre item do cardápio com custo, venda e grupo.'}
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
              <div className="product-form-layout">
                <div className="product-form-fields">
                  <div className="catalog-form-grid">
                    <div className="form-group">
                      <label htmlFor="product-form-name">Nome *</label>
                      <input
                        id="product-form-name"
                        className="premium-text-input"
                        value={values.name}
                        onChange={(e) => setValues({ ...values, name: e.target.value })}
                        required
                        minLength={2}
                        maxLength={200}
                        autoFocus
                      />
                    </div>
                    <PremiumSelect
                      label="Grupo"
                      value={values.groupId}
                      options={groupSelectOptions}
                      onChange={(v) => setValues({ ...values, groupId: v })}
                      placeholder="Selecione o grupo"
                    />
                    <div className="form-group">
                      <label htmlFor="product-form-sku">SKU / código</label>
                      <input
                        id="product-form-sku"
                        className="premium-text-input"
                        value={values.sku}
                        onChange={(e) => setValues({ ...values, sku: e.target.value })}
                        maxLength={64}
                      />
                    </div>
                    <PremiumSelect
                      label="Unidade"
                      value={values.unit}
                      options={unitOptions}
                      onChange={(v) => setValues({ ...values, unit: v as ProductUnit })}
                      required
                    />
                    <div className="form-group">
                      <label htmlFor="product-form-cost">Custo (R$) *</label>
                      <input
                        id="product-form-cost"
                        className="premium-text-input"
                        type="number"
                        min={0}
                        step="0.01"
                        value={values.costPrice}
                        onChange={(e) => setValues({ ...values, costPrice: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="product-form-sale">Preço de venda (R$) *</label>
                      <input
                        id="product-form-sale"
                        className="premium-text-input"
                        type="number"
                        min={0}
                        step="0.01"
                        value={values.salePrice}
                        onChange={(e) => setValues({ ...values, salePrice: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="product-form-desc">Descrição</label>
                    <textarea
                      id="product-form-desc"
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
                </div>
                <div className="product-form-photo-col">
                  <div className="catalog-photo-preview-card">
                    <FitImagePreview
                      src={photoPreview}
                      alt="Pré-visualização"
                      size="md"
                      placeholderContent={
                        <span className="catalog-photo-preview-placeholder-icon">🍽️</span>
                      }
                    />
                    {photoPreview ? (
                      <div className="catalog-photo-actions">
                        <button
                          type="button"
                          className="catalog-photo-change-btn"
                          onClick={openPhotoPicker}
                        >
                          Trocar
                        </button>
                        <button
                          type="button"
                          className="catalog-photo-remove-btn"
                          onClick={handleRemovePhoto}
                        >
                          Remover
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <input
                    ref={photoInputRef}
                    id="product-form-photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/*"
                    className="catalog-photo-file-input"
                    onChange={handlePhotoChange}
                  />
                  <button
                    type="button"
                    className="catalog-photo-choose-btn"
                    onClick={openPhotoPicker}
                  >
                    {photoPreview ? 'Trocar foto' : 'Escolher foto'}
                  </button>
                  <p className="catalog-photo-hint">Máx. 5 MB · JPEG, PNG, WebP</p>
                </div>
              </div>

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
                  {isSaving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
      <AlertModal
        isOpen={Boolean(photoAlert)}
        onClose={() => setPhotoAlert(null)}
        message={photoAlert?.message || ''}
        type={photoAlert?.type || 'warning'}
      />
    </>
  );
};

export default ProductFormModal;
