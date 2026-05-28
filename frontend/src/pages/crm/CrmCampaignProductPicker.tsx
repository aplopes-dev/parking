import React, { useEffect, useMemo, useState, useTransition } from 'react';
import ModalPortal from '../../components/ModalPortal';
import { Product } from '../../types';
import { formatMoney } from '../pdv/pdvUtils';
import FitImagePreview from '../../components/FitImagePreview';
import { getProductPhotoUrl } from '../../utils/productPhoto';
import CatalogPagination from '../../components/catalog/CatalogPagination';
import '../../components/AppModal.css';
import '../integration/AddOrderItemModal.css';
import './CrmCampaignProductPicker.css';

const ALL_GROUP = '__all__';

type CrmCampaignProductPickerProps = {
  products: Product[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
};

const CrmCampaignProductPicker: React.FC<CrmCampaignProductPickerProps> = ({
  products,
  selectedIds,
  onChange,
  loading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(ALL_GROUP);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [isGroupPending, startGroupTransition] = useTransition();

  const groups = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) {
      const key = p.groupId ?? 'sem-grupo';
      const label = p.group?.name ?? 'Sem categoria';
      if (!map.has(key)) map.set(key, label);
    }
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [products]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      const key = product.groupId ?? 'sem-grupo';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const groupKey = p.groupId ?? 'sem-grupo';
      if (activeGroup !== ALL_GROUP && groupKey !== activeGroup) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.group?.name ?? '').toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q)
      );
    });
  }, [products, activeGroup, search]);

  const toggle = (productId: string) => {
    if (selectedIds.includes(productId)) {
      onChange(selectedIds.filter((id) => id !== productId));
    } else {
      onChange([...selectedIds, productId]);
    }
  };

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, currentPage, limit]);

  useEffect(() => {
    setPage(1);
  }, [activeGroup, search, isOpen]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <>
      <div className="crm-campaign-products">
        <div className="crm-campaign-products__header">
          <div>
            <h4 className="crm-campaign-products__title">Produtos do cardápio</h4>
            <p className="crm-campaign-products__hint">
              Abra o seletor para filtrar por busca/categoria e escolher os itens da promoção.
            </p>
          </div>
          <span className="catalog-pill is-role">
            {selectedIds.length} selecionado{selectedIds.length === 1 ? '' : 's'}
          </span>
        </div>
        <button
          type="button"
          className="catalog-form-footer-btn catalog-form-footer-btn--primary crm-campaign-products__open-btn"
          onClick={() => setIsOpen(true)}
          disabled={loading}
        >
          Selecionar produtos
        </button>
      </div>

      <ModalPortal isOpen={isOpen}>
        <div
          className="app-modal-overlay"
          role="presentation"
          onClick={loading ? undefined : () => setIsOpen(false)}
        >
          <div
            className="app-modal app-modal--wide crm-campaign-products-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crm-campaign-products-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="app-modal-header">
              <div>
                <h3 id="crm-campaign-products-title">Produtos do cardápio</h3>
                <p className="app-modal-subtitle">
                  Busque e filtre por abas para selecionar os produtos da campanha.
                </p>
              </div>
              <button
                type="button"
                className="app-modal-close"
                onClick={() => setIsOpen(false)}
                disabled={loading}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="app-modal-body">
              <div className="add-item-modal-search">
                <label htmlFor="crm-campaign-products-search">Buscar produto</label>
                <input
                  id="crm-campaign-products-search"
                  type="search"
                  className="premium-text-input"
                  placeholder="Digite o nome do produto…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={loading}
                />
                {search.trim() ? (
                  <button
                    type="button"
                    className="add-item-modal-search-clear"
                    onClick={() => setSearch('')}
                    disabled={loading}
                  >
                    Limpar
                  </button>
                ) : null}
              </div>

              <div
                className={`add-item-modal-categories${isGroupPending ? ' is-pending' : ''}`}
                role="tablist"
                aria-label="Categorias do cardápio"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeGroup === ALL_GROUP}
                  className={`add-item-modal-tab${activeGroup === ALL_GROUP ? ' is-active' : ''}`}
                  onClick={() => startGroupTransition(() => setActiveGroup(ALL_GROUP))}
                >
                  Todas
                  <span className="add-item-modal-tab-count">{products.length}</span>
                </button>
                {groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    role="tab"
                    aria-selected={activeGroup === g.id}
                    className={`add-item-modal-tab${activeGroup === g.id ? ' is-active' : ''}`}
                    onClick={() => startGroupTransition(() => setActiveGroup(g.id))}
                  >
                    {g.label}
                    <span className="add-item-modal-tab-count">{categoryCounts.get(g.id) ?? 0}</span>
                  </button>
                ))}
              </div>

              <div className={`add-item-modal-scroll${isGroupPending ? ' is-pending' : ''}`}>
                {loading ? (
                  <p className="add-item-modal-empty">Carregando cardápio…</p>
                ) : filtered.length === 0 ? (
                  <p className="add-item-modal-empty">
                    Nenhum produto visível no cardápio. Cadastre itens em Cardápio para mesa ou
                    delivery.
                  </p>
                ) : (
                  <div className="add-item-modal-grid">
                    {paginated.map((p) => {
                      const checked = selectedIds.includes(p.id);
                      const imageUrl = getProductPhotoUrl(p);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={`add-item-modal-card${checked ? ' is-featured' : ''}`}
                          onClick={() => toggle(p.id)}
                          disabled={loading}
                        >
                          <div className="add-item-modal-card-photo">
                            <FitImagePreview
                              src={imageUrl}
                              alt={p.name}
                              size="square"
                              rounded="md"
                              className="add-item-modal-card-fit-image"
                            />
                            {checked ? (
                              <span className="catalog-pill catalog-pill--overlay is-solid is-role">
                                Selecionado
                              </span>
                            ) : null}
                          </div>
                          <div className="add-item-modal-card-body">
                            <strong>{p.name}</strong>
                            <p className="add-item-modal-card-desc">{p.group?.name ?? 'Sem categoria'}</p>
                            <span className="add-item-modal-card-price">{formatMoney(p.salePrice)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {!loading && total > 0 ? (
                <CatalogPagination
                  page={currentPage}
                  totalPages={totalPages}
                  total={total}
                  limit={limit}
                  disabled={loading}
                  onPageChange={setPage}
                  onLimitChange={(next) => {
                    setLimit(next);
                    setPage(1);
                  }}
                />
              ) : null}
            </div>

            <div className="app-modal-footer">
              <button
                type="button"
                className="catalog-form-footer-btn catalog-form-footer-btn--primary"
                onClick={() => setIsOpen(false)}
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </>
  );
};

export default CrmCampaignProductPicker;
