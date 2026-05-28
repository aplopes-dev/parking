import React, { useCallback, useContext, useEffect, useState } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import AlertModal from '../../components/AlertModal';
import ConfirmModal from '../../components/ConfirmModal';
import PremiumSelect from '../../components/PremiumSelect';
import ModalPortal from '../../components/ModalPortal';
import {
  AlertState,
  CrmCampaign,
  CrmCampaignChannel,
  CrmCampaignStatus,
  CrmCampaignType,
  CrmDiscountType,
  CrmSegment,
  MenuCatalogItem,
  Product,
} from '../../types';
import {
  campaignChannelLabel,
  campaignStatusLabel,
  campaignTypeLabel,
  discountTypeLabel,
  segmentLabel,
} from './crmUtils';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import CrmCampaignProductPicker from './CrmCampaignProductPicker';
import { formatMoney } from '../pdv/pdvUtils';
import '../../components/AppModal.css';

const PROMO_TYPES: CrmCampaignType[] = ['promocao', 'desconto', 'combo'];

function isCampaignExpired(c: CrmCampaign): boolean {
  if (!c.endsAt) return false;
  return new Date(c.endsAt).getTime() < Date.now();
}

/** Fim do período no minuto escolhido (evita encerrar antes do horário exibido). */
function endsAtForApi(local: string): string | undefined {
  if (!local.trim()) return undefined;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setSeconds(59, 999);
  return d.toISOString();
}

