import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import AlertModal from '../../components/AlertModal';
import ConfirmModal from '../../components/ConfirmModal';
import PremiumSelect from '../../components/PremiumSelect';
import FitImagePreview from '../../components/FitImagePreview';
import { getApiErrorMessage } from '../../utils/apiError';
import { getProductPhotoUrl } from '../../utils/productPhoto';
import CatalogRegistryDragHandle from '../../components/catalog/CatalogRegistryDragHandle';
import CatalogRegistryIconActions from '../../components/catalog/CatalogRegistryIconActions';
import CatalogPagination from '../../components/catalog/CatalogPagination';
import CatalogSortableTh from '../../components/catalog/CatalogSortableTh';
import { persistSortOrder, reorderById } from '../../utils/catalogRegistry';
import { AlertState, Product, ProductGroup, ProductUnit } from '../../types';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import ProductFormModal, { ProductFormValues } from './ProductFormModal';
import {
  DEFAULT_PAGE_SIZE,
  PaginatedMeta,
  PaginatedResponse,
  SortDirection,
} from '../../types/pagination';

const unitOptions = [
  { value: 'un', label: 'Unidade' },
  { value: 'kg', label: 'Quilograma' },
  { value: 'l', label: 'Litro' },
  { value: 'porcao', label: 'Porção' },
];

const formatMoney = (value: string | number): string => {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(n)
    ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'R$ 0,00';
};

