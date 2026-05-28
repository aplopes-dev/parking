import React, { useState } from 'react';
import PremiumSelect from '../../components/PremiumSelect';
import PagbankSplitCustodyPanel from './PagbankSplitCustodyPanel';
import { ReceiverForm } from './paymentSettings.types';
import { syncConnectSplitReceivers } from '../../services/pagbankApi';

type Props = {
  canManage: boolean;
  splitMethod: 'FIXED' | 'PERCENTAGE';
  masterAccountId: string;
  transferInterest: boolean;
  transferShipping: boolean;
  custodyEnabled: boolean;
  custodyScheduledDefault: string;
  connectAutoSync: boolean;
  connectSplitPercentEach: string;
  receivers: ReceiverForm[];
  percentageTotal: number;
  splitsPreview: unknown;
  onConnectAutoSyncChange: (v: boolean) => void;
  onConnectSplitPercentChange: (v: string) => void;
  onReceiversSynced?: (receivers: ReceiverForm[]) => void;
  onSplitMethodChange: (v: 'FIXED' | 'PERCENTAGE') => void;
  onMasterChange: (v: string) => void;
  onTransferInterestChange: (v: boolean) => void;
  onTransferShippingChange: (v: boolean) => void;
  onCustodyChange: (v: boolean) => void;
  onCustodyScheduledChange: (v: string) => void;
  onReceiversChange: (r: ReceiverForm[]) => void;
};

const emptyReceiver = (role: 'master' | 'secondary' = 'secondary', sortOrder = 0): ReceiverForm => ({
  label: '',
  pagbankAccountId: '',
  role,
  amountValue: role === 'master' ? '0' : '',
  isLiable: false,
  active: true,
  sortOrder,
});

