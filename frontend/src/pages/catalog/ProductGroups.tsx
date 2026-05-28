import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import AlertModal from '../../components/AlertModal';
import ConfirmModal from '../../components/ConfirmModal';
import ProductGroupFormModal, { ProductGroupFormValues } from './ProductGroupFormModal';
import { AlertState, ProductGroup } from '../../types';
import {
  DEFAULT_PAGE_SIZE,
  PaginatedMeta,
  PaginatedResponse,
  SortDirection,
} from '../../types/pagination';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import CatalogPagination from '../../components/catalog/CatalogPagination';
import CatalogSortableTh from '../../components/catalog/CatalogSortableTh';
import CatalogRegistryDragHandle from '../../components/catalog/CatalogRegistryDragHandle';
import CatalogRegistryIconActions from '../../components/catalog/CatalogRegistryIconActions';
import { persistSortOrder, reorderById } from '../../utils/catalogRegistry';

const ProductGroupsPage: React.FC = () => {
  const { user } = useContext(AuthContext) || {};
  const [items, setItems] = useState<ProductGroup[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState('sortOrder');
  const [sortOrder, setSortOrder] = useState<SortDirection>('ASC');
  const [loading, setLoading] = useState(true);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductGroup | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertState>({ isOpen: false, message: '', type: 'error' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<ProductGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManage = Boolean(user);
  const canDragReorder = sortBy === 'sortOrder' && sortOrder === 'ASC';

  const loadItems = useCallback(async () => {
    try {
      const { data } = await api.get<PaginatedResponse<ProductGroup>>('/product-groups', {
        params: { page, limit, sortBy, sortOrder },
      });
      setItems(data.data);
      setMeta(data.meta);
    } catch (error) {
      console.error(error);
      setAlert({ isOpen: true, message: 'Erro ao carregar grupos de produtos.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder]);

  useEffect(() => {
    if (canManage) {
      setLoading(true);
      loadItems();
    }
  }, [canManage, loadItems]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(column);
      setSortOrder('ASC');
    }
    setPage(1);
  };

  const stats = useMemo(() => {
    const total = meta?.total ?? 0;
    const active = meta?.counts?.active ?? items.filter((i) => i.active).length;
    const inactive = meta?.counts?.inactive ?? Math.max(0, total - active);
    return { total, active, inactive };
  }, [meta, items]);

  const nextSortOrder = useMemo(() => {
    if ((meta?.total ?? 0) === 0) return 0;
    return (meta?.total ?? 0) + 1;
  }, [meta?.total]);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormModalOpen(true);
  };

  const openEditModal = (item: ProductGroup) => {
    setEditingItem(item);
    setFormModalOpen(true);
  };

  const closeFormModal = () => {
    if (isSaving) return;
    setFormModalOpen(false);
    setEditingItem(null);
  };

  const handleFormSubmit = async (values: ProductGroupFormValues) => {
    const payload = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      active: values.active,
    };

    setIsSaving(true);
    try {
      if (editingItem) {
        await api.patch(`/product-groups/${editingItem.id}`, payload);
      } else {
        await api.post('/product-groups', { ...payload, sortOrder: nextSortOrder });
      }
      setFormModalOpen(false);
      setEditingItem(null);
      await loadItems();
      setAlert({
        isOpen: true,
        message: editingItem ? 'Grupo atualizado com sucesso!' : 'Grupo criado com sucesso!',
        type: 'success',
      });
    } catch (error: any) {
      setAlert({
        isOpen: true,
        message: error.response?.data?.message || 'Erro ao salvar grupo.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const persistOrder = async (ordered: ProductGroup[]) => {
    const previous = items;
    setItems(ordered);
    setIsReordering(true);
    try {
      await persistSortOrder('/product-groups', ordered);
    } catch (error: any) {
      setItems(previous);
      setAlert({
        isOpen: true,
        message: error.response?.data?.message || 'Erro ao atualizar a ordem dos grupos.',
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
      await api.delete(`/product-groups/${confirmTarget.id}`);
      const nextPage =
        items.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      else await loadItems();
      setAlert({ isOpen: true, message: 'Grupo excluído com sucesso!', type: 'success' });
      setConfirmOpen(false);
      setConfirmTarget(null);
    } catch (error: any) {
      setAlert({
        isOpen: true,
        message: error.response?.data?.message || 'Erro ao excluir grupo.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!canManage) {
    return <div className="container">Acesso negado</div>;
  }

  const statsGrid = (
    <section className="catalog-stats-grid" aria-label="Resumo dos grupos">
      <article className="catalog-stat-card">
        <span>Total</span>
        <strong>{stats.total}</strong>
        <p>Grupos cadastrados.</p>
      </article>
      <article className="catalog-stat-card">
        <span>Ativos</span>
        <strong>{stats.active}</strong>
        <p>Disponíveis no cardápio.</p>
      </article>
      <article className="catalog-stat-card">
        <span>Inativos</span>
        <strong>{stats.inactive}</strong>
        <p>Ocultos da operação.</p>
      </article>
    </section>
  );

  return (
    <CatalogPageLayout
      className="catalog-page--ifood catalog-registry-page"
      moduleLabel="Cadastros"
      modulePath="/cadastros/grupos-produtos"
      title="Grupo de produtos"
      description="Classifique itens do cardápio em grupos como bebidas, porções, pizzas e sobremesas para facilitar vendas e relatórios."
      loading={loading}
      loadingDescription="Organizando categorias do cardápio."
      actions={
        <button type="button" onClick={openCreateModal} className="catalog-action-button">
          Novo grupo
        </button>
      }
      stats={!loading ? statsGrid : undefined}
    >
      <section className="catalog-registry-panel" aria-labelledby="product-groups-panel-title">
        <header className="catalog-registry-panel__header">
          <div>
            <h2 id="product-groups-panel-title">Grupos cadastrados</h2>
            <p className="catalog-registry-panel__meta">
              {meta?.total ?? 0} grupo(s)
              {canDragReorder && items.length > 1
                ? ' · Arraste para alterar a ordem no cardápio'
                : ''}
            </p>
          </div>
        </header>

        {items.length === 0 && !loading ? (
          <div className="catalog-empty">
            Nenhum grupo cadastrado. Clique em &quot;Novo grupo&quot; para começar.
          </div>
        ) : (
          <div className="catalog-registry-table catalog-registry-table--5col">
            <div className="catalog-registry-table__head" role="row">
              <span aria-hidden="true" />
              <CatalogSortableTh
                label="Grupo"
                column="name"
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
              <CatalogSortableTh
                label="Criado em"
                column="createdAt"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
              />
              <span>Ações</span>
            </div>
            <ul className="catalog-registry-list" aria-label="Lista de grupos de produtos">
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
                    label={`Reordenar grupo ${item.name}`}
                    draggable={canDragReorder}
                    disabled={isReordering || !canDragReorder}
                    onDragStart={() => handleDragStart(item.id)}
                  />

                  <div className="catalog-registry-main">
                    <span className="catalog-registry-name">{item.name}</span>
                    <span className="catalog-registry-desc">
                      {item.description || 'Sem descrição'}
                    </span>
                  </div>

                  <div className="catalog-registry-status">
                    <span className="catalog-pill is-muted">
                      {item.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <time className="catalog-registry-date" dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                  </time>

                  <CatalogRegistryIconActions
                    editLabel={`Editar grupo ${item.name}`}
                    deleteLabel={`Excluir grupo ${item.name}`}
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

      <ProductGroupFormModal
        isOpen={formModalOpen}
        editing={editingItem}
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
        title="Excluir grupo"
        subtitle="Esta ação não pode ser desfeita."
        message={
          confirmTarget
            ? `O grupo "${confirmTarget.name}" será removido permanentemente. Produtos vinculados podem impedir a exclusão.`
            : ''
        }
        confirmLabel="Excluir"
        isLoading={isDeleting}
        loadingLabel="Excluindo…"
        onClose={() => !isDeleting && setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </CatalogPageLayout>
  );
};

export default ProductGroupsPage;