const ProductsPage: React.FC = () => {
  const { user } = useContext(AuthContext) || {};
  const [items, setItems] = useState<Product[]>([]);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [filterGroupId, setFilterGroupId] = useState('');
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState('sortOrder');
  const [sortOrder, setSortOrder] = useState<SortDirection>('ASC');
  const [loading, setLoading] = useState(true);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<AlertState>({ isOpen: false, message: '', type: 'error' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const canManage = Boolean(user);
  const canDragReorder = sortBy === 'sortOrder' && sortOrder === 'ASC' && !filterGroupId;

  const loadGroups = useCallback(async () => {
    const { data } = await api.get<ProductGroup[]>('/product-groups/options');
    setGroups(data.filter((g) => g.active));
  }, []);

  const loadItems = useCallback(async () => {
    try {
      const params: Record<string, any> = { page, limit, sortBy, sortOrder };
      if (filterGroupId) params.groupId = filterGroupId;
      const { data } = await api.get<PaginatedResponse<Product>>('/products', { params });
      if (Array.isArray(data)) {
        setItems(data as any);
        setMeta(null);
      } else {
        setItems(data.data ?? []);
        setMeta(data.meta as any);
      }
    } catch (error) {
      console.error(error);
      setAlert({ isOpen: true, message: 'Erro ao carregar produtos.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, filterGroupId]);

  useEffect(() => {
    if (canManage) {
      loadGroups();
      setLoading(true);
      loadItems();
    }
  }, [canManage, loadGroups, loadItems]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(column);
      setSortOrder(column === 'createdAt' ? 'DESC' : 'ASC');
    }
    setPage(1);
  };

  const handleFilterGroup = (value: string) => {
    setFilterGroupId(value);
    setPage(1);
  };

  const filterGroupOptions = useMemo(
    () => [{ value: '', label: 'Todos os grupos' }, ...groups.map((g) => ({ value: g.id, label: g.name }))],
    [groups],
  );

  const stats = useMemo(() => {
    const total = meta?.total ?? items.length;
    const active = (meta as any)?.counts?.active ?? items.filter((i) => i.active).length;
    const inactive = (meta as any)?.counts?.inactive ?? Math.max(0, total - active);
    return { total, active, inactive };
  }, [meta, items]);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormModalOpen(true);
  };

  const openEditModal = (item: Product) => {
    setEditingItem(item);
    setFormModalOpen(true);
  };

  const closeFormModal = () => {
    if (isSaving) return;
    setFormModalOpen(false);
    setEditingItem(null);
  };

  const buildFormData = (values: ProductFormValues, photoFile: File | null): FormData => {
    const payload = new FormData();
    payload.append('name', values.name.trim());
    if (values.groupId) payload.append('groupId', values.groupId);
    payload.append('description', values.description.trim());
    if (values.sku.trim()) payload.append('sku', values.sku.trim());
    payload.append('costPrice', String(parseFloat(values.costPrice) || 0));
    payload.append('salePrice', String(parseFloat(values.salePrice) || 0));
    payload.append('unit', values.unit);
    payload.append('active', String(values.active));
    if (photoFile) payload.append('photo', photoFile);
    return payload;
  };

  const handleFormSubmit = async (values: ProductFormValues, photoFile: File | null) => {
    setIsSaving(true);
    try {
      const payload = buildFormData(values, photoFile);
      if (editingItem) {
        await api.patch(`/products/${editingItem.id}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post<Product>('/products', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setFormModalOpen(false);
      setEditingItem(null);
      await loadItems();
      setAlert({
        isOpen: true,
        message: editingItem ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!',
        type: 'success',
      });
    } catch (err: unknown) {
      setAlert({
        isOpen: true,
        message: getApiErrorMessage(err, 'Erro ao salvar produto.'),
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const persistOrder = async (ordered: Product[]) => {
    const previous = items;
    setItems(ordered);
    setIsReordering(true);
    try {
      await persistSortOrder('/products', ordered);
    } catch (err: unknown) {
      setItems(previous);
      setAlert({
        isOpen: true,
        message: getApiErrorMessage(err, 'Erro ao atualizar a ordem dos produtos.'),
        type: 'error',
      });
      await loadItems();
    } finally {
      setIsReordering(false);
    }
  };

  const handleDragStart = (id: string) => {
    if (!canDragReorder || isReordering) return;
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!canDragReorder || !draggedId || draggedId === id) return;
    setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!canDragReorder || !draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const reordered = reorderById(items, draggedId, targetId);
    setDraggedId(null);
    setDragOverId(null);
    void persistOrder(reordered);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDelete = async () => {
    if (!confirmTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/products/${confirmTarget.id}`);
      const nextPage = items.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      else await loadItems();
      setAlert({ isOpen: true, message: 'Produto excluído com sucesso!', type: 'success' });
      setConfirmOpen(false);
      setConfirmTarget(null);
    } catch (err: unknown) {
      setAlert({
        isOpen: true,
        message: getApiErrorMessage(err, 'Erro ao excluir produto.'),
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const unitLabel = (unit: ProductUnit) =>
    unitOptions.find((o) => o.value === unit)?.label || unit;

  if (!canManage) {
    return <div className="container">Acesso negado</div>;
  }

  const statsGrid = (
    <section className="catalog-stats-grid" aria-label="Resumo dos produtos">
      <article className="catalog-stat-card">
        <span>Total</span>
        <strong>{stats.total}</strong>
        <p>Produtos na listagem atual.</p>
      </article>
      <article className="catalog-stat-card">
        <span>Ativos</span>
        <strong>{stats.active}</strong>
        <p>Disponíveis para venda.</p>
      </article>
      <article className="catalog-stat-card">
        <span>Inativos</span>
        <strong>{stats.inactive}</strong>
        <p>Fora do cardápio.</p>
      </article>
    </section>
  );

  return (
    <CatalogPageLayout
      className="catalog-page--ifood catalog-registry-page"
      moduleLabel="Cadastros"
      modulePath="/cadastros/produtos"
      title="Cadastro de produtos"
      description="Cadastre itens do cardápio com custo, preço de venda, SKU e vínculo ao grupo para uso no PDV e relatórios."
      loading={loading}
      loadingDescription="Carregando cardápio e preços."
      actions={
        <button type="button" onClick={openCreateModal} className="catalog-action-button">
          Novo produto
        </button>
      }
      stats={!loading ? statsGrid : undefined}
    >
      <section className="catalog-registry-panel" aria-labelledby="products-panel-title">
        <header className="catalog-registry-panel__header">
          <div>
            <h2 id="products-panel-title">Produtos cadastrados</h2>
            <p className="catalog-registry-panel__meta">
              {meta?.total ?? items.length} produto(s)
              {canDragReorder && items.length > 1
                ? ' · Arraste para alterar a ordem no cardápio'
                : ''}
            </p>
          </div>
          <div className="catalog-registry-panel__search form-group">
            <PremiumSelect
              label="Filtrar por grupo"
              value={filterGroupId}
              options={filterGroupOptions}
              onChange={handleFilterGroup}
            />
          </div>
        </header>

        {items.length === 0 && !loading ? (
          <div className="catalog-empty">
            {filterGroupId
              ? 'Nenhum produto neste grupo.'
              : 'Nenhum produto cadastrado. Clique em "Novo produto" para começar.'}
          </div>
        ) : (
          <div className="catalog-registry-table catalog-registry-table--products">
            <div className="catalog-registry-table__head" role="row">
              <span aria-hidden="true" />
              <span />
              <CatalogSortableTh
                label="Produto"
                column="name"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
              />
              <CatalogSortableTh
                label="Preço"
                column="salePrice"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
              />
              <CatalogSortableTh
                label="Status"
                column="active"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
              />
              <span>Ações</span>
            </div>
            <ul className="catalog-registry-list" aria-label="Lista de produtos">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={`catalog-registry-row${draggedId === item.id ? ' is-dragging' : ''}${
                    dragOverId === item.id ? ' is-drag-over' : ''
                  }${isReordering ? ' is-reordering' : ''}${!canDragReorder ? ' is-drag-disabled' : ''}`}
                  onDragOver={(e) => handleDragOver(e, item.id)}
                  onDrop={(e) => handleDrop(e, item.id)}
                  onDragEnd={handleDragEnd}
                >
                  <CatalogRegistryDragHandle
                    label={`Reordenar produto ${item.name}`}
                    draggable={canDragReorder}
                    disabled={isReordering || !canDragReorder}
                    onDragStart={() => handleDragStart(item.id)}
                  />

                  <div className="catalog-registry-thumb">
                    <FitImagePreview
                      src={getProductPhotoUrl(item)}
                      alt=""
                      size="sm"
                      rounded="md"
                      placeholderContent={<span>🍽️</span>}
                    />
                  </div>

                  <div className="catalog-registry-main">
                    <span className="catalog-registry-name">{item.name}</span>
                    <span className="catalog-registry-desc">
                      {item.group?.name || 'Sem grupo'}
                      {item.sku ? ` · ${item.sku}` : ''}
                    </span>
                  </div>

                  <span className="catalog-registry-contact">
                    {formatMoney(item.salePrice)} · {unitLabel(item.unit)}
                  </span>

                  <div className="catalog-registry-status">
                    <span className="catalog-pill is-muted">
                      {item.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <CatalogRegistryIconActions
                    editLabel={`Editar produto ${item.name}`}
                    deleteLabel={`Excluir produto ${item.name}`}
                    disabled={isReordering}
                    onEdit={() => openEditModal(item)}
                    onDelete={() => {
                      setConfirmTarget(item);
                      setConfirmOpen(true);
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {meta && meta.total > 0 && (
          <CatalogPagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            limit={meta.limit}
            disabled={loading || isReordering}
            onPageChange={setPage}
            onLimitChange={(next) => {
              setLimit(next);
              setPage(1);
            }}
          />
        )}
      </section>

      <ProductFormModal
        isOpen={formModalOpen}
        editing={editingItem}
        groups={groups}
        isSaving={isSaving}
        onClose={closeFormModal}
        onSubmit={handleFormSubmit}
      />

      <AlertModal
        isOpen={alert.isOpen}
        onClose={() => setAlert({ ...alert, isOpen: false })}
        message={alert.message}
        type={alert.type}
      />
      <ConfirmModal
        isOpen={confirmOpen}
        title="Excluir produto"
        subtitle="Esta ação não pode ser desfeita."
        message={confirmTarget ? `O produto "${confirmTarget.name}" será removido permanentemente.` : ''}
        confirmLabel="Excluir"
        isLoading={isDeleting}
        loadingLabel="Excluindo…"
        onClose={() => !isDeleting && setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </CatalogPageLayout>
  );
};

export default ProductsPage;
