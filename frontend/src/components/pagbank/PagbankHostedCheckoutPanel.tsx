import React, { useCallback, useEffect, useRef, useState } from 'react';
import LoadingSpinner from '../LoadingSpinner';
import {
  PagbankTransaction,
  pagbankHostedCheckout,
  refreshPagbankTransaction,
} from '../../services/pagbankApi';
import './PagbankPixCheckoutPanel.css';

type Props = {
  orderId: string;
  onPaid?: (tx: PagbankTransaction) => void;
};

function payUrl(tx: PagbankTransaction | null): string | undefined {
  const cd = tx?.checkoutData as { payUrl?: string } | null | undefined;
  return cd?.payUrl;
}

const PagbankHostedCheckoutPanel: React.FC<Props> = ({ orderId, onPaid }) => {
  const [loading, setLoading] = useState(false);
  const [tx, setTx] = useState<PagbankTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const paidRef = useRef(false);

  const poll = useCallback(
    async (transactionId: string) => {
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
    },
    [onPaid],
  );

  useEffect(() => {
    if (!tx?.id || tx.status === 'paid' || tx.status === 'canceled') return undefined;
    const id = window.setInterval(() => poll(tx.id), 5000);
    return () => window.clearInterval(id);
  }, [tx?.id, tx?.status, poll]);

  const start = async () => {
    setLoading(true);
    setError(null);
    paidRef.current = false;
    try {
      const created = await pagbankHostedCheckout({ orderId });
      setTx(created);
      const url = payUrl(created);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      if (created.status === 'paid') onPaid?.(created);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Falha ao abrir checkout PagBank';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const url = payUrl(tx);

  return (
    <div className="pagbank-pix-panel">
      <p className="pagbank-pix-hint">
        O cliente será redirecionado para a página de pagamento hospedada do PagBank (cartão, PIX,
        boleto).
      </p>
      {error && <p className="pagbank-pix-error">{error}</p>}
      {tx && (
        <p className="pagbank-pix-status">
          Status: <strong>{tx.status}</strong>
          {tx.pdvPaymentRegistered ? ' — registrado no PDV' : ''}
        </p>
      )}
      <div className="pagbank-pix-actions">
        <button
          type="button"
          className="catalog-form-footer-btn catalog-form-footer-btn--primary"
          onClick={start}
          disabled={loading}
        >
          {loading ? <LoadingSpinner size="sm" /> : 'Abrir checkout PagBank'}
        </button>
        {url && (
          <a
            className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            Reabrir link de pagamento
          </a>
        )}
      </div>
    </div>
  );
};

export default PagbankHostedCheckoutPanel;
