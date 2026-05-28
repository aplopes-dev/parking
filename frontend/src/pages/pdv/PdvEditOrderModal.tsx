import React, { useEffect, useState } from 'react';
import ModalPortal from '../../components/ModalPortal';
import PremiumSelect from '../../components/PremiumSelect';
import { Order } from '../../types';
import '../../components/AppModal.css';
import '../catalog/Catalog.css';
import './PdvNewOrderModal.css';

type SelectOption = { value: string; label: string };

type PdvEditOrderModalProps = {
  isOpen: boolean;
  saving: boolean;
  order: Order | null;
  customerOptions: SelectOption[];
  showDelivery?: boolean;
  showTableSelect?: boolean;
  tableOptions?: SelectOption[];
  onClose: () => void;
  onSubmit: (patch: EditOrderPatch) => void | Promise<void>;
};

export type EditOrderPatch = {
  customerId?: string | null;
  tableId?: string | null;
  tableLabel?: string | null;
  notes?: string | null;
  deliveryAddress?: string | null;
};

const PdvEditOrderModal: React.FC<PdvEditOrderModalProps> = ({
  isOpen,
  saving,
  order,
  customerOptions,
  showDelivery,
  showTableSelect,
  tableOptions = [],
  onClose,
  onSubmit,
}) => {
  const [customerId, setCustomerId] = useState('');
  const [tableId, setTableId] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  useEffect(() => {
    if (order && isOpen) {
      setCustomerId(order.customerId ?? '');
      setTableId(order.tableId ?? '');
      setNotes(order.notes ?? '');
      setDeliveryAddress(order.deliveryAddress ?? '');
    }
  }, [order, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patch: EditOrderPatch = {};

    if ((customerId || null) !== (order?.customerId || null)) {
      patch.customerId = customerId || null;
    }
    if (showTableSelect && (tableId || null) !== (order?.tableId || null)) {
      patch.tableId = tableId || null;
      const label = tableOptions.find((t) => t.value === tableId)?.label ?? null;
      patch.tableLabel = label;
    }
    if ((notes || null) !== (order?.notes || null)) {
      patch.notes = notes || null;
    }
    if (showDelivery && (deliveryAddress || null) !== (order?.deliveryAddress || null)) {
      patch.deliveryAddress = deliveryAddress || null;
    }

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    void onSubmit(patch);
  };

  if (!order) return null;

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="app-modal-overlay" role="presentation" onClick={saving ? undefined : onClose}>
        <div
          className="app-modal pdv-new-order-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdv-edit-order-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="app-modal-header">
            <div>
              <h3 id="pdv-edit-order-modal-title">Editar pedido #{order.orderNumber}</h3>
              <p className="app-modal-subtitle">Altere as informações do pedido.</p>
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

          <form className="app-modal-body pdv-new-order-modal__form" onSubmit={handleSubmit}>
            <div className="catalog-form-grid">
              {showTableSelect && (
                <PremiumSelect
                  label="Mesa"
                  value={tableId}
                  onChange={setTableId}
                  options={[{ value: '', label: 'Sem mesa' }, ...tableOptions]}
                  menuInPortal
                />
              )}
              <PremiumSelect
                label="Cliente (opcional)"
                value={customerId}
                onChange={setCustomerId}
                options={[{ value: '', label: '—' }, ...customerOptions]}
                menuInPortal
              />
            </div>
            {showDelivery && (
              <div className="form-group">
                <label htmlFor="pdv-edit-address">Endereço de entrega</label>
                <textarea
                  id="pdv-edit-address"
                  className="premium-text-input"
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="pdv-edit-notes">Observações</label>
              <input
                id="pdv-edit-notes"
                className="premium-text-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

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
                {saving ? 'Salvando…' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default PdvEditOrderModal;
