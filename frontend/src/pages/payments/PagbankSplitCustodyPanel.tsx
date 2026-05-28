import React, { useCallback, useEffect, useState } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  listPagbankTransactions,
  PagbankTransaction,
  queryPagbankSplit,
  releasePagbankCustody,
} from '../../services/pagbankApi';
import { ReceiverForm } from './paymentSettings.types';

type Props = {
  canManage: boolean;
  custodyEnabled: boolean;
  custodyScheduledDefault: string;
  receivers: ReceiverForm[];
  onCustodyScheduledChange: (v: string) => void;
};

/** Converte datetime-local para ISO com offset Brasil (-03:00) se não tiver fuso. */
function toIsoWithOffset(localValue: string): string {
  if (!localValue) return '';
  if (localValue.includes('T') && (localValue.includes('+') || localValue.endsWith('Z'))) {
    return localValue;
  }
  return `${localValue}:00-03:00`;
}

function fromIsoToLocal(iso: string | null): string {
  if (!iso) return '';
  const d = iso.slice(0, 16);
  return d.length >= 16 ? d : '';
}

const PagbankSplitCustodyPanel: React.FC<Props> = ({
  canManage,
  custodyEnabled,
  custodyScheduledDefault,
  receivers,
  onCustodyScheduledChange,
}) => {
  const [transactions, setTransactions] = useState<PagbankTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listPagbankTransactions();
      setTransactions(
        rows.filter(
          (t) =>
            t.pagbankSplitId &&
            (t.status === 'paid' || t.status === 'waiting_payment'),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (custodyEnabled) void load();
  }, [custodyEnabled, load]);

  const releaseAll = async (tx: PagbankTransaction) => {
    setActingId(tx.id);
    setMessage(null);
    try {
      const ids = receivers
        .filter((r) => r.active && r.pagbankAccountId.trim())
        .map((r) => r.pagbankAccountId.trim());
      await releasePagbankCustody(tx.id, ids.length ? ids : undefined);
      setMessage(`Custódia liberada — transação ${tx.id.slice(0, 8)}…`);
      await load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Falha ao liberar custódia';
      setMessage(msg);
    } finally {
      setActingId(null);
    }
  };

  const inspect = async (tx: PagbankTransaction) => {
    setActingId(tx.id);
    try {
      const data = await queryPagbankSplit(tx.id);
      setMessage(`Split ${data.pagbankSplitId}: consulta OK (ver rede para detalhes)`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Falha na consulta';
      setMessage(msg);
    } finally {
      setActingId(null);
    }
  };

  if (!custodyEnabled) {
    return (
      <p className="payment-field-hint">
        Ative &quot;Custódia (liberação manual)&quot; acima para agendar e liberar valores retidos.
      </p>
    );
  }

  return (
    <div className="payment-custody-panel">
      <h4>Custódia PagBank</h4>
      <p className="payment-settings-doc">
        Data padrão usada em novos checkouts com fluxo <code>split_custody</code>. Formato ISO com
        fuso (ex.: 2025-12-01T18:00:00-03:00).
      </p>

      <div className="form-group">
        <label htmlFor="custody-scheduled">Liberação agendada (padrão)</label>
        <input
          id="custody-scheduled"
          type="datetime-local"
          className="premium-text-input"
          value={fromIsoToLocal(custodyScheduledDefault)}
          onChange={(e) => onCustodyScheduledChange(toIsoWithOffset(e.target.value))}
          disabled={!canManage}
        />
      </div>

      <div className="payment-custody-toolbar">
        <button
          type="button"
          className="catalog-action-button is-secondary"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? <LoadingSpinner size="sm" /> : 'Atualizar transações'}
        </button>
      </div>

      {message && <p className="payment-custody-msg">{message}</p>}

      {transactions.length === 0 && !loading ? (
        <p className="payment-field-hint">
          Nenhuma transação com split em custódia. Gere um pagamento com split + custódia no PDV.
        </p>
      ) : (
        <table className="payment-receivers-table payment-custody-table">
          <thead>
            <tr>
              <th>Transação</th>
              <th>Status</th>
              <th>Split ID</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td>
                  <code>{tx.id.slice(0, 8)}…</code>
                  {tx.orderId && (
                    <span className="payment-field-hint"> pedido {tx.orderId.slice(0, 8)}…</span>
                  )}
                </td>
                <td>{tx.status}</td>
                <td>
                  <code>{tx.pagbankSplitId?.slice(0, 12)}…</code>
                </td>
                <td className="payment-custody-actions">
                  {canManage && (
                    <>
                      <button
                        type="button"
                        className="catalog-action-button is-primary"
                        style={{ minWidth: 'auto', padding: '0 12px', height: 34 }}
                        disabled={actingId === tx.id}
                        onClick={() => void releaseAll(tx)}
                      >
                        Liberar custódia
                      </button>
                      <button
                        type="button"
                        className="catalog-action-button is-secondary"
                        style={{ minWidth: 'auto', padding: '0 10px', height: 34 }}
                        disabled={actingId === tx.id}
                        onClick={() => void inspect(tx)}
                      >
                        Consultar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PagbankSplitCustodyPanel;
