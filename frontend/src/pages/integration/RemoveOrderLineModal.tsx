import React from 'react';
import ModalPortal from '../../components/ModalPortal';
import { formatItemQty, formatMoney } from '../pdv/pdvUtils';
import { DisplayOrderLine } from './orderLineUtils';
import '../../components/AppModal.css';
import './RemoveOrderLineModal.css';

type RemoveOrderLineModalProps = {
  isOpen: boolean;
  tableNumber?: number;
  orderNumber?: number;
  lines: DisplayOrderLine[];
  isLoading: boolean;
  onRemoveOne: (groupKey: string) => void;
  onClose: () => void;
};

const RemoveOrderLineModal: React.FC<RemoveOrderLineModalProps> = ({
  isOpen,
  tableNumber,
  orderNumber,
  lines,
  isLoading,
  onRemoveOne,
  onClose,
}) => (
  <ModalPortal isOpen={isOpen}>
    <div
      className="app-modal-overlay"
      onClick={isLoading ? undefined : onClose}
      role="presentation"
    >
      <div
        className="app-modal remove-line-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-line-modal-title"
      >
        <div className="app-modal-header">
          <div>
            <h3 id="remove-line-modal-title">Retirar item da comanda</h3>
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
                  {' '}
                  — use <strong>−</strong> para retirar uma unidade por vez.
                </>
              ) : (
                'Use o botão − ao lado de cada item para retirar uma unidade.'
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

        <div className="app-modal-body remove-line-modal-body" aria-busy={isLoading}>
          {lines.length === 0 ? (
            <div className="catalog-empty">Não há mais itens na comanda.</div>
          ) : (
            <ul className="remove-line-modal-list">
              {lines.map((line) => (
                <li key={line.key} className="remove-line-modal-row">
                  <button
                    type="button"
                    className="remove-line-qty-btn is-minus"
                    aria-label={`Retirar 1 unidade de ${line.productName}, ${formatItemQty(line.quantity)} no total`}
                    title="Retirar 1 unidade"
                    disabled={isLoading}
                    onClick={() => onRemoveOne(line.key)}
                  >
                    −
                  </button>
                  <span className="remove-line-modal-label">
                    <span className="remove-line-modal-qty">{formatItemQty(line.quantity)}×</span>
                    {line.productName}
                  </span>
                  <span className="remove-line-modal-price">{formatMoney(line.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="app-modal-footer">
          <button
            type="button"
            className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  </ModalPortal>
);

export default RemoveOrderLineModal;
