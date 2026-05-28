import React, { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import ModalPortal from '../../components/ModalPortal';
import LoadingSpinner from '../../components/LoadingSpinner';
import CatalogPagination from '../../components/catalog/CatalogPagination';
import { formatMoney } from '../pdv/pdvUtils';
import FitImagePreview from '../../components/FitImagePreview';
import { getMenuItemImageSrc, getMenuItemPlaceholderSrc } from './menuItemImage';
import { MobileMenuCategory, MobileMenuItem } from './smartPosTypes';
import '../../components/AppModal.css';
import './AddOrderItemModal.css';

type AddOrderItemModalProps = {
  isOpen: boolean;
  apiBase: string;
  tableNumber?: number;
  categories: MobileMenuCategory[];
  items: MobileMenuItem[];
  addingProductId: string | null;
  closeButtonLabel?: string;
  onAddItem: (productId: string, quantity: number) => void;
  onClose: () => void;
};

const ALL_CATEGORY = '__all__';

function normalizeSearch(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

const AddOrderItemModal: React.FC<AddOrderItemModalProps> = ({
  isOpen,
  apiBase,
  tableNumber,
  categories,
  items,
  addingProductId,
  closeButtonLabel = 'Fechar',
  onAddItem,
  onClose,
}) => {
  const [activeCategoryId, setActiveCategoryId] = useState(ALL_CATEGORY);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [isCategoryPending, startCategoryTransition] = useTransition();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setActiveCategoryId(ALL_CATEGORY);
      setPage(1);
      return;
    }
    const t = window.setTimeout(() => searchInputRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const cid = item.categoryId ?? '';
      counts.set(cid, (counts.get(cid) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    let list =
      activeCategoryId === ALL_CATEGORY
        ? items
        : items.filter((item) => item.categoryId === activeCategoryId);
    const q = normalizeSearch(searchQuery);
    if (!q) return list;
    return list.filter((item) => {
      const name = normalizeSearch(item.name);
      const desc = item.description ? normalizeSearch(item.description) : '';
      return name.includes(q) || desc.includes(q);
    });
  }, [activeCategoryId, items, searchQuery]);

  const selectCategory = (id: string) => {
    startCategoryTransition(() => setActiveCategoryId(id));
    setPage(1);
  };

  const total = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredItems.slice(start, start + limit);
  }, [filteredItems, currentPage, limit]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, activeCategoryId]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const busy = Boolean(addingProductId);

  return (
    <ModalPortal isOpen={isOpen}>
      <div
        className="app-modal-overlay"
        onClick={busy ? undefined : onClose}
        role="presentation"
      >
        <div
          className="app-modal app-modal--wide add-item-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-item-modal-title"
        >
          <div className="app-modal-header">
            <div>
              <h3 id="add-item-modal-title">Adicionar à comanda</h3>
              <p className="app-modal-subtitle">
                {tableNumber != null
                  ? `Mesa ${tableNumber} — escolha um item do cardápio`
                  : 'Escolha um item do cardápio'}
              </p>
            </div>
            <button
              type="button"
              className="app-modal-close"
              onClick={onClose}
              disabled={busy}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>

          <div className="app-modal-body">
            <div className="add-item-modal-search">
              <label htmlFor="add-item-modal-search-input">Buscar produto</label>
              <input
                ref={searchInputRef}
                id="add-item-modal-search-input"
                type="search"
                className="premium-text-input"
                placeholder="Digite o nome do produto…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={busy}
                autoComplete="off"
                enterKeyHint="search"
              />
              {searchQuery.trim() ? (
                <button
                  type="button"
                  className="add-item-modal-search-clear"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  disabled={busy}
                  aria-label="Limpar busca"
                >
                  Limpar
                </button>
              ) : null}
            </div>

            <div className="add-item-modal-categories" role="tablist" aria-label="Categorias">
              <button
                type="button"
                role="tab"
                aria-selected={activeCategoryId === ALL_CATEGORY}
                className={`add-item-modal-tab${activeCategoryId === ALL_CATEGORY ? ' is-active' : ''}`}
                onClick={() => selectCategory(ALL_CATEGORY)}
              >
                Todas
                <span className="add-item-modal-tab-count">{items.length}</span>
              </button>
              {categories.map((cat) => {
                const count = categoryCounts.get(cat.id) ?? 0;
                if (count === 0) return null;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={activeCategoryId === cat.id}
                    className={`add-item-modal-tab${activeCategoryId === cat.id ? ' is-active' : ''}`}
                    onClick={() => selectCategory(cat.id)}
                  >
                    {cat.icon ? <span className="add-item-modal-tab-icon">{cat.icon}</span> : null}
                    {cat.name}
                    <span className="add-item-modal-tab-count">{count}</span>
                  </button>
                );
              })}
            </div>

            <div
              className={`add-item-modal-scroll${isCategoryPending ? ' is-pending' : ''}`}
              aria-busy={busy || isCategoryPending}
            >
              {filteredItems.length === 0 ? (
                <p className="add-item-modal-empty">
                  {searchQuery.trim()
                    ? `Nenhum produto encontrado para “${searchQuery.trim()}”.`
                    : 'Nenhum item nesta categoria.'}
                </p>
              ) : (
                <div className="add-item-modal-grid">
                  {paginatedItems.map((item) => {
                    const isAdding = addingProductId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`add-item-modal-card${isAdding ? ' is-loading' : ''}${item.featured ? ' is-featured' : ''}`}
                        disabled={busy}
                        onClick={() => onAddItem(item.id, 1)}
                      >
                        <div className="add-item-modal-card-photo">
                          <FitImagePreview
                            src={getMenuItemImageSrc(item, apiBase)}
                            alt={item.name}
                            size="square"
                            rounded="md"
                            fallbackSrc={getMenuItemPlaceholderSrc(item)}
                            className="add-item-modal-card-fit-image"
                          />
                          {item.promoLabel ? (
                            <span className="catalog-pill catalog-pill--overlay is-solid is-muted">
                              {item.promoLabel}
                            </span>
                          ) : item.featured ? (
                            <span className="catalog-pill catalog-pill--overlay is-solid is-role">
                              Destaque
                            </span>
                          ) : null}
                        </div>
                        <div className="add-item-modal-card-body">
                          <strong>{item.name}</strong>
                          {item.description ? (
                            <p className="add-item-modal-card-desc">{item.description}</p>
                          ) : null}
                          <span className="add-item-modal-card-price">
                            {item.originalPrice != null && item.originalPrice > item.price ? (
                              <>
                                <span className="add-item-modal-card-price-old">
                                  {formatMoney(item.originalPrice)}
                                </span>
                                <span className="add-item-modal-card-price-promo">
                                  {formatMoney(item.price)}
                                </span>
                              </>
                            ) : (
                              formatMoney(item.price)
                            )}
                          </span>
                        </div>
                        {isAdding ? (
                          <span className="add-item-modal-card-spinner">
                            <LoadingSpinner size="sm" label="Adicionando" />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {total > 0 ? (
              <CatalogPagination
                page={currentPage}
                totalPages={totalPages}
                total={total}
                limit={limit}
                disabled={busy}
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
              className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
              onClick={onClose}
              disabled={busy}
            >
              {closeButtonLabel}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default AddOrderItemModal;
