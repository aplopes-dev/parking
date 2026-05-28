import React, { useCallback, useEffect, useState } from 'react';
import {
  PagbankRecurringPlanLocal,
  PagbankSubscriptionLocal,
  cancelRecurringSubscription,
  createRecurringPlan,
  createRecurringSubscription,
  listRecurringPlans,
  listRecurringSubscriptions,
  listSubscriptionInvoices,
} from '../../services/pagbankApi';

type Props = { canManage: boolean };

const PaymentPagbankRecurringSection: React.FC<Props> = ({ canManage }) => {
  const [plans, setPlans] = useState<PagbankRecurringPlanLocal[]>([]);
  const [subs, setSubs] = useState<PagbankSubscriptionLocal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [planName, setPlanName] = useState('');
  const [planCents, setPlanCents] = useState('');
  const [subRef, setSubRef] = useState('');
  const [subPlanId, setSubPlanId] = useState('');
  const [subEmail, setSubEmail] = useState('');
  const [subName, setSubName] = useState('');

  const reload = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([listRecurringPlans(), listRecurringSubscriptions()]);
      setPlans(p);
      setSubs(s);
      setError(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Erro ao carregar recorrência';
      setError(msg);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const createPlan = async () => {
    setError(null);
    try {
      await createRecurringPlan({
        name: planName.trim(),
        amountCents: Math.round(Number(planCents) * 100) || Number(planCents),
      });
      setPlanName('');
      setPlanCents('');
      await reload();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Erro ao criar plano',
      );
    }
  };

  const createSub = async () => {
    setError(null);
    try {
      await createRecurringSubscription({
        referenceId: subRef.trim(),
        localPlanId: subPlanId || undefined,
        customerName: subName.trim(),
        customerEmail: subEmail.trim(),
      });
      await reload();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Erro ao criar assinatura',
      );
    }
  };

  return (
    <div className="payment-tools-block">
      <p className="payment-settings-doc">
        Planos e assinaturas via{' '}
        <a
          href="https://developer.pagbank.com.br/reference/introducao-assinaturas"
          target="_blank"
          rel="noreferrer"
        >
          API Assinaturas PagBank
        </a>
        . Ative os fluxos <code>recurring_plans</code> e <code>recurring_subscriptions</code>.
      </p>
      {error && <p className="pagbank-pix-error">{error}</p>}

      <h3 className="payment-tools-subtitle">Novo plano</h3>
      <div className="catalog-form-grid">
        <div className="form-group">
          <label>Nome</label>
          <input
            className="premium-text-input"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            disabled={!canManage}
          />
        </div>
        <div className="form-group">
          <label>Valor (centavos ou reais)</label>
          <input
            className="premium-text-input"
            value={planCents}
            onChange={(e) => setPlanCents(e.target.value)}
            disabled={!canManage}
          />
        </div>
      </div>
      {canManage && (
        <button
          type="button"
          className="catalog-form-footer-btn catalog-form-footer-btn--primary"
          onClick={createPlan}
        >
          Criar plano
        </button>
      )}

      <h3 className="payment-tools-subtitle">Planos locais</h3>
      <ul className="payment-tools-list">
        {plans.map((p) => (
          <li key={p.id}>
            {p.name} — {(p.amountCents / 100).toFixed(2)} BRL — {p.pagbankPlanId} — {p.status}
          </li>
        ))}
      </ul>

      <h3 className="payment-tools-subtitle">Nova assinatura</h3>
      <div className="catalog-form-grid">
        <div className="form-group">
          <label>reference_id</label>
          <input
            className="premium-text-input"
            value={subRef}
            onChange={(e) => setSubRef(e.target.value)}
            disabled={!canManage}
          />
        </div>
        <div className="form-group">
          <label>ID plano local (uuid)</label>
          <input
            className="premium-text-input"
            value={subPlanId}
            onChange={(e) => setSubPlanId(e.target.value)}
            disabled={!canManage}
          />
        </div>
        <div className="form-group">
          <label>Nome assinante</label>
          <input
            className="premium-text-input"
            value={subName}
            onChange={(e) => setSubName(e.target.value)}
            disabled={!canManage}
          />
        </div>
        <div className="form-group">
          <label>E-mail</label>
          <input
            className="premium-text-input"
            value={subEmail}
            onChange={(e) => setSubEmail(e.target.value)}
            disabled={!canManage}
          />
        </div>
      </div>
      {canManage && (
        <button
          type="button"
          className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
          onClick={createSub}
        >
          Criar assinatura
        </button>
      )}

      <h3 className="payment-tools-subtitle">Assinaturas</h3>
      <ul className="payment-tools-list">
        {subs.map((s) => (
          <li key={s.id}>
            {s.referenceId} — {s.status} — {s.pagbankSubscriptionId}
            {canManage && (
              <>
                {' '}
                <button
                  type="button"
                  className="payment-tools-link-btn"
                  onClick={() => cancelRecurringSubscription(s.id).then(reload)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="payment-tools-link-btn"
                  onClick={() => listSubscriptionInvoices(s.id).then(console.log)}
                >
                  Faturas
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PaymentPagbankRecurringSection;
