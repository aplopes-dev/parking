import React, { useCallback, useContext, useEffect, useState } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import AlertModal from '../../components/AlertModal';
import PremiumSelect from '../../components/PremiumSelect';
import {
  AlertState,
  CrmLoyaltyAccount,
  CrmLoyaltyProgram,
  CrmLoyaltyTransaction,
  CrmLoyaltyTxType,
  Customer,
} from '../../types';
import { loyaltyTxLabel, tierLabel } from './crmUtils';
import CatalogPageLayout from '../../components/CatalogPageLayout';

const CrmLoyaltyPage: React.FC = () => {
  const { user } = useContext(AuthContext) || {};
  const [programs, setPrograms] = useState<CrmLoyaltyProgram[]>([]);
  const [accounts, setAccounts] = useState<CrmLoyaltyAccount[]>([]);
  const [transactions, setTransactions] = useState<CrmLoyaltyTransaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [programForm, setProgramForm] = useState({
    name: 'Programa Fidelidade',
    description: '',
    pointsPerReal: '1',
    redeemRate: '0.01',
    minRedeemPoints: '100',
    tierSilverMin: '500',
    tierGoldMin: '2000',
    isDefault: true,
  });
  const [pointsForm, setPointsForm] = useState({
    customerId: '',
    type: 'ganho' as CrmLoyaltyTxType,
    points: '100',
    purchaseAmount: '',
    notes: '',
  });
  const [alert, setAlert] = useState<AlertState>({ isOpen: false, message: '', type: 'error' });
  const [isSaving, setIsSaving] = useState(false);

  const canManage = Boolean(user);

  const load = useCallback(async () => {
    const [progRes, accRes, txRes, custRes] = await Promise.all([
      api.get<CrmLoyaltyProgram[]>('/crm/loyalty/programs'),
      api.get<CrmLoyaltyAccount[]>('/crm/loyalty/accounts'),
      api.get<CrmLoyaltyTransaction[]>('/crm/loyalty/transactions', { params: { limit: 30 } }),
      api.get<{ data: Customer[] }>('/customers', { params: { limit: 100 } }),
    ]);
    setPrograms(progRes.data);
    setAccounts(accRes.data);
    setTransactions(txRes.data);
    setCustomers(custRes.data.data.filter((c) => c.active));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

  const saveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.post('/crm/loyalty/programs', {
        name: programForm.name.trim(),
        description: programForm.description.trim() || undefined,
        pointsPerReal: parseFloat(programForm.pointsPerReal),
        redeemRate: parseFloat(programForm.redeemRate),
        minRedeemPoints: parseInt(programForm.minRedeemPoints, 10),
        tierSilverMin: parseInt(programForm.tierSilverMin, 10),
        tierGoldMin: parseInt(programForm.tierGoldMin, 10),
        isDefault: programForm.isDefault,
        active: true,
      });
      setShowProgramForm(false);
      await load();
      setAlert({ isOpen: true, message: 'Programa criado!', type: 'success' });
    } catch (err: any) {
      setAlert({ isOpen: true, message: err.response?.data?.message || 'Erro', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePoints = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (pointsForm.purchaseAmount) {
        await api.post('/crm/loyalty/earn-purchase', {
          customerId: pointsForm.customerId,
          purchaseAmount: parseFloat(pointsForm.purchaseAmount),
          notes: pointsForm.notes || undefined,
        });
      } else {
        await api.post('/crm/loyalty/adjust', {
          customerId: pointsForm.customerId,
          type: pointsForm.type,
          points: parseInt(pointsForm.points, 10),
          notes: pointsForm.notes || undefined,
        });
      }
      setPointsForm({ customerId: '', type: 'ganho', points: '100', purchaseAmount: '', notes: '' });
      await load();
      setAlert({ isOpen: true, message: 'Pontos atualizados!', type: 'success' });
    } catch (err: any) {
      setAlert({ isOpen: true, message: err.response?.data?.message || 'Erro', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  if (!canManage) return <div className="container">Acesso negado</div>;

  const defaultProgram = programs.find((p) => p.isDefault) || programs[0];

  const statsGrid =
    defaultProgram && !loading ? (
      <section className="catalog-stats-grid">
        <article className="catalog-stat-card">
          <span>Programa ativo</span>
          <strong>{defaultProgram.name}</strong>
          <p>
            {defaultProgram.pointsPerReal} pt(s) por R$1 · Resgate mín. {defaultProgram.minRedeemPoints} pts
          </p>
        </article>
        <article className="catalog-stat-card">
          <span>Contas</span>
          <strong>{accounts.length}</strong>
          <p>Clientes com saldo de pontos.</p>
        </article>
      </section>
    ) : undefined;

  return (
    <CatalogPageLayout
      moduleLabel="CRM"
      modulePath="/crm/clientes"
      title="Programa de fidelidade"
      description="Configure regras de pontos, níveis e movimentações dos clientes."
      loading={loading}
      loadingDescription="Carregando programa de fidelidade."
      actions={
        <button type="button" className="catalog-action-button" onClick={() => setShowProgramForm(!showProgramForm)}>
          {showProgramForm ? 'Fechar' : 'Novo programa'}
        </button>
      }
      stats={statsGrid}
    >
      {showProgramForm && (
        <section className="catalog-surface catalog-form-surface--premium">
          <form className="catalog-form" onSubmit={saveProgram}>
            <div className="catalog-form-grid">
              <div className="form-group">
                <label>Nome *</label>
                <input className="premium-text-input" value={programForm.name} onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Pontos por R$</label>
                <input className="premium-text-input" type="number" min="0" step="0.01" value={programForm.pointsPerReal} onChange={(e) => setProgramForm({ ...programForm, pointsPerReal: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Mín. resgate (pts)</label>
                <input className="premium-text-input" type="number" min="0" value={programForm.minRedeemPoints} onChange={(e) => setProgramForm({ ...programForm, minRedeemPoints: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary" disabled={isSaving}>Criar programa</button>
          </form>
        </section>
      )}

      {programs.length === 0 ? (
        <section className="catalog-surface">
          <div className="catalog-empty">Crie um programa de fidelidade para começar.</div>
        </section>
      ) : (
        <>
          <section className="catalog-surface catalog-form-surface--premium">
            <h2>Movimentar pontos</h2>
            <form className="catalog-form" onSubmit={handlePoints}>
              <div className="catalog-form-grid">
                <PremiumSelect label="Cliente *" value={pointsForm.customerId} options={[{ value: '', label: 'Selecione' }, ...customerOptions]} onChange={(v) => setPointsForm({ ...pointsForm, customerId: v })} />
                <PremiumSelect
                  label="Operação"
                  value={pointsForm.type}
                  options={[
                    { value: 'ganho', label: 'Creditar pontos' },
                    { value: 'resgate', label: 'Resgatar pontos' },
                    { value: 'ajuste', label: 'Ajustar saldo' },
                  ]}
                  onChange={(v) => setPointsForm({ ...pointsForm, type: v as CrmLoyaltyTxType })}
                />
                <div className="form-group">
                  <label>Pontos</label>
                  <input className="premium-text-input" type="number" min="1" value={pointsForm.points} onChange={(e) => setPointsForm({ ...pointsForm, points: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Ou valor da compra (R$)</label>
                  <input className="premium-text-input" type="number" min="0" step="0.01" value={pointsForm.purchaseAmount} onChange={(e) => setPointsForm({ ...pointsForm, purchaseAmount: e.target.value })} placeholder="Calcula pontos automaticamente" />
                </div>
              </div>
              <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary" disabled={isSaving || !pointsForm.customerId}>
                Aplicar
              </button>
            </form>
          </section>

          <section className="catalog-surface">
            <h2>Ranking de pontos</h2>
            <div className="catalog-grid">
              {accounts.map((a) => (
                <article className="catalog-card" key={a.id}>
                  <strong>{a.customer?.name}</strong>
                  <span>{tierLabel[a.tier]} · {a.lifetimePoints} pts vitalícios</span>
                  <div className="catalog-chip-row">
                    <span className="catalog-pill is-muted">{a.pointsBalance} pontos</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="catalog-surface">
            <h2>Últimas movimentações</h2>
            <div className="catalog-grid">
              {transactions.map((tx) => (
                <article className="catalog-card" key={tx.id}>
                  <strong>{tx.account?.customer?.name || 'Cliente'}</strong>
                  <span>{loyaltyTxLabel[tx.type]} · {tx.points} pts</span>
                  <p>Saldo: {tx.balanceAfter} · {new Date(tx.createdAt).toLocaleString('pt-BR')}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      <AlertModal isOpen={alert.isOpen} onClose={() => setAlert({ ...alert, isOpen: false })} message={alert.message} type={alert.type} />
    </CatalogPageLayout>
  );
};

export default CrmLoyaltyPage;
