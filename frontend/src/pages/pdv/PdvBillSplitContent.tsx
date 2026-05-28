import React, { useCallback, useContext, useEffect, useState } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import AlertModal from '../../components/AlertModal';
import PremiumSelect from '../../components/PremiumSelect';
import { AlertState, Order, OrderType } from '../../types';
import { FinanceField, FinanceFormActions } from '../finance/financeShared';
import { formatMoney } from './pdvUtils';
import '../catalog/Catalog.css';
import '../finance/Finance.css';

export type SplitRow = { label: string; amount: string };

const DEFAULT_SPLITS: SplitRow[] = [{ label: 'Pessoa 1', amount: '' }];

type PdvBillSplitContentProps = {
  initialOrderId?: string;
  orderType?: OrderType;
  onOrderChange?: (order: Order | null) => void;
  /** Layout e rodapé no padrão app-modal (PDV online). */
  inModal?: boolean;
  onClose?: () => void;
  onSavingChange?: (saving: boolean) => void;
  /** Após salvar no modal, segue para pagamento (ex.: PDV online/tablet). */
  onProceedToPayment?: (order: Order) => void;
};

const PdvBillSplitContent: React.FC<PdvBillSplitContentProps> = ({
  initialOrderId = '',
  orderType,
  onOrderChange,
  inModal = false,
  onClose,
  onSavingChange,
  onProceedToPayment,
}) => {
  const { user } = useContext(AuthContext) || {};
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderId, setOrderId] = useState(initialOrderId);
  const [order, setOrder] = useState<Order | null>(null);
  const [splits, setSplits] = useState<SplitRow[]>(DEFAULT_SPLITS);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<AlertState>({ isOpen: false, message: '', type: 'error' });
  const canOperate = Boolean(user);

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
    if (!orderId) {
      setOrder(null);
      onOrderChange?.(null);
      setSplits(DEFAULT_SPLITS);
      return;
    }
    api.get<Order>(`/orders/${orderId}`).then(({ data }) => {
      setOrder(data);
      onOrderChange?.(data);
      if (data.billSplits?.length) {
        setSplits(
          data.billSplits.map((s) => ({
            label: s.label,
            amount: String(s.amount),
          })),
        );
      } else {
        setSplits(DEFAULT_SPLITS);
      }
    });
  }, [orderId]);

  const orderOptions = orders.map((o) => ({
    value: o.id,
    label: `#${o.orderNumber} — ${formatMoney(o.total)}`,
  }));

  const splitSum = splits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;
    setSaving(true);
    try {
      await api.post(`/orders/${orderId}/splits`, {
        splits: splits.map((s) => ({
          label: s.label.trim(),
          amount: Number(s.amount),
        })),
      });
      const { data } = await api.get<Order>(`/orders/${orderId}`);
      setOrder(data);
      onOrderChange?.(data);
      if (inModal) {
        if (onProceedToPayment) {
          onProceedToPayment(data);
        } else {
          onClose?.();
        }
      } else {
        setAlert({ isOpen: true, message: 'Divisão salva', type: 'success' });
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setAlert({
        isOpen: true,
        message: ax.response?.data?.message || 'Erro ao salvar divisão',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!canOperate) {
    return <p className="catalog-empty">Acesso negado.</p>;
  }

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

  const removeSplit = (index: number) => {
    setSplits((s) => s.filter((_, i) => i !== index));
  };

  const splitRows = (
    <div className="pdv-bill-split-rows">
      {splits.map((row, i) => (
        <div key={i} className="catalog-form-grid pdv-bill-split-row">
          <FinanceField label="Nome" htmlFor={`split-label-${i}`}>
            <input
              id={`split-label-${i}`}
              className="premium-text-input"
              value={row.label}
              disabled={saving}
              onChange={(e) => {
                const next = [...splits];
                next[i] = { ...next[i], label: e.target.value };
                setSplits(next);
              }}
            />
          </FinanceField>
          <FinanceField label="Valor (R$)" htmlFor={`split-amount-${i}`}>
            <input
              id={`split-amount-${i}`}
              className="premium-text-input"
              type="number"
              min="0.01"
              step="0.01"
              value={row.amount}
              disabled={saving}
              onChange={(e) => {
                const next = [...splits];
                next[i] = { ...next[i], amount: e.target.value };
                setSplits(next);
              }}
            />
          </FinanceField>
          {splits.length > 1 && (
            <button
              type="button"
              className="pdv-bill-split-row__remove"
              title="Remover esta divisão"
              disabled={saving}
              onClick={() => removeSplit(i)}
              aria-label={`Remover ${row.label || `Pessoa ${i + 1}`}`}
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );

  const splitSummary = order ? (
    <section className="catalog-stats-grid pdv-bill-split-stats" aria-label="Resumo da divisão">
      <article className="catalog-stat-card">
        <span>Total do pedido</span>
        <strong>{formatMoney(order.total)}</strong>
      </article>
      <article className="catalog-stat-card">
        <span>Soma das partes</span>
        <strong>{formatMoney(splitSum)}</strong>
        <p>Deve coincidir com o total para fechar a conta.</p>
      </article>
    </section>
  ) : null;

  const pageActions = (
    <FinanceFormActions>
      <button
        type="button"
        className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
        disabled={saving}
        onClick={() => setSplits((s) => [...s, { label: `Pessoa ${s.length + 1}`, amount: '' }])}
      >
        + Parte
      </button>
      <button
        type="submit"
        className={`catalog-form-footer-btn catalog-form-footer-btn--primary${saving ? ' is-loading' : ''}`}
        disabled={saving || !order}
      >
        {saving ? 'Salvando…' : 'Salvar divisão'}
      </button>
    </FinanceFormActions>
  );

  const modalActions = (
    <div className="app-modal-footer pdv-bill-split-modal__footer">
      <button
        type="button"
        className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
        onClick={onClose}
        disabled={saving}
      >
        Cancelar
      </button>
      <button
        type="button"
        className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
        disabled={saving || !order}
        onClick={() => setSplits((s) => [...s, { label: `Pessoa ${s.length + 1}`, amount: '' }])}
      >
        + Parte
      </button>
      <button
        type="submit"
        className={`catalog-form-footer-btn catalog-form-footer-btn--primary${saving ? ' is-loading' : ''}`}
        disabled={saving || !order}
      >
        {saving ? 'Salvando…' : 'Salvar divisão'}
      </button>
    </div>
  );

  if (inModal) {
    return (
      <>
        <form className="finance-tx-modal-body pdv-bill-split-modal__form" onSubmit={handleSave}>
          <div>
            <span className="catalog-section-kicker">Conta</span>
            <p className="pdv-bill-split-modal__hint">Partes da divisão entre pessoas ou pagamentos.</p>
          </div>
          {toolbar}
          {order ? (
            <>
              {splitSummary}
              {splitRows}
            </>
          ) : (
            <p className="catalog-empty">Selecione um pedido aberto para dividir a conta.</p>
          )}
          {modalActions}
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
      <form className="catalog-form pdv-bill-split-form" onSubmit={handleSave}>
        {order ? (
          <>
            {splitSummary}
            {splitRows}
            {pageActions}
          </>
        ) : (
          <p className="catalog-empty">Selecione um pedido aberto para dividir a conta.</p>
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
};

export default PdvBillSplitContent;
