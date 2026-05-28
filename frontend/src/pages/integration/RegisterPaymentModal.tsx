import React, { useEffect, useState } from 'react';
import ModalPortal from '../../components/ModalPortal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatMoney } from '../pdv/pdvUtils';
import {
  MOBILE_PAYMENT_OPTIONS,
  MobilePaymentMethod,
} from './smartPosPaymentTypes';
import '../../components/AppModal.css';
import './RegisterPaymentModal.css';

type RegisterPaymentModalProps = {
  isOpen: boolean;
  tableNumber?: number;
  orderNumber?: number;
  remaining: number;
  total: number;
  isLoading: boolean;
  pagbankPixAvailable?: boolean;
  onPagbankPix?: () => void;
  onConfirm: (method: MobilePaymentMethod) => void;
  onClose: () => void;
};

const RegisterPaymentModal: React.FC<RegisterPaymentModalProps> = ({
  isOpen,
  tableNumber,
  orderNumber,
  remaining,
  total,
  isLoading,
  pagbankPixAvailable,
  onPagbankPix,
  onConfirm,
  onClose,
}) => {
  const [method, setMethod] = useState<MobilePaymentMethod>('cash');

  useEffect(() => {
    if (isOpen) setMethod('cash');
  }, [isOpen]);

  const canConfirm = remaining > 0.01 && !isLoading;

  return (
    <ModalPortal isOpen={isOpen}>
      <div
        className="app-modal-overlay"
        onClick={isLoading ? undefined : onClose}
        role="presentation"
      >
        <div
          className="app-modal payment-register-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
        >
          <div className="app-modal-header">
            <div>
              <h3 id="payment-modal-title">Registrar pagamento</h3>
              <p className="app-modal-subtitle">
                {tableNumber != null ? (
                  <>
                    Mesa <strong>{tableNumber}</strong>
                    {orderNumber != null ? (
                      <>
                        {' '}
                        · Pedido <strong>#{orderNumber}</strong>
                      </>
                    ) : null}
                  </>
                ) : (
                  'Confirme a forma de pagamento do valor pendente.'
                )}
              </p>
            </div>
            <button
              type="button"
              className="app-modal-close"
              onClick={onClose}
              disabled={isLoading}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>

          <div className="app-modal-body payment-register-modal-body" aria-busy={isLoading}>
            <div className="payment-register-amounts">
              <div className="payment-register-amount-row">
                <span>Total da conta</span>
                <strong>{formatMoney(total)}</strong>
              </div>
              <div className="payment-register-amount-row payment-register-amount-row--due">
                <span>Valor a pagar agora</span>
                <strong>{formatMoney(remaining)}</strong>
              </div>
            </div>

            <p className="payment-register-label">Forma de pagamento</p>
            <div
              className="payment-register-methods"
              role="radiogroup"
              aria-label="Forma de pagamento"
            >
              {MOBILE_PAYMENT_OPTIONS.map((option) => {
                const selected = method === option.method;
                return (
                  <button
                    key={option.method}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`payment-register-method${selected ? ' is-selected' : ''}`}
                    disabled={isLoading}
                    onClick={() => setMethod(option.method)}
                  >
                    <span className="payment-register-method-label">{option.label}</span>
                    <span className="payment-register-method-desc">{option.description}</span>
                  </button>
                );
              })}
            </div>

            {remaining <= 0.01 ? (
              <p className="payment-register-hint payment-register-hint--warn">
                Valor já quitado. Atualize a mesa ou libere após o fechamento do pedido.
              </p>
            ) : (
              <p className="payment-register-hint">
                O valor pendente será registrado na forma escolhida.
              </p>
            )}
          </div>

          <div className="app-modal-footer payment-register-modal-footer">
            {pagbankPixAvailable && onPagbankPix && remaining > 0.01 ? (
              <button
                type="button"
                className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                disabled={isLoading}
                onClick={onPagbankPix}
              >
                PIX PagBank (API)
              </button>
            ) : null}
            <button
              type="button"
              className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={`catalog-form-footer-btn catalog-form-footer-btn--primary${isLoading ? ' is-loading' : ''}`}
              disabled={!canConfirm}
              onClick={() => onConfirm(method)}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Registrando…
                </>
              ) : (
                'Confirmar pagamento'
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default RegisterPaymentModal;
