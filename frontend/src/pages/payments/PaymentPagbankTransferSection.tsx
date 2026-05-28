import React, { useCallback, useEffect, useState } from 'react';
import {
  PagbankTransferLocal,
  createPagbankTransfer,
  listPagbankTransfers,
} from '../../services/pagbankApi';

type Props = { canManage: boolean };

const PaymentPagbankTransferSection: React.FC<Props> = ({ canManage }) => {
  const [rows, setRows] = useState<PagbankTransferLocal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'P2P' | 'PIX'>('P2P');
  const [accountId, setAccountId] = useState('');
  const [pixKey, setPixKey] = useState('');

  const reload = useCallback(async () => {
    try {
      setRows(await listPagbankTransfers());
      setError(null);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Erro ao listar transferências',
      );
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const submit = async () => {
    setError(null);
    const cents = Math.round(Number(amount) * 100) || Number(amount);
    try {
      await createPagbankTransfer({
        amountCents: cents,
        instrumentType: type,
        p2p: type === 'P2P' ? { accountId: accountId.trim() || undefined } : undefined,
        pix: type === 'PIX' ? { key: pixKey.trim() } : undefined,
      });
      setAmount('');
      await reload();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Erro ao transferir',
      );
    }
  };

  return (
    <div className="payment-tools-block">
      <p className="payment-settings-doc">
        Transferências P2P ou PIX via{' '}
        <a
          href="https://developer.pagbank.com.br/reference/criar-transferencia"
          target="_blank"
          rel="noreferrer"
        >
          API Transferências
        </a>
        . Requer homologação PagBank e fluxo <code>transfer_balance</code> ativo. URL de notificação
        em Geral.
      </p>
      {error && <p className="pagbank-pix-error">{error}</p>}

      <div className="catalog-form-grid">
        <div className="form-group">
          <label>Valor (centavos ou reais)</label>
          <input
            className="premium-text-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!canManage}
          />
        </div>
        <div className="form-group">
          <label>Tipo</label>
          <select
            className="premium-text-input"
            value={type}
            onChange={(e) => setType(e.target.value as 'P2P' | 'PIX')}
            disabled={!canManage}
          >
            <option value="P2P">P2P (conta PagBank)</option>
            <option value="PIX">PIX</option>
          </select>
        </div>
        {type === 'P2P' ? (
          <div className="form-group">
            <label>account_id destino (ACCO_…)</label>
            <input
              className="premium-text-input"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={!canManage}
            />
          </div>
        ) : (
          <div className="form-group">
            <label>Chave PIX</label>
            <input
              className="premium-text-input"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              disabled={!canManage}
            />
          </div>
        )}
      </div>
      {canManage && (
        <button
          type="button"
          className="catalog-form-footer-btn catalog-form-footer-btn--primary"
          onClick={submit}
        >
          Solicitar transferência
        </button>
      )}

      <h3 className="payment-tools-subtitle">Histórico local</h3>
      <ul className="payment-tools-list">
        {rows.map((t) => (
          <li key={t.id}>
            {t.instrumentType} — {(t.amountCents / 100).toFixed(2)} BRL — {t.status} —{' '}
            {t.pagbankTransferId ?? 'pendente'}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PaymentPagbankTransferSection;
