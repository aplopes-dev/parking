import React, { useState } from 'react';
import ModalPortal from '../../components/ModalPortal';
import { Order, OrderType } from '../../types';
import PdvBillSplitContent from './PdvBillSplitContent';
import '../../components/AppModal.css';
import '../finance/Finance.css';
import './PdvBillSplitModal.css';

type PdvBillSplitModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialOrderId?: string;
  orderType?: OrderType;
  onOrderUpdated?: (order: Order | null) => void;
  onProceedToPayment?: (order: Order) => void;
};

const PdvBillSplitModal: React.FC<PdvBillSplitModalProps> = ({
  isOpen,
  onClose,
  initialOrderId,
  orderType,
  onOrderUpdated,
  onProceedToPayment,
}) => {
  const [saving, setSaving] = useState(false);

  return (
    <ModalPortal isOpen={isOpen}>
      <div
        className="app-modal-overlay"
        role="presentation"
        onClick={saving ? undefined : onClose}
      >
        <div
          className="app-modal app-modal--wide finance-tx-modal pdv-bill-split-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdv-bill-split-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="app-modal-header">
            <div>
              <h3 id="pdv-bill-split-modal-title">Divisão de conta</h3>
              <p className="app-modal-subtitle">
                Divida o total do pedido entre pessoas ou formas de pagamento.
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
            <PdvBillSplitContent
              key={`${initialOrderId ?? ''}-open`}
              inModal
              initialOrderId={initialOrderId}
              orderType={orderType}
              onClose={onClose}
              onSavingChange={setSaving}
              onOrderChange={onOrderUpdated}
              onProceedToPayment={onProceedToPayment}
            />
          ) : null}
        </div>
      </div>
    </ModalPortal>
  );
};

export default PdvBillSplitModal;
