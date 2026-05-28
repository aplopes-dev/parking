import React, { useCallback, useEffect, useState } from 'react';
import {
  PagbankRegisteredAccountLocal,
  listRegisteredPagbankAccounts,
  registerPagbankAccount,
} from '../../services/pagbankApi';

const DEFAULT_PERSON = `{
  "name": "João da Silva",
  "birth_date": "1990-01-15",
  "mother_name": "Maria da Silva",
  "tax_id": "12345678909",
  "address": {
    "street": "Rua Exemplo",
    "number": "100",
    "complement": "Apto 1",
    "locality": "Centro",
    "city": "São Paulo",
    "region_code": "SP",
    "country": "BRA",
    "postal_code": "01310100"
  }
}`;

const DEFAULT_TOS = `{
  "user_ip": "127.0.0.1",
  "date": "2026-05-20T12:00:00Z"
}`;

type Props = { canManage: boolean };

const PaymentPagbankRegistrationSection: React.FC<Props> = ({ canManage }) => {
  const [rows, setRows] = useState<PagbankRegisteredAccountLocal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [accountType, setAccountType] = useState<'BUYER' | 'SELLER' | 'ENTERPRISE'>('SELLER');
  const [businessCategory, setBusinessCategory] = useState('RESTAURANT');
  const [personJson, setPersonJson] = useState(DEFAULT_PERSON);
  const [tosJson, setTosJson] = useState(DEFAULT_TOS);

  const reload = useCallback(async () => {
    try {
      setRows(await listRegisteredPagbankAccounts());
      setError(null);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Erro ao listar contas',
      );
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const submit = async () => {
    setError(null);
    try {
      const person = JSON.parse(personJson) as Record<string, unknown>;
      const tosAcceptance = JSON.parse(tosJson) as Record<string, unknown>;
      await registerPagbankAccount({
        type: accountType,
        email: email.trim(),
        person,
        tosAcceptance,
        businessCategory:
          accountType === 'SELLER' || accountType === 'ENTERPRISE' ? businessCategory : undefined,
      });
      await reload();
    } catch (err: unknown) {
      const msg =
        err instanceof SyntaxError
          ? 'JSON inválido em person ou tos_acceptance'
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Erro ao cadastrar conta';
      setError(msg);
    }
  };

  return (
    <div className="payment-tools-block">
      <p className="payment-settings-doc">
        API de Cadastro —{' '}
        <a
          href="https://developer.pagbank.com.br/reference/criar-conta"
          target="_blank"
          rel="noreferrer"
        >
          criar conta
        </a>
        . Usa Connect Client ID/Secret de Geral. Fluxo <code>account_register</code>.
      </p>
      {error && <p className="pagbank-pix-error">{error}</p>}

      <div className="catalog-form-grid">
        <div className="form-group">
          <label>Tipo</label>
          <select
            className="premium-text-input"
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as typeof accountType)}
            disabled={!canManage}
          >
            <option value="BUYER">BUYER</option>
            <option value="SELLER">SELLER</option>
            <option value="ENTERPRISE">ENTERPRISE</option>
          </select>
        </div>
        <div className="form-group">
          <label>E-mail</label>
          <input
            className="premium-text-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!canManage}
          />
        </div>
        {(accountType === 'SELLER' || accountType === 'ENTERPRISE') && (
          <div className="form-group">
            <label>business_category</label>
            <input
              className="premium-text-input"
              value={businessCategory}
              onChange={(e) => setBusinessCategory(e.target.value)}
              disabled={!canManage}
            />
          </div>
        )}
      </div>
      <div className="form-group">
        <label>person (JSON)</label>
        <textarea
          className="premium-text-input"
          rows={8}
          value={personJson}
          onChange={(e) => setPersonJson(e.target.value)}
          disabled={!canManage}
        />
      </div>
      <div className="form-group">
        <label>tos_acceptance (JSON)</label>
        <textarea
          className="premium-text-input"
          rows={3}
          value={tosJson}
          onChange={(e) => setTosJson(e.target.value)}
          disabled={!canManage}
        />
      </div>
      {canManage && (
        <button
          type="button"
          className="catalog-form-footer-btn catalog-form-footer-btn--primary"
          onClick={submit}
        >
          Cadastrar conta PagBank
        </button>
      )}

      <h3 className="payment-tools-subtitle">Contas cadastradas (local)</h3>
      <ul className="payment-tools-list">
        {rows.map((a) => (
          <li key={a.id}>
            {a.accountType} — {a.email} — {a.pagbankAccountId ?? '—'} — {a.status}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PaymentPagbankRegistrationSection;
