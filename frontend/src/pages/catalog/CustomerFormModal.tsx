import React, { useEffect, useMemo, useState } from 'react';
import ModalPortal from '../../components/ModalPortal';
import PremiumSelect from '../../components/PremiumSelect';
import { Customer } from '../../types';
import '../../components/AppModal.css';
import './CustomerFormModal.css';

export interface CustomerFormValues {
  name: string;
  email: string;
  phone: string;
  document: string;
  birthDate: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  allergyNotes: string;
  notes: string;
  active: boolean;
}

interface CustomerFormModalProps {
  isOpen: boolean;
  editing: Customer | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: CustomerFormValues) => void | Promise<void>;
}

const emptyValues = (): CustomerFormValues => ({
  name: '',
  email: '',
  phone: '',
  document: '',
  birthDate: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  allergyNotes: '',
  notes: '',
  active: true,
});

const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  editing,
  isSaving,
  onClose,
  onSubmit,
}) => {
  const [values, setValues] = useState<CustomerFormValues>(emptyValues);

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setValues({
        name: editing.name,
        email: editing.email || '',
        phone: editing.phone || '',
        document: editing.document || '',
        birthDate: editing.birthDate ? editing.birthDate.slice(0, 10) : '',
        address: editing.address || '',
        city: editing.city || '',
        state: editing.state || '',
        zipCode: editing.zipCode || '',
        allergyNotes: editing.allergyNotes || '',
        notes: editing.notes || '',
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
          className="app-modal customer-form-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-form-modal-title"
        >
          <div className="app-modal-header">
            <div>
              <h3 id="customer-form-modal-title">
                {editing ? 'Editar cliente' : 'Novo cliente'}
              </h3>
              <p className="app-modal-subtitle">
                {editing
                  ? 'Atualize dados de contato, endereço e observações.'
                  : 'Cadastre um cliente para atendimento, delivery e fidelização.'}
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

          <form className="customer-form-modal-body" onSubmit={handleSubmit}>
            <div className="customer-form-modal-grid">
              <div className="form-group">
                <label htmlFor="customer-form-name">Nome *</label>
                <input
                  id="customer-form-name"
                  className="premium-text-input"
                  value={values.name}
                  onChange={(e) => setValues({ ...values, name: e.target.value })}
                  required
                  minLength={2}
                  maxLength={200}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="customer-form-phone">Telefone</label>
                <input
                  id="customer-form-phone"
                  className="premium-text-input"
                  value={values.phone}
                  onChange={(e) => setValues({ ...values, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="customer-form-email">E-mail</label>
                <input
                  id="customer-form-email"
                  className="premium-text-input"
                  type="email"
                  value={values.email}
                  onChange={(e) => setValues({ ...values, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="customer-form-document">CPF / documento</label>
                <input
                  id="customer-form-document"
                  className="premium-text-input"
                  value={values.document}
                  onChange={(e) => setValues({ ...values, document: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="customer-form-birth">Data de nascimento</label>
                <input
                  id="customer-form-birth"
                  className="premium-text-input"
                  type="date"
                  value={values.birthDate}
                  onChange={(e) => setValues({ ...values, birthDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="customer-form-zip">CEP</label>
                <input
                  id="customer-form-zip"
                  className="premium-text-input"
                  value={values.zipCode}
                  onChange={(e) => setValues({ ...values, zipCode: e.target.value })}
                  maxLength={16}
                />
              </div>
              <div className="form-group">
                <label htmlFor="customer-form-address">Endereço</label>
                <input
                  id="customer-form-address"
                  className="premium-text-input"
                  value={values.address}
                  onChange={(e) => setValues({ ...values, address: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="customer-form-city">Cidade</label>
                <input
                  id="customer-form-city"
                  className="premium-text-input"
                  value={values.city}
                  onChange={(e) => setValues({ ...values, city: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="customer-form-state">UF</label>
                <input
                  id="customer-form-state"
                  className="premium-text-input"
                  value={values.state}
                  onChange={(e) => setValues({ ...values, state: e.target.value })}
                  maxLength={2}
                />
              </div>
            </div>
            <div className="customer-form-modal-grid--2col">
              <div className="form-group">
                <label htmlFor="customer-form-allergy">Alergias / restrições</label>
                <textarea
                  id="customer-form-allergy"
                  className="premium-text-input"
                  rows={2}
                  value={values.allergyNotes}
                  onChange={(e) => setValues({ ...values, allergyNotes: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="customer-form-notes">Observações</label>
                <textarea
                  id="customer-form-notes"
                  className="premium-text-input"
                  rows={2}
                  value={values.notes}
                  onChange={(e) => setValues({ ...values, notes: e.target.value })}
                />
              </div>
            </div>
            <PremiumSelect
              label="Status"
              value={values.active ? 'true' : 'false'}
              options={activeOptions}
              onChange={(v) => setValues({ ...values, active: v === 'true' })}
            />

            <div className="app-modal-footer customer-form-modal-footer">
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
                {isSaving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar cliente'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default CustomerFormModal;