const PaymentPagbankSplitSection: React.FC<Props> = ({
  canManage,
  splitMethod,
  masterAccountId,
  transferInterest,
  transferShipping,
  custodyEnabled,
  custodyScheduledDefault,
  connectAutoSync,
  connectSplitPercentEach,
  receivers,
  percentageTotal,
  splitsPreview,
  onConnectAutoSyncChange,
  onConnectSplitPercentChange,
  onReceiversSynced,
  onSplitMethodChange,
  onMasterChange,
  onTransferInterestChange,
  onTransferShippingChange,
  onCustodyChange,
  onCustodyScheduledChange,
  onReceiversChange,
}) => {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const amountLabel = splitMethod === 'PERCENTAGE' ? 'Percentual (%)' : 'Valor fixo (centavos)';

  const runConnectSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await syncConnectSplitReceivers();
      setSyncMsg(
        res.skipped
          ? 'Ative a sincronização automática ou salve as configurações antes de sincronizar.'
          : `Sincronizado: ${res.created} criado(s), ${res.updated} atualizado(s). Recarregue após salvar.`,
      );
      if (!res.skipped && onReceiversSynced) {
        onReceiversSynced([]);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Falha ao sincronizar contas Connect';
      setSyncMsg(msg);
    } finally {
      setSyncing(false);
    }
  };

  const updateReceiver = (index: number, patch: Partial<ReceiverForm>) => {
    onReceiversChange(receivers.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  return (
    <>
      <p className="payment-settings-doc">
        Divisão automática entre recebedores via <code>charges.splits</code>.{' '}
        <a
          href="https://developer.pagbank.com.br/reference/divisao-de-pagamento"
          target="_blank"
          rel="noreferrer"
        >
          Documentação PagBank
        </a>
        .
      </p>

      <div className="catalog-form-grid">
        <PremiumSelect
          label="Método de divisão"
          value={splitMethod}
          onChange={(v) => onSplitMethodChange(v as 'FIXED' | 'PERCENTAGE')}
          options={[
            { value: 'PERCENTAGE', label: 'Percentual (%)' },
            { value: 'FIXED', label: 'Valor fixo (centavos)' },
          ]}
          disabled={!canManage}
        />
        <div className="form-group">
          <label htmlFor="pagbank-master">Conta adquirente (ACCO_…)</label>
          <input
            id="pagbank-master"
            className="premium-text-input"
            value={masterAccountId}
            onChange={(e) => onMasterChange(e.target.value)}
            disabled={!canManage}
          />
        </div>
      </div>

      <div className="catalog-form-grid" style={{ marginTop: 8 }}>
        <label className="form-group">
          <span className="catalog-checkbox-label">
            <input
              type="checkbox"
              checked={transferInterest}
              onChange={(e) => onTransferInterestChange(e.target.checked)}
              disabled={!canManage}
            />
            Repassar juros ao sub-recebedor
          </span>
        </label>
        <label className="form-group">
          <span className="catalog-checkbox-label">
            <input
              type="checkbox"
              checked={transferShipping}
              onChange={(e) => onTransferShippingChange(e.target.checked)}
              disabled={!canManage}
            />
            Repassar frete ao sub-recebedor
          </span>
        </label>
        <label className="form-group">
          <span className="catalog-checkbox-label">
            <input
              type="checkbox"
              checked={custodyEnabled}
              onChange={(e) => onCustodyChange(e.target.checked)}
              disabled={!canManage}
            />
            Custódia (liberação manual)
          </span>
        </label>
        <label className="form-group">
          <span className="catalog-checkbox-label">
            <input
              type="checkbox"
              checked={connectAutoSync}
              onChange={(e) => onConnectAutoSyncChange(e.target.checked)}
              disabled={!canManage}
            />
            Usar contas Connect como recebedores secundários (automático)
          </span>
        </label>
      </div>

      <div className="catalog-form-grid" style={{ marginTop: 8 }}>
        <div className="form-group">
          <label>% fixo por conta Connect (opcional)</label>
          <input
            className="premium-text-input"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={connectSplitPercentEach}
            onChange={(e) => onConnectSplitPercentChange(e.target.value)}
            placeholder="Vazio = divide o restante entre contas Connect"
            disabled={!canManage}
          />
        </div>
        <div className="form-group" style={{ alignSelf: 'end' }}>
          <button
            type="button"
            className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
            onClick={runConnectSync}
            disabled={!canManage || syncing}
          >
            {syncing ? 'Sincronizando…' : 'Sincronizar contas Connect agora'}
          </button>
        </div>
      </div>
      {syncMsg && (
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '8px 0' }}>{syncMsg}</p>
      )}

      {splitMethod === 'PERCENTAGE' && (
        <div style={{ margin: '16px 0' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Total: <strong>{percentageTotal.toFixed(2)}%</strong>
          </span>
          <div className="payment-pct-bar">
            <div
              className={`payment-pct-bar-fill${percentageTotal > 100 ? ' is-over' : ''}`}
              style={{ width: `${Math.min(percentageTotal, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="payment-receivers-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Conta</th>
              <th>Origem</th>
              <th>Papel</th>
              <th>{amountLabel}</th>
              <th>Liable</th>
              <th>Ativo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {receivers.map((r, i) => (
              <tr key={r.id || `r-${i}`}>
                <td>
                  <input
                    className="premium-text-input"
                    value={r.label}
                    onChange={(e) => updateReceiver(i, { label: e.target.value })}
                    disabled={!canManage}
                  />
                </td>
                <td>
                  <input
                    className="premium-text-input"
                    value={r.pagbankAccountId}
                    onChange={(e) => updateReceiver(i, { pagbankAccountId: e.target.value })}
                    disabled={!canManage || Boolean(r.connectAccountId)}
                  />
                </td>
                <td>{r.connectAccountId ? 'Connect' : 'Manual'}</td>
                <td>
                  <select
                    className="premium-text-input"
                    value={r.role}
                    onChange={(e) =>
                      updateReceiver(i, { role: e.target.value as 'master' | 'secondary' })
                    }
                    disabled={!canManage}
                  >
                    <option value="master">Adquirente</option>
                    <option value="secondary">Secundário</option>
                  </select>
                </td>
                <td>
                  <input
                    className="premium-text-input"
                    type="number"
                    min="0"
                    value={r.amountValue}
                    onChange={(e) => updateReceiver(i, { amountValue: e.target.value })}
                    disabled={!canManage}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={r.isLiable}
                    onChange={(e) => updateReceiver(i, { isLiable: e.target.checked })}
                    disabled={!canManage}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={r.active}
                    onChange={(e) => updateReceiver(i, { active: e.target.checked })}
                    disabled={!canManage}
                  />
                </td>
                <td>
                  {canManage && receivers.length > 1 && (
                    <button
                      type="button"
                      className="catalog-action-button is-secondary"
                      style={{ minWidth: 'auto', height: 36, padding: '0 10px' }}
                      onClick={() => onReceiversChange(receivers.filter((_, j) => j !== i))}
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canManage && (
        <button
          type="button"
          className="catalog-action-button is-secondary payment-add-receiver"
          onClick={() => onReceiversChange([...receivers, emptyReceiver('secondary', receivers.length)])}
        >
          + Recebedor
        </button>
      )}

      <PagbankSplitCustodyPanel
        canManage={canManage}
        custodyEnabled={custodyEnabled}
        custodyScheduledDefault={custodyScheduledDefault}
        receivers={receivers}
        onCustodyScheduledChange={onCustodyScheduledChange}
      />

      {splitsPreview != null && (
        <pre className="payment-preview-json">{JSON.stringify(splitsPreview, null, 2)}</pre>
      )}
    </>
  );
};

export default PaymentPagbankSplitSection;
