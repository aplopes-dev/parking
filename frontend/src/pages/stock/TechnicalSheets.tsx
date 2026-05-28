import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import AlertModal from '../../components/AlertModal';
import ConfirmModal from '../../components/ConfirmModal';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import CatalogRegistryDragHandle from '../../components/catalog/CatalogRegistryDragHandle';
import CatalogRegistryIconActions from '../../components/catalog/CatalogRegistryIconActions';
import { persistSortOrder, reorderById, sortBySortOrder } from '../../utils/catalogRegistry';
import { AlertState, TechnicalSheet } from '../../types';
import { useStockCatalog } from './useStockCatalog';
import { formatQty } from './stockUtils';
import TechnicalSheetFormModal, { TechnicalSheetFormValues } from './TechnicalSheetFormModal';

const TechnicalSheetsPage: React.FC = () => {
  const { user } = useContext(AuthContext) || {};
  const { productOptions, loading: catalogLoading } = useStockCatalog();
  const [items, setItems] = useState<TechnicalSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TechnicalSheet | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertState>({ isOpen: false, message: '', type: 'error' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<TechnicalSheet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManage = Boolean(user);

  const loadItems = useCallback(async () => {
    try {
      const { data } = await api.get<TechnicalSheet[]>('/technical-sheets');
      setItems(sortBySortOrder(data));
    } catch (error) {
      console.error(error);
      setAlert({ isOpen: true, message: 'Erro ao carregar fichas técnicas.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) loadItems();
  }, [canManage, loadItems]);

  const stats = useMemo(() => {
    const active = items.filter((i) => i.active).length;
    return { total: items.length, active, inactive: items.length - active };
  }, [items]);

  const nextSortOrder = useMemo(() => {
    if (items.length === 0) return 0;
    return Math.max(...items.map((i) => i.sortOrder ?? 0)) + 1;
  }, [items]);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormModalOpen(true);
  };

  const openEditModal = (item: TechnicalSheet) => {
    setEditingItem(item);
    setFormModalOpen(true);
  };

  const closeFormModal = () => {
    if (isSaving) return;
    setFormModalOpen(false);
    setEditingItem(null);
  };

  const handleFormSubmit = async (values: TechnicalSheetFormValues) => {
    const payloadItems = values.items
      .filter((i) => i.ingredientProductId)
      .map((i, idx) => ({
        ingredientProductId: i.ingredientProductId,
        quantity: parseFloat(i.quantity),
        unit: i.unit,
        sortOrder: idx,
      }));
    if (!payloadItems.length) {
      setAlert({ isOpen: true, message: 'Adicione ao menos um insumo.', type: 'warning' });
      return;
    }

    const payload = {
      productId: values.productId,
      name: values.name.trim(),
      yieldQuantity: parseFloat(values.yieldQuantity),
      notes: values.notes.trim() || undefined,
      active: values.active,
      items: payloadItems,
    };

    setIsSaving(true);
    try {
      if (editingItem) {
        await api.patch(`/technical-sheets/${editingItem.id}`, payload);
      } else {
        await api.post('/technical-sheets', { ...payload, sortOrder: nextSortOrder });
      }
      setFormModalOpen(false);
      setEditingItem(null);
      await loadItems();
      setAlert({
        isOpen: true,
        message: editingItem ? 'Ficha atualizada com sucesso!' : 'Ficha criada com sucesso!',
        type: 'success',
      });
    } catch (err: any) {
      setAlert({
        isOpen: true,
        message: err.response?.data?.message || 'Erro ao salvar ficha técnica.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const persistOrder = async (ordered: TechnicalSheet[]) => {
    const previous = items;
    setItems(ordered);
    setIsReordering(true);
    try {
      await persistSortOrder('/technical-sheets', ordered);
    } catch (err: any) {
      setItems(previous);
      setAlert({
        isOpen: true,
        message: err.response?.data?.message || 'Erro ao atualizar a ordem das fichas.',
        type: 'error',
      });
      await loadItems();
    } finally {
      setIsReordering(false);
    }
  };

  const handleDragStart = (id: string) => {
    if (isReordering) return;
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === id) return;
    setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
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
      await api.delete(`/technical-sheets/${confirmTarget.id}`);
      await loadItems();
      setAlert({ isOpen: true, message: 'Ficha excluída com sucesso!', type: 'success' });
      setConfirmOpen(false);
      setConfirmTarget(null);
    } catch (err: any) {
      setAlert({
        isOpen: true,
        message: err.response?.data?.message || 'Erro ao excluir ficha.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!canManage) return <div className="container">Acesso negado</div>;

  const pageLoading = loading || catalogLoading;

  const statsGrid = (
    <section className="catalog-stats-grid" aria-label="Resumo das fichas">
      <article className="catalog-stat-card">
        <span>Total</span>
        <strong>{stats.total}</strong>
        <p>Fichas cadastradas.</p>
      </article>
      <article className="catalog-stat-card">
        <span>Ativas</span>
        <strong>{stats.active}</strong>
        <p>Em uso na produção.</p>
      </article>
      <article className="catalog-stat-card">
        <span>Inativas</span>
        <strong>{stats.inactive}</strong>
        <p>Fora da operação.</p>
      </article>
    </section>
  );

  const insumoSummary = (sheet: TechnicalSheet): string => {
    const count = sheet.items?.length ?? 0;
    return `${count} insumo(s) · rend. ${formatQty(sheet.yieldQuantity)}`;
  };

  return (
    <CatalogPageLayout
      className="catalog-page--ifood catalog-registry-page"
      moduleLabel="Estoque"
      modulePath="/estoque/ficha-tecnica"
      title="Ficha técnica"
      description="Cadastre insumos e rendimento para produção de receitas e controle de custo."
      loading={pageLoading}
      loadingDescription="Carregando fichas técnicas."
      actions={
        <button type="button" onClick={openCreateModal} className="catalog-action-button">
          Nova ficha
        </button>
      }
      stats={!pageLoading ? statsGrid : undefined}
    >
      <section className="catalog-registry-panel" aria-labelledby="technical-sheets-panel-title">
        <header className="catalog-registry-panel__header">
          <div>
            <h2 id="technical-sheets-panel-title">Fichas cadastradas</h2>
            <p className="catalog-registry-panel__meta">
              {items.length} ficha(s)
              {items.length > 1 ? ' · Arraste para alterar a ordem na listagem' : ''}
            </p>
          </div>
        </header>

        {items.length === 0 ? (
          <div className="catalog-empty">
            Nenhuma ficha cadastrada. Clique em &quot;Nova ficha&quot; para começar.
          </div>
        ) : (
          <div className="catalog-registry-table">
            <div className="catalog-registry-table__head" aria-hidden>
              <span />
              <span>Ficha</span>
              <span>Detalhes</span>
              <span>Status</span>
              <span>Criado em</span>
              <span>Ações</span>
            </div>
            <ul className="catalog-registry-list" aria-label="Lista de fichas técnicas">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={`catalog-registry-row${draggedId === item.id ? ' is-dragging' : ''}${
                    dragOverId === item.id ? ' is-drag-over' : ''
                  }${isReordering ? ' is-reordering' : ''}`}
                  onDragOver={(e) => handleDragOver(e, item.id)}
                  onDrop={(e) => handleDrop(e, item.id)}
                  onDragEnd={handleDragEnd}
                >
                  <CatalogRegistryDragHandle
                    label={`Reordenar ficha ${item.name}`}
                    draggable
                    disabled={isReordering}
                    onDragStart={() => handleDragStart(item.id)}
                  />

                  <div className="catalog-registry-main">
                    <span className="catalog-registry-name">{item.name}</span>
                    <span className="catalog-registry-desc">
                      {item.product?.name || 'Produto'}
                    </span>
                  </div>

                  <span className="catalog-registry-contact">{insumoSummary(item)}</span>

                  <div className="catalog-registry-status">
                    <span className="catalog-pill is-muted">
                      {item.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>

                  <time className="catalog-registry-date" dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                  </time>

                  <CatalogRegistryIconActions
                    editLabel={`Editar ficha ${item.name}`}
                    deleteLabel={`Excluir ficha ${item.name}`}
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
      </section>

      <TechnicalSheetFormModal
        isOpen={formModalOpen}
        editing={editingItem}
        productOptions={productOptions}
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
        title="Excluir ficha"
        subtitle="Esta ação não pode ser desfeita."
        message={
          confirmTarget
            ? `A ficha "${confirmTarget.name}" será removida permanentemente.`
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

export default TechnicalSheetsPage;
