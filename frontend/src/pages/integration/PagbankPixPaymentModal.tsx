import React from 'react';
import ModalDialog from '../../components/ModalDialog';
import PagbankPixCheckoutPanel from '../../components/pagbank/PagbankPixCheckoutPanel';
import { formatMoney } from '../pdv/pdvUtils';
import './RegisterPaymentModal.css';

type PagbankPixPaymentModalProps = {
  isOpen: boolean;
  tableNumber?: number;
  orderNumber?: number;
  orderId: string;
  remaining: number;
  onClose: () => void;
  onPaid?: (tx: import('../../services/pagbankApi').PagbankTransaction) => void;
};

const PagbankPixPaymentModal: React.FC<PagbankPixPaymentModalProps> = ({
  isOpen,
  tableNumber,
  orderNumber,
  orderId,
  remaining,
  onClose,
  onPaid,
}) => (
  <ModalDialog
    isOpen={isOpen}
    onClose={onClose}
    titleId="pagbank-pix-modal-title"
    className="payment-modal-dialog"
  >
    <div className="payment-modal">
      <div className="payment-modal-header">
        <div>
          <h3 id="pagbank-pix-modal-title">PIX PagBank</h3>
          {tableNumber != null && (
            <p className="payment-modal-subtitle">
              Mesa {tableNumber}
              {orderNumber != null ? ` · Pedido #${orderNumber}` : ''}
            </p>
          )}
        </div>
        <button
          type="button"
          className="payment-modal-close"
          onClick={onClose}
          aria-label="Fechar"
        >
          ×
        </button>
      </div>
      <div className="payment-modal-body">
        <div className="payment-modal-amount-row payment-modal-amount-row--due">
          <span>Valor pendente</span>
          <strong>{formatMoney(remaining)}</strong>
        </div>
        <PagbankPixCheckoutPanel
          orderId={orderId}
          orderTotal={remaining}
          onPaid={onPaid}
        />
      </div>
    </div>
  </ModalDialog>
);

export default PagbankPixPaymentModal;
