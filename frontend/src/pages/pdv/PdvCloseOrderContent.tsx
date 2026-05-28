import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import AlertModal from '../../components/AlertModal';
import PremiumSelect from '../../components/PremiumSelect';
import { AlertState, Order, OrderType, PaymentMethod } from '../../types';
import { FinanceField } from '../finance/financeShared';
import { formatMoney, paymentMethodLabel } from './pdvUtils';
import PagbankPixCheckoutPanel from '../../components/pagbank/PagbankPixCheckoutPanel';
import PagbankHostedCheckoutPanel from '../../components/pagbank/PagbankHostedCheckoutPanel';
import { fetchPagbankCapabilities, PagbankCapabilities } from '../../services/pagbankApi';
import '../catalog/Catalog.css';
import '../finance/Finance.css';

const METHODS: PaymentMethod[] = [
  'dinheiro',
  'pix',
  'cartao_debito',
  'cartao_credito',
  'vale',
];

export type PayRow = {
  method: PaymentMethod;
  amount: string;
  /** Parte da divisão de conta (valor fixo). */
  splitLabel?: string;
};

export function paymentsFromOrder(order: Order): PayRow[] {
  if (order.billSplits?.length) {
    return order.billSplits.map((s) => ({
      method: 'dinheiro',
      amount: String(Number(s.amount).toFixed(2)),
      splitLabel: s.label,
    }));
  }
  const paid = (order.payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Math.max(0, Number(order.total) - paid);
  if (remaining > 0.01) {
    return [{ method: 'dinheiro', amount: String(remaining.toFixed(2)) }];
  }
  return [{ method: 'dinheiro', amount: '' }];
}

type PdvCloseOrderContentProps = {
  initialOrderId?: string;
  orderType?: OrderType;
  paymentOnly?: boolean;
  inModal?: boolean;
  onClose?: () => void;
  onSavingChange?: (saving: boolean) => void;
  onOrderClosed?: () => void;
  onOrderUpdated?: (order: Order) => void;
};

const PdvCloseOrderContent: React.FC<PdvCloseOrderContentProps> = ({
  initialOrderId = '',
  orderType,
  paymentOnly = false,
  inModal = false,
  onClose,
  onSavingChange,
  onOrderClosed,
  onOrderUpdated,
}) => {
  const { user } = useContext(AuthContext) || {};
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderId, setOrderId] = useState(initialOrderId);
  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<PayRow[]>([{ method: 'dinheiro', amount: '' }]);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<AlertState>({ isOpen: false, message: '', type: 'error' });
  const [pagbankCaps, setPagbankCaps] = useState<PagbankCapabilities | null>(null);
  const [showPagbankPix, setShowPagbankPix] = useState(false);
  const [showPagbankHosted, setShowPagbankHosted] = useState(false);
  const canOperate = Boolean(user);

  const paymentMethodOptions = useMemo(
    () => METHODS.map((m) => ({ value: m, label: paymentMethodLabel(m) })),
    [],
  );

  const loadOrders = useCallback(async () => {
    const { data } = await api.get<Order[]>('/orders', {
      params: {
        openOnly: true,
        limit: 50,
        ...(orderType ? { type: orderType } : {}),
      },
    });
    setOrders(data);
  }, [orderType]);

  useEffect(() => {
    if (canOperate) loadOrders();
  }, [canOperate, loadOrders]);

  useEffect(() => {
    setOrderId(initialOrderId);
  }, [initialOrderId]);

  useEffect(() => {
    onSavingChange?.(saving);
  }, [saving, onSavingChange]);

  useEffect(() => {
    if (!canOperate) return;
    fetchPagbankCapabilities()
      .then(setPagbankCaps)
      .catch(() => setPagbankCaps(null));
  }, [canOperate]);

  const reloadOrder = useCallback(() => {
    if (!orderId) return;
    api.get<Order>(`/orders/${orderId}`).then(({ data }) => {
      setOrder(data);
      setPayments(paymentsFromOrder(data));
    });
  }, [orderId]);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setPayments([{ method: 'dinheiro', amount: '' }]);
      return;
    }
    reloadOrder();
  }, [orderId, reloadOrder]);

  const paySum = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const paidSoFar = order
    ? (order.payments ?? []).reduce((s, p) => s + Number(p.amount), 0)
    : 0;
  const remaining = order ? Math.max(0, Number(order.total) - paidSoFar) : 0;
  const usingBillSplits = Boolean(order?.billSplits?.length);

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;
    setSaving(true);
    try {
      if (paymentOnly) {
        const validPayments = payments
          .map((p) => ({ method: p.method, amount: Number(p.amount) || 0 }))
          .filter((p) => p.amount > 0);
        if (validPayments.length === 0) {
          setAlert({ isOpen: true, message: 'Informe pelo menos um pagamento válido.', type: 'error' });
          return;
        }
        for (const payment of validPayments) {
          await api.post<Order>(`/orders/${orderId}/payments`, payment);
        }
        const { data: refreshedOrder } = await api.get<Order>(`/orders/${orderId}`);
        setOrder(refreshedOrder);
        setPayments(paymentsFromOrder(refreshedOrder));
        onOrderUpdated?.(refreshedOrder);
        await loadOrders();
        if (inModal) {
          onClose?.();
        } else {
          setAlert({ isOpen: true, message: 'Pagamento registrado com sucesso.', type: 'success' });
        }
      } else {
        const { data: closedOrder } = await api.post<Order>(`/orders/${orderId}/close`, {
          payments: payments.map((p) => ({
            method: p.method,
            amount: Number(p.amount),
          })),
        });
        if (closedOrder.tableId) {
          try {
            await api.post(`/mobile/tables/${closedOrder.tableId}/free`);
          } catch {
            /* mesa pode já estar livre; close no backend já liberou */
          }
        }
        const mesaMsg = closedOrder.tableLabel?.trim() || closedOrder.tableId
          ? 'Pedido fechado e mesa liberada.'
          : 'Pedido fechado com sucesso';
        if (inModal) {
          onOrderClosed?.();
          onClose?.();
        } else {
          setAlert({ isOpen: true, message: mesaMsg, type: 'success' });
          setOrderId('');
          setOrder(null);
          await loadOrders();
        }
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setAlert({
        isOpen: true,
        message: ax.response?.data?.message || (paymentOnly ? 'Erro ao registrar pagamento' : 'Erro ao fechar pedido'),
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const orderOptions = orders.map((o) => ({
    value: o.id,
    label: `#${o.orderNumber} — ${formatMoney(o.total)}`,
  }));

  const removePayment = (index: number) => {
    setPayments((p) => p.filter((_, i) => i !== index));
  };

  const paymentRows = (
    <div className="pdv-close-order-payments">
      {payments.map((row, i) => (
        <div
          key={row.splitLabel ? `${row.splitLabel}-${i}` : i}
          className={`pdv-close-order-payment-row${row.splitLabel ? ' pdv-close-order-payment-row--split' : ''}`}
        >
          {row.splitLabel ? (
            <div className="pdv-close-order-payment-row__part">
              <span className="catalog-section-kicker">Parte da divisão</span>
              <p className="pdv-close-order-payment-row__part-name">{row.splitLabel}</p>
              <p className="pdv-close-order-payment-row__part-amount">{formatMoney(row.amount)}</p>
            </div>
          ) : null}
          <div className="catalog-form-grid pdv-close-order-payment-row__fields">
            <PremiumSelect
              label={row.splitLabel ? 'Forma de pagamento desta parte' : 'Forma de pagamento'}
              value={row.method}
              options={paymentMethodOptions}
              onChange={(v) => {
                const next = [...payments];
                next[i] = { ...next[i], method: v as PaymentMethod };
                setPayments(next);
              }}
              disabled={saving}
              menuInPortal={inModal}
            />
            {!row.splitLabel ? (
              <FinanceField label="Valor (R$)" htmlFor={`pay-amount-${i}`}>
                <input
                  id={`pay-amount-${i}`}
                  className="premium-text-input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={row.amount}
                  disabled={saving}
                  onChange={(e) => {
                    const next = [...payments];
                    next[i] = { ...next[i], amount: e.target.value };
                    setPayments(next);
                  }}
                />
              </FinanceField>
            ) : null}
            {payments.length > 1 && (
              <button
                type="button"
                className="pdv-close-order-payment-row__remove"
                title="Remover este pagamento"
                disabled={saving}
                onClick={() => removePayment(i)}
                aria-label={`Remover pagamento ${row.splitLabel || i + 1}`}
              >
                ×
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const pagbankBlocks =
    order && pagbankCaps ? (
      <>
        {pagbankCaps.hostedCheckout ? (
          <div className="pagbank-pdv-block">
            <button
              type="button"
              className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
              disabled={saving}
              onClick={() => setShowPagbankHosted((v) => !v)}
            >
              {showPagbankHosted ? 'Ocultar checkout PagBank' : 'Checkout hospedado PagBank'}
            </button>
            {showPagbankHosted && (
              <PagbankHostedCheckoutPanel
                orderId={order.id}
                onPaid={(tx) => {
                  reloadOrder();
                  setAlert({
                    isOpen: true,
                    message: tx.pdvPaymentRegistered
                      ? 'Pagamento confirmado e registrado no pedido.'
                      : 'Pagamento confirmado no PagBank. Verifique o pedido antes de fechar.',
                    type: 'success',
                  });
                }}
              />
            )}
          </div>
        ) : null}
        {pagbankCaps.pixApi ? (
          <div className="pagbank-pdv-block">
            <button
              type="button"
              className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
              disabled={saving}
              onClick={() => setShowPagbankPix((v) => !v)}
            >
              {showPagbankPix ? 'Ocultar PIX PagBank' : 'Cobrar PIX via PagBank'}
            </button>
            {showPagbankPix && (
              <PagbankPixCheckoutPanel
                orderId={order.id}
                orderTotal={Number(order.total)}
                onPaid={(tx) => {
                  reloadOrder();
                  setAlert({
                    isOpen: true,
                    message: tx.pdvPaymentRegistered
                      ? 'PIX confirmado e pagamento registrado no pedido. Feche o pedido quando quiser.'
                      : 'PIX confirmado no PagBank. Verifique os pagamentos do pedido antes de fechar.',
                    type: 'success',
                  });
                }}
              />
            )}
          </div>
        ) : null}
      </>
    ) : null;

  const orderSummary = order ? (
    <section className="catalog-stats-grid pdv-close-order-stats" aria-label="Resumo do pedido">
      <article className="catalog-stat-card">
        <span>Pedido</span>
        <strong>#{order.orderNumber}</strong>
      </article>
      <article className="catalog-stat-card">
        <span>Total</span>
        <strong>{formatMoney(order.total)}</strong>
      </article>
      <article className="catalog-stat-card">
        <span>Já registrado</span>
        <strong>{formatMoney(paidSoFar)}</strong>
      </article>
      <article className="catalog-stat-card">
        <span>Restante</span>
        <strong>{formatMoney(remaining)}</strong>
        <p>Soma informada: {formatMoney(paySum)}</p>
      </article>
    </section>
  ) : null;

  const toolbar = (
    <section className="finance-toolbar" aria-label="Selecionar pedido">
      <PremiumSelect
        label="Pedido aberto"
        value={orderId}
        onChange={setOrderId}
        options={[{ value: '', label: 'Selecione…' }, ...orderOptions]}
        menuInPortal={inModal}
      />
    </section>
  );

  const modalFooter = (
    <div className="app-modal-footer pdv-close-order-modal__footer">
      <button
        type="button"
        className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
        onClick={onClose}
        disabled={saving}
      >
        Cancelar
      </button>
      {!usingBillSplits ? (
        <button
          type="button"
          className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
          disabled={saving || !order}
          onClick={() => setPayments((p) => [...p, { method: 'pix', amount: '' }])}
        >
          + Pagamento
        </button>
      ) : null}
      <button
        type="submit"
        className={`catalog-form-footer-btn catalog-form-footer-btn--primary${saving ? ' is-loading' : ''}`}
        disabled={saving || !order}
      >
        {saving ? (paymentOnly ? 'Registrando…' : 'Fechando…') : paymentOnly ? 'Registrar pagamento' : 'Fechar pedido'}
      </button>
    </div>
  );

  const pageFooter = (
    <div className="catalog-form-footer">
      {!usingBillSplits ? (
        <button
          type="button"
          className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
          disabled={saving || !order}
          onClick={() => setPayments((p) => [...p, { method: 'pix', amount: '' }])}
        >
          + Pagamento
        </button>
      ) : null}
      <button
        type="submit"
        className={`catalog-form-footer-btn catalog-form-footer-btn--primary${saving ? ' is-loading' : ''}`}
        disabled={saving || !order}
      >
        {saving ? (paymentOnly ? 'Registrando…' : 'Fechando…') : paymentOnly ? 'Registrar pagamento' : 'Fechar pedido'}
      </button>
    </div>
  );

  if (!canOperate) {
    return <p className="catalog-empty">Acesso negado.</p>;
  }

  if (inModal) {
    return (
      <>
        <form className="finance-tx-modal-body pdv-close-order-modal__form" onSubmit={handleClose}>
          <div>
            <span className="catalog-section-kicker">Caixa</span>
            <p className="pdv-close-order-modal__hint">
              {usingBillSplits
                ? 'Escolha a forma de pagamento de cada parte da divisão e finalize o pedido.'
                : paymentOnly
                  ? 'Registre os pagamentos para liberar envio à produção.'
                  : 'Registre os pagamentos e finalize o pedido para encerrar a conta.'}
            </p>
          </div>
          {toolbar}
          {order ? (
            <>
              {orderSummary}
              {paymentRows}
              {pagbankBlocks}
              {modalFooter}
            </>
          ) : (
            <p className="catalog-empty">Selecione um pedido aberto para receber o pagamento.</p>
          )}
        </form>
        <AlertModal
          isOpen={alert.isOpen}
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert((a) => ({ ...a, isOpen: false }))}
        />
      </>
    );
  }

  return (
    <>
      {toolbar}
      {order ? (
        <form className="catalog-form pdv-close-order-form" onSubmit={handleClose}>
          {orderSummary}
          {paymentRows}
          {pagbankBlocks}
          {pageFooter}
        </form>
      ) : (
        <p className="catalog-empty">Selecione um pedido aberto para receber o pagamento.</p>
      )}
      <AlertModal
        isOpen={alert.isOpen}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert((a) => ({ ...a, isOpen: false }))}
      />
    </>
  );
};

export default PdvCloseOrderContent;
