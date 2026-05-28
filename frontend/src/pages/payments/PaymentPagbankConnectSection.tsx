import React, { useState } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  confirmConnectSms,
  getConnectAuthorizeUrl,
  listConnectAccounts,
  PagbankConnectAccount,
  requestConnectSms,
} from '../../services/pagbankApi';

type Props = {
  canManage: boolean;
  clientId: string;
  redirectUri: string;
  connectSecretSet: boolean;
  onRedirectUriChange: (v: string) => void;
};

const defaultCallback = () =>
  `${window.location.origin}/api/payments/pagbank/connect/callback`;

const PaymentPagbankConnectSection: React.FC<Props> = ({
  canManage,
  clientId,
  redirectUri,
  connectSecretSet,
  onRedirectUriChange,
}) => {
  const [accounts, setAccounts] = useState<PagbankConnectAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [smsBranch, setSmsBranch] = useState('');
  const [smsAccount, setSmsAccount] = useState('');
  const [smsSessionId, setSmsSessionId] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [smsPhone, setSmsPhone] = useState('');

  const loadAccounts = async () => {
    setLoading(true);
    try {
      setAccounts(await listConnectAccounts());
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void loadAccounts();
  }, []);

  const openOAuth = async () => {
    const uri = redirectUri.trim() || defaultCallback();
    const { url } = await getConnectAuthorizeUrl(uri);
    window.open(url, 'pagbank_connect', 'width=600,height=700');
  };

  const startSms = async () => {
    const res = await requestConnectSms(smsBranch.trim(), smsAccount.trim());
    setSmsSessionId(res.smsSessionId);
    setSmsPhone(res.phoneNumber);
  };

  const confirmSms = async () => {
    await confirmConnectSms({
      smsSessionId,
      code: smsCode.trim(),
      bankBranch: smsBranch.trim(),
      accountNumber: smsAccount.trim(),
    });
    setSmsCode('');
    await loadAccounts();
  };

  const configured = Boolean(clientId.trim() && connectSecretSet);

  return (
    <div className="payment-connect-block">
      <p className="payment-settings-doc">
        Marketplace PagBank Connect — vincule contas de vendedores para split e cobrança em nome
        deles.{' '}
        <a
          href="https://developer.pagbank.com.br/docs/connect"
          target="_blank"
          rel="noreferrer"
        >
          Documentação Connect
        </a>
        .
      </p>

      <div className="form-group">
        <label htmlFor="connect-redirect">Redirect URI (OAuth)</label>
        <input
          id="connect-redirect"
          className="premium-text-input"
          value={redirectUri}
          onChange={(e) => onRedirectUriChange(e.target.value)}
          placeholder={defaultCallback()}
          disabled={!canManage}
        />
        <span className="payment-field-hint">
          Cadastre a mesma URL no app Connect PagBank. Padrão: {defaultCallback()}
        </span>
      </div>

      {canManage && configured && (
        <div className="payment-connect-actions">
          <button
            type="button"
            className="catalog-action-button is-secondary"
            onClick={() => void openOAuth()}
          >
            Conectar conta (OAuth)
          </button>
          <button
            type="button"
            className="catalog-action-button is-secondary"
            onClick={() => void loadAccounts()}
            disabled={loading}
          >
            Atualizar lista
          </button>
        </div>
      )}

      {!configured && (
        <p className="payment-field-hint">Informe Client ID e Client Secret na aba Geral e salve.</p>
      )}

      <details className="payment-connect-sms" style={{ marginTop: 16 }}>
        <summary>Autorização via SMS</summary>
        <div className="catalog-form-grid" style={{ marginTop: 12 }}>
          <div className="form-group">
            <label htmlFor="sms-branch">Agência</label>
            <input
              id="sms-branch"
              className="premium-text-input"
              value={smsBranch}
              onChange={(e) => setSmsBranch(e.target.value)}
              disabled={!canManage}
            />
          </div>
          <div className="form-group">
            <label htmlFor="sms-account">Conta</label>
            <input
              id="sms-account"
              className="premium-text-input"
              value={smsAccount}
              onChange={(e) => setSmsAccount(e.target.value)}
              disabled={!canManage}
            />
          </div>
        </div>
        {canManage && configured && (
          <div className="payment-connect-actions">
            <button
              type="button"
              className="catalog-action-button is-secondary"
              onClick={() => void startSms()}
            >
              Enviar SMS
            </button>
          </div>
        )}
        {smsSessionId && (
          <>
            <p className="payment-field-hint">SMS enviado para {smsPhone}</p>
            <div className="form-group">
              <label htmlFor="sms-code">Código SMS</label>
              <input
                id="sms-code"
                className="premium-text-input"
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="catalog-action-button"
              onClick={() => void confirmSms()}
            >
              Confirmar e vincular
            </button>
          </>
        )}
      </details>

      <h4 style={{ marginTop: 20 }}>Contas conectadas</h4>
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : accounts.length === 0 ? (
        <p className="payment-field-hint">Nenhuma conta vinculada ainda.</p>
      ) : (
        <ul className="payment-connect-list">
          {accounts.map((a) => (
            <li key={a.id}>
              <strong>{a.label || a.pagbankAccountId || a.id}</strong>
              <span>
                {a.authMethod} · {a.pagbankAccountId ?? '—'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PaymentPagbankConnectSection;
