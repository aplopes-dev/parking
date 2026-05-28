import React, { memo } from 'react';
import { formatItemQty, formatMoney } from '../../pdv/pdvUtils';
import { SmartPosReceiptData } from '../smartPosReceiptTypes';
import { formatReceiptDateTime, paymentMethodLabel } from '../smartPosReceiptUtils';
import './SmartPosReceipt.css';

type SmartPosReceiptProps = {
  receipt: SmartPosReceiptData;
  businessName?: string;
};

/** Cupom 80mm — oculto na tela; visível apenas em @media print. */
const SmartPosReceipt: React.FC<SmartPosReceiptProps> = ({
  receipt,
  businessName = 'Aplopes Food',
}) => {
  const isPreview = receipt.receiptKind !== 'payment_final';
  const remaining =
    receipt.remaining ?? Math.max(0, receipt.total - (receipt.paidAmount ?? 0));
  const title = isPreview ? 'CONFERÊNCIA DE CONTA' : 'COMPROVANTE DE PAGAMENTO';

  return (
    <div id="receipt-print" className="receipt-print" aria-hidden="true">
      <div className="receipt-print__inner">
        <header className="receipt-print__header">
          <strong className="receipt-print__brand">{businessName}</strong>
          <span className="receipt-print__title">{title}</span>
          {isPreview ? (
            <span className="receipt-print__subtitle">Não é comprovante de pagamento</span>
          ) : null}
        </header>

        <section className="receipt-print__meta">
          <div className="receipt-print__row">
            <span>Mesa</span>
            <span>{receipt.tableNumber}</span>
          </div>
          {receipt.orderNumber != null ? (
            <div className="receipt-print__row">
              <span>Pedido</span>
              <span>#{receipt.orderNumber}</span>
            </div>
          ) : null}
          {receipt.waiterName ? (
            <div className="receipt-print__row">
              <span>Garçom</span>
              <span>{receipt.waiterName}</span>
            </div>
          ) : null}
          <div className="receipt-print__row">
            <span>Emissão</span>
            <span>{formatReceiptDateTime(receipt.issuedAt)}</span>
          </div>
        </section>

        <div className="receipt-print__divider" />

        <section className="receipt-print__items">
          {receipt.items.map((item) => (
            <article key={item.id} className="receipt-print__item">
              <div className="receipt-print__item-line">
                <span>
                  {formatItemQty(item.quantity)}× {item.productName}
                </span>
                <span>{formatMoney(item.total)}</span>
              </div>
              <div className="receipt-print__item-sub">
                <span>unit. {formatMoney(item.unitPrice)}</span>
              </div>
            </article>
          ))}
        </section>

        <div className="receipt-print__divider" />

        <section className="receipt-print__totals">
          <div className="receipt-print__row">
            <span>Subtotal</span>
            <span>{formatMoney(receipt.subtotal)}</span>
          </div>
          <div className="receipt-print__row">
            <span>Taxa de serviço</span>
            <span>{formatMoney(receipt.serviceFee)}</span>
          </div>
          <div className="receipt-print__row receipt-print__row--total">
            <span>TOTAL</span>
            <strong>{formatMoney(receipt.total)}</strong>
          </div>
          {isPreview ? (
            <div className="receipt-print__row receipt-print__row--due">
              <span>A PAGAR</span>
              <strong>{formatMoney(remaining > 0.01 ? remaining : receipt.total)}</strong>
            </div>
          ) : null}
        </section>

        {!isPreview && receipt.payments.length > 0 ? (
          <>
            <div className="receipt-print__divider" />
            <section className="receipt-print__payments">
              <span className="receipt-print__section-label">Pagamentos</span>
              {receipt.payments.map((payment, index) => (
                <div key={`${payment.method}-${index}`} className="receipt-print__row">
                  <span>{paymentMethodLabel(payment.method)}</span>
                  <span>{formatMoney(payment.amount)}</span>
                </div>
              ))}
            </section>
          </>
        ) : null}

        <footer className="receipt-print__footer">
          <span>
            {isPreview
              ? 'Confira os itens e valores antes do pagamento.'
              : 'Obrigado pela preferência!'}
          </span>
        </footer>
      </div>
    </div>
  );
};

export default memo(SmartPosReceipt);
