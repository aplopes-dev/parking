import React from 'react';
import { formatMoney } from '../../pdv/pdvUtils';
import { MobileTableSession, MobileTableStatus } from '../smartPosTypes';
import './SmartPosOrderTotals.css';

type SmartPosOrderTotalsProps = {
  session: MobileTableSession;
  tableStatus: MobileTableStatus;
  defaultServiceFeePercent: number;
};

const SmartPosOrderTotals: React.FC<SmartPosOrderTotalsProps> = ({
  session,
  tableStatus,
  defaultServiceFeePercent,
}) => {
  const isOpen = tableStatus === 'open';
  const awaitingPayment = tableStatus === 'payment_pending';
  const isClosed = tableStatus === 'closed';
  const amountDue = Math.max(session.remaining, 0);

  return (
    <div className="smartpos-totals" aria-label="Totais do pedido">
      <div className="smartpos-totals-row">
        <span>Subtotal</span>
        <span>{formatMoney(session.subtotal)}</span>
      </div>
      <div className="smartpos-totals-row">
        <span>Taxa de serviço ({defaultServiceFeePercent}%)</span>
        <span>{formatMoney(session.serviceFee)}</span>
      </div>
      <div className="smartpos-totals-row smartpos-totals-row--emphasis">
        <span>Total</span>
        <strong>{formatMoney(session.total)}</strong>
      </div>

      {isOpen ? (
        <p className="smartpos-totals-hint">
          Conta em aberto — encerre a conta para o cliente conferir e pagar.
        </p>
      ) : null}

      {awaitingPayment ? (
        <>
          <p className="smartpos-totals-status smartpos-totals-status--pending">
            Aguardando pagamento
          </p>
          {session.paidAmount > 0.01 ? (
            <div className="smartpos-totals-row">
              <span>Pago parcial</span>
              <span>{formatMoney(session.paidAmount)}</span>
            </div>
          ) : null}
          <div className="smartpos-totals-row smartpos-totals-row--emphasis is-due">
            <span>A pagar</span>
            <strong>{formatMoney(amountDue > 0.01 ? amountDue : session.total)}</strong>
          </div>
        </>
      ) : null}

      {isClosed ? (
        <>
          <p className="smartpos-totals-status smartpos-totals-status--paid">Quitada</p>
          <div className="smartpos-totals-row">
            <span>Pago</span>
            <span>{formatMoney(session.paidAmount)}</span>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default SmartPosOrderTotals;
