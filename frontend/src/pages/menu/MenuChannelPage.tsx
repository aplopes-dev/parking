import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import AlertModal from '../../components/AlertModal';
import CatalogRegistryDragHandle from '../../components/catalog/CatalogRegistryDragHandle';
import FitImagePreview from '../../components/FitImagePreview';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import { AlertState, MenuCatalogItem, MenuChannel, MenuSettings, Product } from '../../types';
import { reorderById } from '../../utils/catalogRegistry';
import { getProductPhotoUrl } from '../../utils/productPhoto';
import { getMenuItemPlaceholderSrc } from '../integration/menuItemImage';
import { formatMoney } from '../pdv/pdvUtils';
import { menuChannelBadge, menuChannelLabel } from './menuUtils';
import {
  MENU_EDITOR_TAB_DESCRIPTIONS,
  MENU_EDITOR_TAB_LABELS,
  menuEditorTabFromSearch,
  type MenuEditorTab,
} from './menuEditorTabs';
import '../../components/catalog/CatalogRegistry.css';
import '../finance/Finance.css';
import './MenuChannel.css';

type ProductEditState = {
  visible: boolean;
  featured: boolean;
  promoLabel: string;
};

const MenuChannelPage: React.FC = () => {
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const channel: MenuChannel = pathname.includes('delivery') ? 'delivery' : 'mesa';
  const editorTab = menuEditorTabFromSearch(searchParams.toString());

  const { user } = useContext(AuthContext) || {};
  const [settings, setSettings] = useState<MenuSettings | null>(null);
  const [catalog, setCatalog] = useState<MenuCatalogItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderedProducts, setOrderedProducts] = useState<Product[]>([]);
  const [productEdits, setProductEdits] = useState<Record<string, ProductEditState>>({});
  const [productSearch, setProductSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingProducts, setSavingProducts] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertState>({ isOpen: false, message: '', type: 'error' });
  const canManage = Boolean(user);

  const setEditorTab = (tab: MenuEditorTab) => {
    setSearchParams({ aba: tab }, { replace: true });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [setRes, catRes, prodRes] = await Promise.all([
        api.get<MenuSettings>(`/menu/${channel}/settings`),
        api.get<{ settings: MenuSettings; catalog: MenuCatalogItem[]; visible: MenuCatalogItem[] }>(
          `/menu/${channel}/catalog`,
        ),
        api.get<{ data: Product[] }>('/products', { params: { activeOnly: true, limit: 100 } }),
      ]);
      setSettings(setRes.data);
      setCatalog(catRes.data.catalog);
      const activeProducts = prodRes.data.data;
      setProducts(activeProducts);

      const sortMap = new Map(
        catRes.data.catalog.map((c) => [c.product.id, c.sortOrder ?? 0]),
      );
      const sorted = [...activeProducts].sort(
        (a, b) =>
          (sortMap.get(a.id) ?? 9999) - (sortMap.get(b.id) ?? 9999) ||
          a.name.localeCompare(b.name, 'pt-BR'),
      );
      setOrderedProducts(sorted);

      const edits: Record<string, ProductEditState> = {};
      catRes.data.catalog.forEach((item) => {
        edits[item.product.id] = {
          visible: item.visible,
          featured: item.featured,
          promoLabel: item.promoLabel ?? '',
        };
      });
      activeProducts.forEach((p) => {
        if (!edits[p.id]) {
          edits[p.id] = { visible: true, featured: false, promoLabel: '' };
        }
      });
      setProductEdits(edits);
    } finally {
      setLoading(false);
    }
  }, [channel]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const stats = useMemo(() => {
    const visible = products.filter((p) => productEdits[p.id]?.visible ?? true).length;
    const featured = products.filter((p) => productEdits[p.id]?.featured).length;
    return { total: products.length, visible, featured };
  }, [products, productEdits]);

  const filteredOrderedProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return orderedProducts;
    return orderedProducts.filter((p) => p.name.toLowerCase().includes(q));
  }, [orderedProducts, productSearch]);

  const previewItems = useMemo(() => {
    const orderIndex = new Map(orderedProducts.map((p, i) => [p.id, i]));
    return catalog
      .filter((i) => productEdits[i.product.id]?.visible ?? i.visible)
      .sort(
        (a, b) =>
          (orderIndex.get(a.product.id) ?? 9999) - (orderIndex.get(b.product.id) ?? 9999),
      );
  }, [catalog, productEdits, orderedProducts]);

  const handleSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !canManage) return;
    setSavingSettings(true);
    try {
      const { data } = await api.patch<MenuSettings>(`/menu/${channel}/settings`, {
        title: settings.title,
        welcomeMessage: settings.welcomeMessage,
        active: settings.active,
        serviceFeeEnabled: settings.serviceFeeEnabled,
        serviceFeePercent: Number(settings.serviceFeePercent),
        minOrderAmount: Number(settings.minOrderAmount),
        estimatedMinutes: settings.estimatedMinutes,
      });
      setSettings(data);
      setAlert({ isOpen: true, message: 'Configurações salvas', type: 'success' });
    } catch (err: any) {
      setAlert({ isOpen: true, message: err.response?.data?.message || 'Erro', type: 'error' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveProducts = async () => {
    if (!canManage) return;
    setSavingProducts(true);
    try {
      await api.post(`/menu/${channel}/products/sync`, {
        channel,
        products: orderedProducts.map((p, i) => ({
          productId: p.id,
          visible: productEdits[p.id]?.visible ?? true,
          featured: productEdits[p.id]?.featured ?? false,
          promoLabel: productEdits[p.id]?.promoLabel?.trim() || null,
          sortOrder: i,
        })),
      });
      await load();
      setAlert({ isOpen: true, message: 'Itens do cardápio salvos', type: 'success' });
    } catch (err: any) {
      setAlert({ isOpen: true, message: err.response?.data?.message || 'Erro', type: 'error' });
    } finally {
      setSavingProducts(false);
    }
  };

  const updateProductEdit = (productId: string, patch: Partial<ProductEditState>) => {
    setProductEdits((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], ...patch },
    }));
  };

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== id) setDragOverId(id);
  };
  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      handleDragEnd();
      return;
    }
    setOrderedProducts((list) => reorderById(list, draggedId, targetId));
    handleDragEnd();
  };

  const statsGrid = !loading ? (
    <section className="catalog-stats-grid">
      <article className="catalog-stat-card">
        <span>Produtos</span>
        <strong>{stats.total}</strong>
        <p>Cadastrados e ativos.</p>
      </article>
      <article className="catalog-stat-card">
        <span>Visíveis</span>
        <strong>{stats.visible}</strong>
        <p>Exibidos no cardápio.</p>
      </article>
      <article className="catalog-stat-card">
        <span>Destaques</span>
        <strong>{stats.featured}</strong>
        <p>Itens em evidência.</p>
      </article>
      <article className="catalog-stat-card">
        <span>Status</span>
        <strong>{settings?.active ? 'Ativo' : 'Inativo'}</strong>
        <p>Canal {channel === 'mesa' ? 'mesa' : 'delivery'}.</p>
      </article>
    </section>
  ) : undefined;

  return (
    <CatalogPageLayout
      className="finance-page menu-channel-page"
      moduleLabel="Cardápio digital"
      modulePath="/cardapio/mesa"
      title={menuChannelLabel(channel)}
      description={MENU_EDITOR_TAB_DESCRIPTIONS[editorTab]}
      loading={loading}
      loadingDescription="Carregando configurações do cardápio."
      stats={statsGrid}
    >
      <nav className="finance-tabs menu-channel-tabs" role="tablist" aria-label="Editor do cardápio">
        {(['configuracao', 'produtos', 'visualizacao'] as MenuEditorTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={editorTab === tab}
            className={`finance-tab${editorTab === tab ? ' finance-tab--active' : ''}`}
            onClick={() => setEditorTab(tab)}
          >
            {MENU_EDITOR_TAB_LABELS[tab]}
          </button>
        ))}
      </nav>

      {!loading && editorTab === 'configuracao' && settings && (
        <section className="catalog-surface catalog-form-surface--premium">
          <div className="catalog-section-header">
            <div>
              <span className="catalog-section-kicker">Configuração</span>
              <h2>Parâmetros do cardápio ({menuChannelBadge(channel)})</h2>
            </div>
          </div>
          <form className="catalog-form" onSubmit={handleSettings}>
            <div className="catalog-form-grid">
              <div className="form-group">
                <label htmlFor="menu-title">Título</label>
                <input
                  id="menu-title"
                  className="premium-text-input"
                  value={settings.title}
                  onChange={(e) => setSettings((s) => (s ? { ...s, title: e.target.value } : s))}
                  disabled={!canManage}
                />
              </div>
              {channel === 'delivery' && (
                <>
                  <div className="form-group">
                    <label htmlFor="menu-min">Pedido mínimo (R$)</label>
                    <input
                      id="menu-min"
                      className="premium-text-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.minOrderAmount}
                      onChange={(e) =>
                        setSettings((s) =>
                          s ? { ...s, minOrderAmount: e.target.value as unknown as number } : s,
                        )
                      }
                      disabled={!canManage}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="menu-eta">Tempo estimado (min)</label>
                    <input
                      id="menu-eta"
                      className="premium-text-input"
                      type="number"
                      min="0"
                      value={settings.estimatedMinutes}
                      onChange={(e) =>
                        setSettings((s) =>
                          s ? { ...s, estimatedMinutes: Number(e.target.value) } : s,
                        )
                      }
                      disabled={!canManage}
                    />
                  </div>
                </>
              )}
              {settings.serviceFeeEnabled && (
                <div className="form-group">
                  <label htmlFor="menu-fee-percent">Taxa de serviço (%)</label>
                  <input
                    id="menu-fee-percent"
                    className="premium-text-input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={settings.serviceFeePercent}
                    onChange={(e) =>
                      setSettings((s) =>
                        s ? { ...s, serviceFeePercent: e.target.value as unknown as number } : s,
                      )
                    }
                    disabled={!canManage}
                  />
                </div>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="menu-welcome">Mensagem de boas-vindas</label>
              <textarea
                id="menu-welcome"
                className="premium-text-input"
                value={settings.welcomeMessage || ''}
                onChange={(e) =>
                  setSettings((s) => (s ? { ...s, welcomeMessage: e.target.value } : s))
                }
                disabled={!canManage}
                rows={3}
              />
            </div>
            <label className="form-group">
              <input
                type="checkbox"
                checked={settings.active}
                onChange={(e) =>
                  setSettings((s) => (s ? { ...s, active: e.target.checked } : s))
                }
                disabled={!canManage}
              />{' '}
              Cardápio ativo
            </label>
            <label className="form-group">
              <input
                type="checkbox"
                checked={settings.serviceFeeEnabled}
                onChange={(e) =>
                  setSettings((s) => (s ? { ...s, serviceFeeEnabled: e.target.checked } : s))
                }
                disabled={!canManage}
              />{' '}
              Taxa de serviço no cardápio
            </label>
            {canManage && (
              <div className="catalog-form-footer">
                <button
                  type="submit"
                  className="catalog-form-footer-btn catalog-form-footer-btn--primary"
                  disabled={savingSettings}
                >
                  {savingSettings ? 'Salvando…' : 'Salvar configuração'}
                </button>
              </div>
            )}
          </form>
        </section>
      )}

      {!loading && editorTab === 'produtos' && (
        <section className="catalog-registry-panel">
          <header className="catalog-registry-panel__header">
            <div>
              <span className="catalog-section-kicker">Produtos</span>
              <h2 id="menu-products-panel-title">Itens do cardápio</h2>
              <p className="catalog-registry-panel__meta">
                {orderedProducts.length} produto(s) ativo(s) — arraste para definir a ordem de
                exibição.
              </p>
            </div>
            <div className="menu-channel-products-actions">
              <Link to="/cadastros/produtos" className="catalog-form-footer-btn catalog-form-footer-btn--ghost">
                Cadastro de produtos
              </Link>
              {canManage && (
                <button
                  type="button"
                  className="catalog-form-footer-btn catalog-form-footer-btn--primary"
                  onClick={handleSaveProducts}
                  disabled={savingProducts}
                >
                  {savingProducts ? 'Salvando…' : 'Salvar itens'}
                </button>
              )}
            </div>
          </header>

          <div className="menu-channel-products-toolbar">
            <div className="form-group catalog-search">
              <label htmlFor="menu-product-search">Buscar produto</label>
              <input
                id="menu-product-search"
                type="search"
                className="premium-text-input"
                placeholder="Nome do produto…"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>
          </div>

          {orderedProducts.length === 0 ? (
            <div className="catalog-empty">
              Nenhum produto ativo.{' '}
              <Link to="/cadastros/produtos">Cadastre produtos</Link> para montar o cardápio.
            </div>
          ) : filteredOrderedProducts.length === 0 ? (
            <div className="catalog-empty">Nenhum produto encontrado para esta busca.</div>
          ) : (
            <div className="catalog-registry-table menu-channel-products-table menu-channel-products-table--5col">
              <div className="catalog-registry-table__head" aria-hidden>
                <span />
                <span>Produto</span>
                <span>Visível</span>
                <span>Destaque</span>
                <span>Etiqueta promo</span>
              </div>
              <ul className="catalog-registry-list" aria-labelledby="menu-products-panel-title">
                {filteredOrderedProducts.map((p) => {
                  const edit = productEdits[p.id];
                  const photoUrl = getProductPhotoUrl(p);
                  return (
                    <li
                      key={p.id}
                      className={`catalog-registry-row menu-channel-product-row${
                        draggedId === p.id ? ' is-dragging' : ''
                      }${dragOverId === p.id ? ' is-drag-over' : ''}`}
                      onDragOver={(e) => handleDragOver(e, p.id)}
                      onDrop={(e) => handleDrop(e, p.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <CatalogRegistryDragHandle
                        label={`Reordenar ${p.name}`}
                        draggable={Boolean(canManage) && !productSearch.trim()}
                        disabled={!canManage || Boolean(productSearch.trim())}
                        onDragStart={() => handleDragStart(p.id)}
                      />
                      <div className="menu-channel-product-main">
                        <FitImagePreview
                          src={photoUrl}
                          alt={p.name}
                          size="sm"
                          rounded="md"
                          fallbackSrc={getMenuItemPlaceholderSrc({ id: p.id, name: p.name })}
                          placeholderContent={
                            <span>{p.name.trim().charAt(0).toUpperCase() || '?'}</span>
                          }
                        />
                        <div className="catalog-registry-main">
                          <span className="catalog-registry-name">{p.name}</span>
                          <span className="catalog-registry-desc">{formatMoney(p.salePrice)}</span>
                        </div>
                      </div>
                      <label className="menu-channel-product-check">
                        <input
                          type="checkbox"
                          checked={edit?.visible ?? true}
                          disabled={!canManage}
                          onChange={(e) =>
                            updateProductEdit(p.id, { visible: e.target.checked })
                          }
                        />
                        <span>Visível</span>
                      </label>
                      <label className="menu-channel-product-check">
                        <input
                          type="checkbox"
                          checked={edit?.featured ?? false}
                          disabled={!canManage}
                          onChange={(e) =>
                            updateProductEdit(p.id, { featured: e.target.checked })
                          }
                        />
                        <span>Destaque</span>
                      </label>
                      <input
                        type="text"
                        className="premium-text-input menu-channel-promo-input"
                        placeholder="Ex: -10%"
                        maxLength={80}
                        value={edit?.promoLabel ?? ''}
                        disabled={!canManage}
                        onChange={(e) =>
                          updateProductEdit(p.id, { promoLabel: e.target.value })
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {canManage && orderedProducts.length > 0 && (
            <div className="catalog-form-footer menu-channel-products-footer">
              <button
                type="button"
                className="catalog-form-footer-btn catalog-form-footer-btn--primary"
                onClick={handleSaveProducts}
                disabled={savingProducts}
              >
                {savingProducts ? 'Salvando…' : 'Salvar itens do cardápio'}
              </button>
            </div>
          )}
        </section>
      )}

      {!loading && editorTab === 'visualizacao' && (
        <section className="catalog-surface catalog-form-surface--premium menu-preview-panel">
          <div className="catalog-section-header">
            <div>
              <span className="catalog-section-kicker">Pré-visualização</span>
              <h2>{settings?.title || 'Cardápio'}</h2>
            </div>
            <p>{previewItems.length} item(ns) visível(is)</p>
          </div>
          {canManage && (
            <p className="menu-preview-edit-hint">
              Para alterar título, taxas ou itens, use as abas{' '}
              <button type="button" className="menu-channel-inline-tab" onClick={() => setEditorTab('configuracao')}>
                Configuração
              </button>{' '}
              e{' '}
              <button type="button" className="menu-channel-inline-tab" onClick={() => setEditorTab('produtos')}>
                Produtos
              </button>
              .
            </p>
          )}
          {settings?.welcomeMessage ? (
            <p className="menu-preview-welcome">{settings.welcomeMessage}</p>
          ) : null}
          {previewItems.length === 0 ? (
            <div className="catalog-empty">Nenhum item visível no cardápio.</div>
          ) : (
            <div className="menu-preview-grid" role="list">
              {previewItems.map((item) => {
                const photoUrl = getProductPhotoUrl(item.product);
                const edit = productEdits[item.product.id];
                const promo =
                  edit?.promoLabel?.trim() || item.promoLabel || undefined;
                return (
                  <article
                    className={`menu-preview-card${edit?.featured || item.featured ? ' is-featured' : ''}`}
                    key={item.product.id}
                    role="listitem"
                  >
                    <div className="menu-preview-card-media">
                      <FitImagePreview
                        src={photoUrl}
                        alt={item.product.name}
                        size="square"
                        rounded="md"
                        fallbackSrc={getMenuItemPlaceholderSrc({
                          id: item.product.id,
                          name: item.product.name,
                        })}
                        placeholderContent={
                          <span>
                            {item.product.name.trim().charAt(0).toUpperCase() || '?'}
                          </span>
                        }
                        className="menu-preview-card-fit-image"
                      />
                      {(edit?.featured ?? item.featured) && (
                        <span className="catalog-pill catalog-pill--overlay is-solid is-muted">
                          Destaque
                        </span>
                      )}
                      {promo ? (
                        <span className="catalog-pill catalog-pill--overlay is-solid is-muted">
                          {promo}
                        </span>
                      ) : null}
                    </div>
                    <div className="menu-preview-card-body">
                      <div className="catalog-card-headline menu-preview-card-headline">
                        <strong>{item.product.name}</strong>
                        <span className="menu-preview-card-price">
                          {formatMoney(item.product.salePrice)}
                        </span>
                      </div>
                      {item.product.description ? (
                        <p className="menu-preview-card-desc">{item.product.description}</p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      <AlertModal
        isOpen={alert.isOpen}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert((a) => ({ ...a, isOpen: false }))}
      />
    </CatalogPageLayout>
  );
};

export default MenuChannelPage;
