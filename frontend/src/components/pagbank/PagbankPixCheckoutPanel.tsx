import React, { useCallback, useEffect, useRef, useState } from 'react';
import LoadingSpinner from '../LoadingSpinner';
import {
  PagbankTransaction,
  pagbankCheckoutPix,
  refreshPagbankTransaction,
} from '../../services/pagbankApi';
import { formatMoney } from '../../pages/pdv/pdvUtils';
import './PagbankPixCheckoutPanel.css';

type PagbankPixCheckoutPanelProps = {
  orderId: string;
  orderTotal: number;
  onPaid?: (tx: PagbankTransaction) => void;
};

function extractPixText(tx: PagbankTransaction | null): string {
  if (!tx?.checkoutData) return '';
  const cd = tx.checkoutData;
  if (typeof cd.pixCopyPaste === 'string' && cd.pixCopyPaste) return cd.pixCopyPaste;
  const qr = cd.pixQrCode;
  if (Array.isArray(qr) && qr[0] && typeof qr[0] === 'object') {
    const first = qr[0] as { text?: string; links?: Array<{ href?: string }> };
    if (first.text) return first.text;
  }
  return '';
}

const PagbankPixCheckoutPanel: React.FC<PagbankPixCheckoutPanelProps> = ({
  orderId,
  orderTotal,
  onPaid,
}) => {
  const [loading, setLoading] = useState(false);
  const [tx, setTx] = useState<PagbankTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const paidRef = useRef(false);

  const poll = useCallback(async (transactionId: string) => {
    try {
      const updated = await refreshPagbankTransaction(transactionId);
      setTx(updated);
      if (updated.status === 'paid' && !paidRef.current) {
        paidRef.current = true;
        onPaid?.(updated);
      }
    } catch {
      /* mantém último estado */
    }
  }, [onPaid]);

  useEffect(() => {
    if (!tx?.id || tx.status === 'paid' || tx.status === 'canceled') return undefined;
    const id = window.setInterval(() => poll(tx.id), 4000);
    return () => window.clearInterval(id);
  }, [tx?.id, tx?.status, poll]);

  const startCheckout = async () => {
    setLoading(true);
    setError(null);
    paidRef.current = false;
    try {
      const created = await pagbankCheckoutPix({
        orderId,
        customerName: customerName.trim() || 'Cliente',
      });
      setTx(created);
      if (created.status === 'paid') onPaid?.(created);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Falha ao gerar cobrança PIX PagBank';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const pixText = extractPixText(tx);

  return (
    <div className="pagbank-pix-panel">
      <p className="pagbank-pix-panel-intro">
        Cobrança via API PagBank (PIX). Valor do pedido: <strong>{formatMoney(orderTotal)}</strong>
      </p>

      {!tx && (
        <>
          <div className="form-group">
            <label htmlFor="pagbank-customer-name">Nome do pagador</label>
            <input
              id="pagbank-customer-name"
              className="premium-text-input"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          {error && <p className="pagbank-pix-panel-error">{error}</p>}
          <button
            type="button"
            className="catalog-form-footer-btn catalog-form-footer-btn--primary"
            disabled={loading}
            onClick={startCheckout}
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" /> Gerando PIX…
              </>
            ) : (
              'Gerar QR Code PIX (PagBank)'
            )}
          </button>
        </>
      )}

      {tx && (
        <div className="pagbank-pix-panel-result">
          <p>
            Status: <strong>{tx.status}</strong>
            {tx.errorMessage && <span className="pagbank-pix-panel-error"> — {tx.errorMessage}</span>}
          </p>
          {pixText ? (
            <>
              <label className="pagbank-pix-panel-label" htmlFor="pagbank-pix-copy">
                Copia e cola PIX
              </label>
              <textarea
                id="pagbank-pix-copy"
                className="pagbank-pix-panel-copy"
                readOnly
                rows={4}
                value={pixText}
              />
              <button
                type="button"
                className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                onClick={() => navigator.clipboard.writeText(pixText)}
              >
                Copiar código
              </button>
            </>
          ) : (
            <p className="pagbank-pix-panel-hint">
              Aguardando dados do QR. Use &quot;Atualizar status&quot; ou aguarde a confirmação
              automática.
            </p>
          )}
          <div className="pagbank-pix-panel-actions">
            <button
              type="button"
              className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
              disabled={loading}
              onClick={() => poll(tx.id)}
            >
              Atualizar status
            </button>
            <button
              type="button"
              className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
              onClick={() => setTx(null)}
            >
              Nova cobrança
            </button>
          </div>
          {tx.status === 'paid' && (
            <p className="pagbank-pix-panel-success">
              Pagamento confirmado no PagBank.
              {tx.pdvPaymentRegistered
                ? ' Valor registrado no pedido PDV.'
                : ' Atualize o pedido no caixa se o valor ainda não aparecer.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PagbankPixCheckoutPanel;
