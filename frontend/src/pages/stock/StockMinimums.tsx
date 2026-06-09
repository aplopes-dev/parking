import React, { useCallback, useContext, useEffect, useState } from 'react';
import api from '../../services/api';
import { normalizePaginatedResponse } from '../../utils/paginatedResponse';
import { DEFAULT_PAGE_SIZE } from '../../types/pagination';
import { AuthContext } from '../../contexts/AuthContext';
import AlertModal from '../../components/AlertModal';
import ConfirmModal from '../../components/ConfirmModal';
import PremiumSelect from '../../components/PremiumSelect';
import { AlertState, StockMinimum } from '../../types';
import { useStockCatalog } from './useStockCatalog';
import { formatQty } from './stockUtils';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import RegistryFormModal, { registryModalFooterButtons } from '../../components/RegistryFormModal';

const EMPTY_MINIMUM_FORM = { productId: '', locationId: '', minimumQuantity: '0', active: true };

const StockMinimumsPage: React.FC = () => {
  const { user } = useContext(AuthContext) || {};
  const { locationOptions, productOptions, loading: catalogLoading } = useStockCatalog();
  const [items, setItems] = useState<StockMinimum[]>([]);
  const [alerts, setAlerts] = useState<StockMinimum[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_MINIMUM_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<AlertState>({ isOpen: false, message: '', type: 'error' });
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManage = Boolean(user);

  const load = useCallback(async () => {
    const [listRes, alertsRes] = await Promise.all([
      api.get('/stock-minimums', { params: { page: 1, limit: DEFAULT_PAGE_SIZE } }),
      api.get<StockMinimum[]>('/stock-minimums/alerts'),
    ]);
    setItems(normalizePaginatedResponse<StockMinimum>(listRes.data, { page: 1, limit: DEFAULT_PAGE_SIZE }).items);
    setAlerts(alertsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.post('/stock-minimums', {
        productId: form.productId,
        locationId: form.locationId || null,
        minimumQuantity: parseFloat(form.minimumQuantity),
        active: form.active,
      });
      closeForm();
      await load();
      setAlert({ isOpen: true, message: 'Estoque mínimo cadastrado!', type: 'success' });
    } catch (err: any) {
      setAlert({ isOpen: true, message: err.response?.data?.message || 'Erro', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const closeForm = () => {
    if (isSaving) return;
    setForm(EMPTY_MINIMUM_FORM);
    setShowForm(false);
  };

  const openForm = () => {
    setForm(EMPTY_MINIMUM_FORM);
    setShowForm(true);
  };

  if (!canManage) return <div className="container">Acesso negado</div>;

  return (
    <CatalogPageLayout
      moduleLabel="Estoque"
      modulePath="/estoque/locais"
      title="Estoque mínimo"
      description="Defina limites de reposição e acompanhe alertas de ruptura."
      loading={loading}
      loadingDescription="Carregando estoque mínimo."
      actions={
        <button type="button" className="catalog-action-button" onClick={openForm}>
          Novo mínimo
        </button>
      }
    >
      {alerts.length > 0 && (
        <section className="catalog-surface">
          <h2>Alertas ({alerts.length})</h2>
          <div className="catalog-grid">
            {alerts.map((a) => (
              <article className="catalog-card" key={a.id}>
                <strong>{a.product?.name}</strong>
                <span>{a.location?.name || 'Todos os locais'}</span>
                <div className="catalog-chip-row">
                  <span className="catalog-pill is-muted">
                    Atual {formatQty(a.currentQuantity ?? 0)} / Mín. {formatQty(a.minimumQuantity)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <RegistryFormModal
        isOpen={showForm && !catalogLoading}
        title="Novo estoque mínimo"
        subtitle="Defina limites de reposição por produto e local."
        isSaving={isSaving}
        onClose={closeForm}
        onSubmit={handleSubmit}
        footer={registryModalFooterButtons({
          onClose: closeForm,
          isSaving,
          submitLabel: 'Salvar mínimo',
        })}
      >
        <div className="catalog-form-grid">
          <PremiumSelect label="Produto *" value={form.productId} options={[{ value: '', label: 'Selecione' }, ...productOptions]} onChange={(v) => setForm({ ...form, productId: v })} />
          <PremiumSelect label="Local (vazio = global)" value={form.locationId} options={[{ value: '', label: 'Global' }, ...locationOptions]} onChange={(v) => setForm({ ...form, locationId: v })} />
          <div className="form-group">
            <label>Quantidade mínima *</label>
            <input className="premium-text-input" type="number" min="0" step="0.0001" value={form.minimumQuantity} onChange={(e) => setForm({ ...form, minimumQuantity: e.target.value })} required />
          </div>
        </div>
      </RegistryFormModal>

      <section className="catalog-surface">
        <div className="catalog-grid">
          {items.map((item) => (
            <article className="catalog-card" key={item.id}>
              <strong>{item.product?.name}</strong>
              <span>{item.location?.name || 'Global'}</span>
              <p>Mínimo: {formatQty(item.minimumQuantity)}</p>
              <button type="button" className="catalog-card-button is-danger" onClick={() => setConfirmId(item.id)}>Excluir</button>
            </article>
          ))}
        </div>
      </section>

      <AlertModal isOpen={alert.isOpen} onClose={() => setAlert({ ...alert, isOpen: false })} message={alert.message} type={alert.type} />
      <ConfirmModal
        isOpen={Boolean(confirmId)}
        title="Excluir mínimo"
        message="Deseja excluir este registro de estoque mínimo?"
        confirmLabel="Excluir"
        isLoading={isDeleting}
        onClose={() => !isDeleting && setConfirmId(null)}
        onConfirm={async () => {
          if (!confirmId) return;
          setIsDeleting(true);
          try {
            await api.delete(`/stock-minimums/${confirmId}`);
            await load();
            setConfirmId(null);
          } catch (err: any) {
            setAlert({ isOpen: true, message: err.response?.data?.message || 'Erro', type: 'error' });
          } finally {
            setIsDeleting(false);
          }
        }}
      />
    </CatalogPageLayout>
  );
};

export default StockMinimumsPage;
