import React, { useState } from 'react';
import ModalPortal from '../../components/ModalPortal';
import { Order, OrderType } from '../../types';
import PdvCloseOrderContent from './PdvCloseOrderContent';
import '../../components/AppModal.css';
import '../finance/Finance.css';
import './PdvCloseOrderModal.css';

type PdvCloseOrderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialOrderId?: string;
  orderType?: OrderType;
  onOrderClosed?: () => void;
  onOrderUpdated?: (order: Order) => void;
};

const PdvCloseOrderModal: React.FC<PdvCloseOrderModalProps> = ({
  isOpen,
  onClose,
  initialOrderId,
  orderType,
  onOrderClosed,
  onOrderUpdated,
}) => {
  const [saving, setSaving] = useState(false);
  const paymentOnly = orderType === 'delivery';

  return (
    <ModalPortal isOpen={isOpen}>
      <div
        className="app-modal-overlay"
        role="presentation"
        onClick={saving ? undefined : onClose}
      >
        <div
          className="app-modal app-modal--wide finance-tx-modal pdv-close-order-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdv-close-order-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="app-modal-header">
            <div>
              <h3 id="pdv-close-order-modal-title">Pagamento do pedido</h3>
              <p className="app-modal-subtitle">
                {paymentOnly
                  ? 'Registre as formas de pagamento para liberar o envio à produção.'
                  : 'Registre as formas de pagamento e encerre a conta do pedido.'}
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

          {isOpen ? (
            <PdvCloseOrderContent
              key={`${initialOrderId ?? ''}-open`}
              inModal
              initialOrderId={initialOrderId}
              orderType={orderType}
              paymentOnly={paymentOnly}
              onClose={onClose}
              onSavingChange={setSaving}
              onOrderClosed={onOrderClosed}
              onOrderUpdated={onOrderUpdated}
            />
          ) : null}
        </div>
      </div>
    </ModalPortal>
  );
};

export default PdvCloseOrderModal;
