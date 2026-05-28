import React, { useContext, useEffect, useState } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import AlertModal from '../../components/AlertModal';
import PremiumSelect from '../../components/PremiumSelect';
import { AlertState, StockBalance } from '../../types';
import { useStockCatalog } from './useStockCatalog';
import { formatQty } from './stockUtils';
import CatalogPageLayout from '../../components/CatalogPageLayout';

const StockAdjustmentPage: React.FC = () => {
  const { user } = useContext(AuthContext) || {};
  const { locationOptions, productOptions, loading: catalogLoading } = useStockCatalog();
  const [form, setForm] = useState({ productId: '', locationId: '', countedQuantity: '', notes: '' });
  const [currentQty, setCurrentQty] = useState<number | null>(null);
  const [recent, setRecent] = useState<StockBalance[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<AlertState>({ isOpen: false, message: '', type: 'error' });

  const canManage = Boolean(user);

  useEffect(() => {
    if (!form.productId || !form.locationId) {
      setCurrentQty(null);
      return;
    }
    api
      .get<StockBalance[]>('/stock-balances', {
        params: { productId: form.productId, locationId: form.locationId },
      })
      .then((res) => {
        const bal = res.data[0];
        setCurrentQty(bal ? parseFloat(String(bal.quantity)) : 0);
      })
      .catch(() => setCurrentQty(0));
  }, [form.productId, form.locationId]);

  const loadRecent = () => {
    api.get<StockBalance[]>('/stock-balances', { params: { limit: 20 } }).then((res) => setRecent(res.data.slice(0, 12)));
  };

  useEffect(() => {
    if (canManage) loadRecent();
  }, [canManage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.post('/stock-movements/adjustments', {
        productId: form.productId,
        locationId: form.locationId,
        countedQuantity: parseFloat(form.countedQuantity),
        notes: form.notes.trim() || undefined,
      });
      setForm({ productId: '', locationId: '', countedQuantity: '', notes: '' });
      setCurrentQty(null);
      loadRecent();
      setAlert({ isOpen: true, message: 'Acerto de estoque registrado!', type: 'success' });
    } catch (err: any) {
      setAlert({ isOpen: true, message: err.response?.data?.message || 'Erro', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!canManage) return <div className="container">Acesso negado</div>;

  return (
    <CatalogPageLayout
      moduleLabel="Estoque"
      modulePath="/estoque/locais"
      title="Acerto de estoque"
      description="Informe a quantidade contada no inventário para ajustar o saldo do sistema."
    >
      <section className="catalog-surface catalog-form-surface--premium">
        <h2>Inventário / acerto</h2>
        {catalogLoading ? (
          <p>Carregando…</p>
        ) : (
          <form className="catalog-form" onSubmit={handleSubmit}>
            <div className="catalog-form-grid">
              <PremiumSelect
                label="Produto *"
                value={form.productId}
                options={[{ value: '', label: 'Selecione' }, ...productOptions]}
                onChange={(v) => setForm({ ...form, productId: v })}
              />
              <PremiumSelect
                label="Local *"
                value={form.locationId}
                options={[{ value: '', label: 'Selecione' }, ...locationOptions]}
                onChange={(v) => setForm({ ...form, locationId: v })}
              />
              <div className="form-group">
                <label>Saldo no sistema</label>
                <input className="premium-text-input" readOnly value={currentQty === null ? '—' : formatQty(currentQty)} />
              </div>
              <div className="form-group">
                <label>Quantidade contada *</label>
                <input
                  className="premium-text-input"
                  type="number"
                  min="0"
                  step="0.0001"
                  value={form.countedQuantity}
                  onChange={(e) => setForm({ ...form, countedQuantity: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Observações</label>
              <textarea className="premium-text-input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="catalog-form-footer">
              <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary" disabled={isSaving || !form.productId || !form.locationId}>
                {isSaving ? 'Salvando…' : 'Confirmar acerto'}
              </button>
            </div>
          </form>
        )}
      </section>

      {recent.length > 0 && (
        <section className="catalog-surface">
          <h2>Saldos recentes</h2>
          <div className="catalog-grid">
            {recent.map((b) => (
              <article className="catalog-card" key={b.id}>
                <strong>{b.product?.name}</strong>
                <span>{b.location?.name}</span>
                <p>Saldo: {formatQty(b.quantity)}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <AlertModal isOpen={alert.isOpen} onClose={() => setAlert({ ...alert, isOpen: false })} message={alert.message} type={alert.type} />
    </CatalogPageLayout>
  );
};

export default StockAdjustmentPage;
