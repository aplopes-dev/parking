import React from 'react';
import ModalPortal from '../../components/ModalPortal';
import PremiumSelect from '../../components/PremiumSelect';
import '../../components/AppModal.css';
import '../catalog/Catalog.css';
import './PdvNewOrderModal.css';

export type PdvNewOrderFormState = {
  comandaId: string;
  customerId: string;
  tableLabel: string;
  tableId: string;
  notes: string;
  deliveryAddress: string;
  deliveryStreet: string;
  deliveryNumber: string;
  deliveryComplement: string;
  deliveryReference: string;
  deliveryFee: string;
  applyServiceFee: boolean;
};

type SelectOption = { value: string; label: string };

type PdvNewOrderModalProps = {
  isOpen: boolean;
  saving: boolean;
  catalogLoading: boolean;
  form: PdvNewOrderFormState;
  customerOptions: SelectOption[];
  comandaOptions: SelectOption[];
  showComanda?: boolean;
  showTable?: boolean;
  showTableSelect?: boolean;
  tableOptions?: SelectOption[];
  onClose: () => void;
  onChange: (patch: Partial<PdvNewOrderFormState>) => void;
  onSubmit: () => void | Promise<void>;
};

const PdvNewOrderModal: React.FC<PdvNewOrderModalProps> = ({
  isOpen,
  saving,
  catalogLoading,
  form,
  customerOptions,
  comandaOptions,
  showComanda,
  showTable,
  showTableSelect,
  tableOptions = [],
  onClose,
  onChange,
  onSubmit,
}) => {
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
          className="app-modal pdv-new-order-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdv-new-order-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="app-modal-header">
            <div>
              <h3 id="pdv-new-order-modal-title">Novo pedido</h3>
              <p className="app-modal-subtitle">
                Abra um pedido no canal PDV. Depois adicione itens na listagem de pedidos abertos.
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

          {catalogLoading ? (
            <div className="app-modal-body">
              <p>Carregando produtos e clientes…</p>
            </div>
          ) : (
            <form className="app-modal-body pdv-new-order-modal__form" onSubmit={handleSubmit}>
              <div className="catalog-form-grid">
                {showComanda && (
                  <PremiumSelect
                    label="Comanda"
                    value={form.comandaId}
                    onChange={(v) => onChange({ comandaId: v })}
                    options={[{ value: '', label: 'Sem comanda' }, ...comandaOptions]}
                    menuInPortal
                  />
                )}
                {showTableSelect && (
                  <PremiumSelect
                    label="Mesa"
                    value={form.tableId}
                    onChange={(v) => onChange({ tableId: v })}
                    options={[{ value: '', label: 'Sem mesa' }, ...tableOptions]}
                    menuInPortal
                  />
                )}
                {showTable && !showTableSelect && (
                  <div className="form-group">
                    <label htmlFor="pdv-modal-table">Mesa / identificação</label>
                    <input
                      id="pdv-modal-table"
                      className="premium-text-input"
                      value={form.tableLabel}
                      onChange={(e) => onChange({ tableLabel: e.target.value })}
                      placeholder="Ex: Mesa 12"
                    />
                  </div>
                )}
                <PremiumSelect
                  label="Cliente (opcional)"
                  value={form.customerId}
                  onChange={(v) => onChange({ customerId: v })}
                  options={[{ value: '', label: '—' }, ...customerOptions]}
                  menuInPortal
                />
              </div>
              <div className="form-group">
                <label htmlFor="pdv-modal-notes">Observações</label>
                <input
                  id="pdv-modal-notes"
                  className="premium-text-input"
                  value={form.notes}
                  onChange={(e) => onChange({ notes: e.target.value })}
                />
              </div>
              <label className="form-group">
                <input
                  type="checkbox"
                  checked={form.applyServiceFee}
                  onChange={(e) => onChange({ applyServiceFee: e.target.checked })}
                />{' '}
                Aplicar taxa de serviço ao abrir
              </label>

              <div className="app-modal-footer pdv-new-order-modal__footer">
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
                  {saving ? 'Abrindo…' : 'Abrir pedido'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};

export default PdvNewOrderModal;