function mergeMenuProducts(
  mesaCatalog: MenuCatalogItem[],
  deliveryCatalog: MenuCatalogItem[],
): Product[] {
  const map = new Map<string, Product>();
  for (const item of [...mesaCatalog, ...deliveryCatalog]) {
    if (item.visible && item.product.active) {
      map.set(item.product.id, item.product);
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR'),
  );
}

const CrmCampaignsPage: React.FC = () => {
  const { user } = useContext(AuthContext) || {};
  const [items, setItems] = useState<CrmCampaign[]>([]);
  const [menuProducts, setMenuProducts] = useState<Product[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'promocao' as CrmCampaignType,
    status: 'rascunho' as CrmCampaignStatus,
    channel: 'geral' as CrmCampaignChannel,
    discountType: 'nenhum' as CrmDiscountType,
    discountValue: '0',
    audienceSegment: '' as CrmSegment | '',
    startsAt: '',
    endsAt: '',
    productIds: [] as string[],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<AlertState>({ isOpen: false, message: '', type: 'error' });
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManage = Boolean(user);
  const showProductPicker = PROMO_TYPES.includes(form.type);

  const loadMenuProducts = useCallback(async () => {
    setMenuLoading(true);
    try {
      const [mesaRes, deliveryRes] = await Promise.all([
        api.get<{ catalog: MenuCatalogItem[] }>('/menu/mesa/catalog'),
        api.get<{ catalog: MenuCatalogItem[] }>('/menu/delivery/catalog'),
      ]);
      setMenuProducts(
        mergeMenuProducts(mesaRes.data.catalog, deliveryRes.data.catalog),
      );
    } catch {
      setMenuProducts([]);
    } finally {
      setMenuLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    const { data } = await api.get<CrmCampaign[]>('/crm/campaigns');
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (canManage) void load();
  }, [canManage, load]);

  useEffect(() => {
    if (canManage && showForm) void loadMenuProducts();
  }, [canManage, showForm, loadMenuProducts]);

  const reset = () => {
    setForm({
      name: '',
      description: '',
      type: 'promocao',
      status: 'rascunho',
      channel: 'geral',
      discountType: 'nenhum',
      discountValue: '0',
      audienceSegment: '',
      startsAt: '',
      endsAt: '',
      productIds: [],
    });
    setEditingId(null);
  };

  const openEdit = (c: CrmCampaign) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      description: c.description || '',
      type: c.type,
      status: c.status,
      channel: c.channel,
      discountType: c.discountType,
      discountValue: String(c.discountValue),
      audienceSegment: c.audienceSegment || '',
      startsAt: c.startsAt ? c.startsAt.slice(0, 16) : '',
      endsAt: c.endsAt ? c.endsAt.slice(0, 16) : '',
      productIds: c.productIds ?? c.products?.map((p) => p.id) ?? [],
    });
    setShowForm(true);
  };

  const closeFormModal = () => {
    if (isSaving) return;
    setShowForm(false);
    reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showProductPicker && form.productIds.length === 0) {
      setAlert({
        isOpen: true,
        message: 'Selecione ao menos um produto do cardápio para esta promoção.',
        type: 'error',
      });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        status: form.status,
        channel: form.channel,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue) || 0,
        audienceSegment: form.audienceSegment || undefined,
        startsAt: form.startsAt || undefined,
        endsAt: endsAtForApi(form.endsAt),
        productIds: showProductPicker ? form.productIds : [],
      };
      if (editingId) await api.patch(`/crm/campaigns/${editingId}`, payload);
      else await api.post('/crm/campaigns', payload);
      setShowForm(false);
      reset();
      await load();
      setAlert({ isOpen: true, message: 'Campanha salva!', type: 'success' });
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : undefined;
      setAlert({ isOpen: true, message: message || 'Erro', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!canManage) return <div className="container">Acesso negado</div>;

  return (
    <CatalogPageLayout
      moduleLabel="CRM"
      modulePath="/crm/clientes"
      title="Campanhas e ofertas"
      description="Crie promoções, descontos e comunicados para seus clientes."
      loading={loading}
      loadingDescription="Carregando campanhas."
      actions={
        <button
          type="button"
          className="catalog-action-button"
          onClick={() => {
            reset();
            setShowForm(true);
          }}
        >
          Nova campanha
        </button>
      }
    >
      <ModalPortal isOpen={showForm}>
        <div className="app-modal-overlay" role="presentation" onClick={isSaving ? undefined : closeFormModal}>
          <div
            className="app-modal app-modal--wide crm-campaign-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crm-campaign-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="app-modal-header">
              <div>
                <h3 id="crm-campaign-modal-title">
                  {editingId ? 'Editar campanha' : 'Nova campanha'}
                </h3>
                <p className="app-modal-subtitle">
                  Crie promoções, descontos e comunicados para seus clientes.
                </p>
              </div>
              <button
                type="button"
                className="app-modal-close"
                onClick={closeFormModal}
                disabled={isSaving}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <form className="app-modal-body crm-campaign-modal__body catalog-form" onSubmit={handleSubmit}>
              <div className="catalog-form-grid crm-campaign-form-grid">
                <div className="form-group">
                  <label>Nome *</label>
                  <input
                    className="premium-text-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <PremiumSelect
                  label="Status"
                  value={form.status}
                  options={Object.entries(campaignStatusLabel).map(([v, l]) => ({
                    value: v,
                    label: l,
                  }))}
                  onChange={(v) => setForm({ ...form, status: v as CrmCampaignStatus })}
                />
                <PremiumSelect
                  label="Tipo"
                  value={form.type}
                  options={Object.entries(campaignTypeLabel).map(([v, l]) => ({
                    value: v,
                    label: l,
                  }))}
                  onChange={(v) => {
                    const type = v as CrmCampaignType;
                    setForm({
                      ...form,
                      type,
                      productIds: PROMO_TYPES.includes(type) ? form.productIds : [],
                    });
                  }}
                />
                <PremiumSelect
                  label="Canal"
                  value={form.channel}
                  options={Object.entries(campaignChannelLabel).map(([v, l]) => ({
                    value: v,
                    label: l,
                  }))}
                  onChange={(v) => setForm({ ...form, channel: v as CrmCampaignChannel })}
                />
                <PremiumSelect
                  label="Desconto"
                  value={form.discountType}
                  options={Object.entries(discountTypeLabel).map(([v, l]) => ({
                    value: v,
                    label: l,
                  }))}
                  onChange={(v) => setForm({ ...form, discountType: v as CrmDiscountType })}
                />
                <div className="form-group">
                  <label>Valor desconto</label>
                  <input
                    className="premium-text-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                  />
                </div>
                <PremiumSelect
                  label="Público (segmento)"
                  value={form.audienceSegment}
                  options={[
                    { value: '', label: 'Todos' },
                    ...Object.entries(segmentLabel).map(([v, l]) => ({
                      value: v,
                      label: l,
                    })),
                  ]}
                  onChange={(v) => setForm({ ...form, audienceSegment: v as CrmSegment | '' })}
                />
                <div className="form-group crm-campaign-description-field">
                  <label>Descrição</label>
                  <input
                    className="premium-text-input"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Início</label>
                  <input
                    className="premium-text-input"
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Fim</label>
                  <input
                    className="premium-text-input"
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  />
                  <p className="crm-campaign-products__hint">
                    Deixe em branco para a promoção não expirar. Status deve ser <strong>Ativa</strong>{' '}
                    para valer no salão.
                  </p>
                </div>
              </div>

              {showProductPicker ? (
                <CrmCampaignProductPicker
                  products={menuProducts}
                  selectedIds={form.productIds}
                  onChange={(productIds) => setForm({ ...form, productIds })}
                  loading={menuLoading}
                />
              ) : (
                <p className="crm-campaign-products__hint" style={{ marginTop: '1rem' }}>
                  Campanhas do tipo comunicado não exigem vínculo com produtos do cardápio.
                </p>
              )}

              <div className="app-modal-footer">
                <button
                  type="button"
                  className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                  onClick={closeFormModal}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="catalog-form-footer-btn catalog-form-footer-btn--primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>

      <section className="catalog-surface">
        <div className="catalog-grid">
          {items.map((c) => (
            <article className="catalog-card" key={c.id}>
              <strong>{c.name}</strong>
              <span>
                {campaignTypeLabel[c.type]} · {campaignChannelLabel[c.channel]}
              </span>
              <div className="catalog-chip-row">
                <span
                  className="catalog-pill is-muted"
                >
                  {campaignStatusLabel[c.status]}
                </span>
                {c.audienceSegment && (
                  <span className="catalog-pill is-muted">
                    {segmentLabel[c.audienceSegment]}
                  </span>
                )}
                {isCampaignExpired(c) && (
                  <span className="catalog-pill is-muted">Expirada</span>
                )}
              </div>
              {c.products && c.products.length > 0 ? (
                <p className="crm-campaign-card-products">
                  {c.products.length} produto{c.products.length === 1 ? '' : 's'}:{' '}
                  {c.products
                    .slice(0, 3)
                    .map((p) => p.name)
                    .join(', ')}
                  {c.products.length > 3 ? ` +${c.products.length - 3}` : ''}
                </p>
              ) : PROMO_TYPES.includes(c.type) ? (
                <p className="crm-campaign-card-products is-muted">Sem produtos vinculados</p>
              ) : null}
              <p>{c.description || 'Sem descrição'}</p>
              {c.discountType !== 'nenhum' && (
                <p className="crm-campaign-card-products">
                  Desconto: {discountTypeLabel[c.discountType]} ·{' '}
                  {c.discountType === 'percentual'
                    ? `${c.discountValue}%`
                    : formatMoney(c.discountValue)}
                </p>
              )}
              <div className="catalog-card-actions">
                <button type="button" className="catalog-card-button" onClick={() => openEdit(c)}>
                  Editar
                </button>
                <button
                  type="button"
                  className="catalog-card-button is-danger"
                  onClick={() => setConfirmId(c.id)}
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <AlertModal
        isOpen={alert.isOpen}
        onClose={() => setAlert({ ...alert, isOpen: false })}
        message={alert.message}
        type={alert.type}
      />
      <ConfirmModal
        isOpen={Boolean(confirmId)}
        title="Excluir campanha"
        message="Deseja excluir esta campanha?"
        confirmLabel="Excluir"
        isLoading={isDeleting}
        onClose={() => !isDeleting && setConfirmId(null)}
        onConfirm={async () => {
          if (!confirmId) return;
          setIsDeleting(true);
          try {
            await api.delete(`/crm/campaigns/${confirmId}`);
            await load();
            setConfirmId(null);
          } catch (err: unknown) {
            const message =
              err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data
                    ?.message
                : undefined;
            setAlert({ isOpen: true, message: message || 'Erro', type: 'error' });
          } finally {
            setIsDeleting(false);
          }
        }}
      />
    </CatalogPageLayout>
  );
};

export default CrmCampaignsPage;
