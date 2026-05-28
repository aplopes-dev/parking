import React, { useCallback, useContext, useEffect, useState } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import AlertModal from '../../components/AlertModal';
import { AlertState, PdvSettings } from '../../types';
import CatalogPageLayout from '../../components/CatalogPageLayout';

const PdvServiceFee: React.FC = () => {
  const { user } = useContext(AuthContext) || {};
  const [settings, setSettings] = useState<PdvSettings | null>(null);
  const [form, setForm] = useState({
    defaultServiceFeePercent: '10',
    allowSplitBill: true,
    mapsEnabled: true,
    mapsEmbedUrl: '',
  });
  const [alert, setAlert] = useState<AlertState>({ isOpen: false, message: '', type: 'error' });
  const canManage = Boolean(user);

  const load = useCallback(async () => {
    const { data } = await api.get<PdvSettings>('/pdv/settings');
    setSettings(data);
    setForm({
      defaultServiceFeePercent: String(data.defaultServiceFeePercent),
      allowSplitBill: data.allowSplitBill,
      mapsEnabled: data.mapsEnabled,
      mapsEmbedUrl: data.mapsEmbedUrl || '',
    });
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    try {
      await api.patch('/pdv/settings', {
        defaultServiceFeePercent: Number(form.defaultServiceFeePercent),
        allowSplitBill: form.allowSplitBill,
        mapsEnabled: form.mapsEnabled,
        mapsEmbedUrl: form.mapsEmbedUrl.trim() || null,
      });
      await load();
      setAlert({ isOpen: true, message: 'Configurações salvas', type: 'success' });
    } catch (err: any) {
      setAlert({ isOpen: true, message: err.response?.data?.message || 'Erro', type: 'error' });
    }
  };

  return (
    <CatalogPageLayout
      moduleLabel="PDV"
      modulePath="/pdv/online"
      title="Taxa de serviço"
      description="Percentual padrão para mesa/comanda, divisão de conta e integração com mapas de entrega."
    >
      <section className="catalog-surface catalog-form-surface--premium">
        <div className="catalog-section-header">
          <div>
            <span className="catalog-section-kicker">Configuração</span>
            <h2>Parâmetros do PDV</h2>
          </div>
        </div>
        {!settings ? (
          <p>Carregando…</p>
        ) : (
          <form className="catalog-form" onSubmit={handleSave}>
            <div className="catalog-form-grid">
              <div className="form-group">
                <label htmlFor="pdv-fee">Taxa de serviço padrão (%)</label>
                <input
                  id="pdv-fee"
                  className="premium-text-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.defaultServiceFeePercent}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, defaultServiceFeePercent: e.target.value }))
                  }
                  disabled={!canManage}
                />
              </div>
            </div>
            <label className="form-group">
              <input
                type="checkbox"
                checked={form.allowSplitBill}
                onChange={(e) => setForm((f) => ({ ...f, allowSplitBill: e.target.checked }))}
                disabled={!canManage}
              />{' '}
              Permitir divisão de conta
            </label>
            <label className="form-group">
              <input
                type="checkbox"
                checked={form.mapsEnabled}
                onChange={(e) => setForm((f) => ({ ...f, mapsEnabled: e.target.checked }))}
                disabled={!canManage}
              />{' '}
              Habilitar mapa de entregas
            </label>
            <div className="form-group">
              <label htmlFor="pdv-map-url">URL embed do mapa</label>
              <input
                id="pdv-map-url"
                className="premium-text-input"
                value={form.mapsEmbedUrl}
                onChange={(e) => setForm((f) => ({ ...f, mapsEmbedUrl: e.target.value }))}
                disabled={!canManage}
              />
            </div>
            {canManage && (
              <div className="catalog-form-footer">
                <button type="submit" className="catalog-form-footer-btn catalog-form-footer-btn--primary">
                  Salvar
                </button>
              </div>
            )}
          </form>
        )}
      </section>

      <AlertModal
        isOpen={alert.isOpen}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert((a) => ({ ...a, isOpen: false }))}
      />
    </CatalogPageLayout>
  );
};

export default PdvServiceFee;
