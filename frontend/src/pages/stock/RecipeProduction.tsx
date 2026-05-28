import React, { useCallback, useContext, useEffect, useState } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import AlertModal from '../../components/AlertModal';
import PremiumSelect from '../../components/PremiumSelect';
import { AlertState, RecipeProduction, TechnicalSheet } from '../../types';
import { useStockCatalog } from './useStockCatalog';
import { formatQty } from './stockUtils';
import CatalogPageLayout from '../../components/CatalogPageLayout';

const RecipeProductionPage: React.FC = () => {
  const { user } = useContext(AuthContext) || {};
  const { locationOptions, loading: catalogLoading } = useStockCatalog();
  const [sheets, setSheets] = useState<TechnicalSheet[]>([]);
  const [history, setHistory] = useState<RecipeProduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ sheetId: '', locationId: '', quantityProduced: '1', notes: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<AlertState>({ isOpen: false, message: '', type: 'error' });

  const canManage = Boolean(user);

  const load = useCallback(async () => {
    const [sheetsRes, histRes] = await Promise.all([
      api.get<TechnicalSheet[]>('/technical-sheets'),
      api.get<RecipeProduction[]>('/recipe-productions'),
    ]);
    setSheets(sheetsRes.data.filter((s) => s.active));
    setHistory(histRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

  const sheetOptions = sheets.map((s) => ({
    value: s.id,
    label: `${s.name} (${s.product?.name})`,
  }));

  const selectedSheet = sheets.find((s) => s.id === form.sheetId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.post('/recipe-productions', {
        sheetId: form.sheetId,
        locationId: form.locationId,
        quantityProduced: parseFloat(form.quantityProduced),
        notes: form.notes.trim() || undefined,
      });
      setForm({ sheetId: '', locationId: '', quantityProduced: '1', notes: '' });
      await load();
      setAlert({
        isOpen: true,
        message: 'Produção registrada! Insumos baixados e produto acabado lançado no estoque.',
        type: 'success',
      });
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
      title="Produção de receitas"
      description="Execute a ficha técnica: baixa insumos e entra o produto acabado no estoque."
      loading={loading}
      loadingDescription="Carregando produção de receitas."
    >
      <section className="catalog-surface catalog-form-surface--premium">
        {catalogLoading ? (
          <p>Carregando…</p>
        ) : sheets.length === 0 ? (
          <div className="catalog-empty">Cadastre uma ficha técnica antes de produzir.</div>
        ) : (
          <form className="catalog-form" onSubmit={handleSubmit}>
            <div className="catalog-form-grid">
              <PremiumSelect label="Ficha técnica *" value={form.sheetId} options={[{ value: '', label: 'Selecione' }, ...sheetOptions]} onChange={(v) => setForm({ ...form, sheetId: v })} />
              <PremiumSelect label="Local *" value={form.locationId} options={[{ value: '', label: 'Selecione' }, ...locationOptions]} onChange={(v) => setForm({ ...form, locationId: v })} />
              <div className="form-group">
                <label>Quantidade produzida *</label>
                <input className="premium-text-input" type="number" min="0.0001" step="0.0001" value={form.quantityProduced} onChange={(e) => setForm({ ...form, quantityProduced: e.target.value })} required />
              </div>
            </div>
            {selectedSheet && (
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                Rendimento da ficha: {formatQty(selectedSheet.yieldQuantity)} · {selectedSheet.items.length} insumo(s)
              </p>
            )}
            <div className="form-group">
              <label>Observações</label>
              <textarea className="premium-text-input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="catalog-form-footer">
              <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary" disabled={isSaving || !form.sheetId || !form.locationId}>
                {isSaving ? 'Processando…' : 'Registrar produção'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="catalog-surface">
        <h2>Últimas produções</h2>
        {history.length === 0 ? (
          <div className="catalog-empty">Nenhuma produção registrada.</div>
        ) : (
          <div className="catalog-grid">
            {history.map((p) => (
              <article className="catalog-card" key={p.id}>
                <strong>{p.sheet?.name || 'Ficha'}</strong>
                <span>{p.location?.name} · {formatQty(p.quantityProduced)} un.</span>
                <p>{new Date(p.createdAt).toLocaleString('pt-BR')}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <AlertModal isOpen={alert.isOpen} onClose={() => setAlert({ ...alert, isOpen: false })} message={alert.message} type={alert.type} />
    </CatalogPageLayout>
  );
};

export default RecipeProductionPage;
