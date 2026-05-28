import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import AlertModal from '../../components/AlertModal';
import ConfirmModal from '../../components/ConfirmModal';
import PremiumSelect from '../../components/PremiumSelect';
import { AlertState, Order, OrderType } from '../../types';
import { usePdvCatalog } from './usePdvCatalog';
import {
  formatItemQty,
  formatMoney,
  groupOrderItems,
  orderStatusLabel,
  pdvModulePath,
  pickOrderItemIdToRemove,
} from './pdvUtils';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import { FinanceFormActions } from '../finance/financeShared';
import PdvBillSplitModal from './PdvBillSplitModal';
import PdvCloseOrderModal from './PdvCloseOrderModal';
import PdvDeliveryAddressModal from './PdvDeliveryAddressModal';
import PdvEditOrderModal, { EditOrderPatch } from './PdvEditOrderModal';
import PdvNewOrderModal, { PdvNewOrderFormState } from './PdvNewOrderModal';
import { useMobileRealtime } from '../integration/useMobileRealtime';
import { WaiterNotification } from '../integration/waiterNotificationTypes';
import AddOrderItemModal from '../integration/AddOrderItemModal';
import { MobileMenuCategory, MobileMenuItem } from '../integration/smartPosTypes';
import '../finance/Finance.css';
import './Pdv.css';

const EMPTY_NEW_ORDER_FORM: PdvNewOrderFormState = {
  comandaId: '',
  customerId: '',
  tableLabel: '',
  tableId: '',
  notes: '',
  deliveryAddress: '',
  deliveryStreet: '',
  deliveryNumber: '',
  deliveryComplement: '',
  deliveryReference: '',
  deliveryFee: '',
  applyServiceFee: false,
};

type Props = {
  orderType: OrderType;
  title: string;
  description: string;
  showComanda?: boolean;
  showDelivery?: boolean;
  showTable?: boolean;
  embedded?: boolean;
  /** Abre formulário de novo pedido em modal. */
  newOrderInModal?: boolean;
  /** Abre divisão de conta em modal. */
  billSplitInModal?: boolean;
  /** Abre pagamento / fechar pedido em modal. */
  closeOrderInModal?: boolean;
  /** Breadcrumb do módulo (padrão: canal do PDV). */
  modulePath?: string;
  /** Usa fluxo de cozinha: substitui botões manuais de status por "Enviar para produção". */
  useKitchenFlow?: boolean;
  /** Exibe dropdown de mesas do restaurante (sincroniza com Painel Geral). */
  showTableSelect?: boolean;
};

const PdvWorkspace: React.FC<Props> = ({
  orderType,
  title,
  description,
  showComanda,
  showDelivery,
  showTable,
  embedded = false,
  newOrderInModal = false,
  billSplitInModal = false,
  closeOrderInModal = false,
  modulePath: modulePathProp,
  useKitchenFlow = false,
  showTableSelect = false,
}) => {
  const modulePath = modulePathProp ?? pdvModulePath(orderType);
  const { user } = useContext(AuthContext) || {};
  const { products, productOptions, customerOptions, comandaOptions, loading: catalogLoading } =
    usePdvCatalog();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<AlertState>({ isOpen: false, message: '', type: 'error' });
  const [newForm, setNewForm] = useState<PdvNewOrderFormState>(EMPTY_NEW_ORDER_FORM);
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);
  const [billSplitModalOpen, setBillSplitModalOpen] = useState(false);
  const [closeOrderModalOpen, setCloseOrderModalOpen] = useState(false);
  const [deliveryAddressModalOpen, setDeliveryAddressModalOpen] = useState(false);
  const [closeOrderModalKey, setCloseOrderModalKey] = useState(0);
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [confirmRemoveItemId, setConfirmRemoveItemId] = useState<string | null>(null);
  const [confirmCancelOrder, setConfirmCancelOrder] = useState(false);
  const [editOrderModalOpen, setEditOrderModalOpen] = useState(false);
  const orderStatusPanelRef = useRef<HTMLDivElement>(null);
  const [tableOptions, setTableOptions] = useState<{ value: string; label: string }[]>([]);
  const apiBase = process.env.REACT_APP_API_URL || 'https://food.aplopes.com/api';

  const canOperate = Boolean(user);

  const loadOrders = useCallback(async () => {
    const { data } = await api.get<Order[]>('/orders', {
      params: { type: orderType, openOnly: true, limit: 50 },
    });
    setOrders(data);
    setLoading(false);
  }, [orderType]);

  const loadOrder = useCallback(async (id: string) => {
    const { data } = await api.get<Order>(`/orders/${id}`);
    setActiveOrder(data);
  }, []);

  useEffect(() => {
    if (canOperate) loadOrders();
  }, [canOperate, loadOrders]);

  const loadTableOptions = useCallback(async () => {
    if (!showTableSelect) return;
    try {
      const { data } = await api.get<{ id: string; number: number; status: string }[]>('/mobile/tables');
      setTableOptions(
        data.map((t) => ({
          value: t.id,
          label: `Mesa ${t.number}${t.status !== 'free' ? ' (ocupada)' : ''}`,
        })),
      );
    } catch {
      setTableOptions([]);
    }
  }, [showTableSelect]);

  useEffect(() => {
    if (canOperate) void loadTableOptions();
  }, [canOperate, loadTableOptions]);

  const scrollToOrderActions = useCallback(() => {
    window.setTimeout(() => {
      orderStatusPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, []);

  useEffect(() => {
    if (!activeOrder) return;
    scrollToOrderActions();
  }, [activeOrder?.id, scrollToOrderActions]);

  const stats = useMemo(
    () => ({
      open: orders.length,
      activeTotal: activeOrder ? formatMoney(activeOrder.total) : '—',
      activeLabel: activeOrder ? `#${activeOrder.orderNumber}` : 'Nenhum selecionado',
    }),
    [orders.length, activeOrder],
  );

  const groupedActiveItems = useMemo(
    () => groupOrderItems(activeOrder?.items ?? []),
    [activeOrder?.items],
  );

  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsSaving(true);
    try {
      const selectedTableId = showTableSelect && newForm.tableId ? newForm.tableId : undefined;
      const selectedTableLabel = selectedTableId
        ? tableOptions.find((t) => t.value === selectedTableId)?.label
        : undefined;
      const { data } = await api.post<Order>('/orders', {
        type: orderType,
        comandaId: showComanda && newForm.comandaId ? newForm.comandaId : undefined,
        customerId: newForm.customerId || undefined,
        tableId: selectedTableId,
        tableLabel: selectedTableLabel ?? (showTable && !showTableSelect && newForm.tableLabel ? newForm.tableLabel : undefined),
        notes: newForm.notes.trim() || undefined,
        applyServiceFee: newForm.applyServiceFee,
      });
      setActiveOrder(data);
      await loadOrders();
      if (selectedTableId) await loadTableOptions();
      if (newOrderInModal) {
        setNewOrderModalOpen(false);
        setNewForm(EMPTY_NEW_ORDER_FORM);
      }
      setAlert({ isOpen: true, message: `Pedido #${data.orderNumber} aberto`, type: 'success' });
    } catch (err: any) {
      setAlert({ isOpen: true, message: err.response?.data?.message || 'Erro ao criar pedido', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const closeNewOrderModal = () => {
    if (isSaving) return;
    setNewOrderModalOpen(false);
    setNewForm(EMPTY_NEW_ORDER_FORM);
  };

  const handleEditOrderDetails = async (patch: EditOrderPatch) => {
    if (!activeOrder) return;
    setIsSaving(true);
    try {
      const { data } = await api.patch<Order>(`/orders/${activeOrder.id}/details`, patch);
      setActiveOrder(data);
      await loadOrders();
      if (patch.tableId !== undefined) await loadTableOptions();
      setEditOrderModalOpen(false);
      setAlert({ isOpen: true, message: 'Pedido atualizado', type: 'success' });
    } catch (err: any) {
      setAlert({ isOpen: true, message: err.response?.data?.message || 'Erro ao atualizar', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddItem = async (productId: string, quantity: number) => {
    if (!activeOrder || !productId) return;
    setAddingProductId(productId);
    setIsSaving(true);
    try {
      const { data } = await api.post<Order>(`/orders/${activeOrder.id}/items`, {
        productId,
        quantity: Number(quantity) > 0 ? Number(quantity) : 1,
      });
      setActiveOrder(data);
      await loadOrders();
      scrollToOrderActions();
    } catch (err: any) {
      setAlert({ isOpen: true, message: err.response?.data?.message || 'Erro', type: 'error' });
    } finally {
      setAddingProductId(null);
      setIsSaving(false);
    }
  };

  const handleSaveDeliveryAddress = async (patch: { deliveryAddress: string }) => {
    if (!activeOrder) return;
    setIsSaving(true);
    try {
      const { data } = await api.patch<Order>(`/orders/${activeOrder.id}/details`, patch);
      setActiveOrder(data);
      await loadOrders();
      setDeliveryAddressModalOpen(false);
      setAlert({ isOpen: true, message: 'Endereço de entrega atualizado', type: 'success' });
    } catch (err: any) {
      setAlert({
        isOpen: true,
        message: err.response?.data?.message || 'Erro ao atualizar endereço',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const menuCategories = useMemo<MobileMenuCategory[]>(() => {
    const map = new Map<string, MobileMenuCategory>();
    for (const p of products) {
      const group = p.group;
      if (!group?.id || !group.name || map.has(group.id)) continue;
      map.set(group.id, { id: group.id, name: group.name });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [products]);

  const menuItems = useMemo<MobileMenuItem[]>(
    () =>
      products.map((p) => ({
        id: p.id,
        name: p.name,
        price: Number(p.salePrice) || 0,
        categoryId: p.groupId ?? undefined,
        description: p.description ?? undefined,
        imageKey: p.photoKey ?? undefined,
        imageUpdatedAt: p.updatedAt ?? undefined,
      })),
    [products],
  );

  const handleStatus = async (status: string) => {
    if (!activeOrder) return;
    setIsSaving(true);
    try {
      const { data } = await api.patch<Order>(`/orders/${activeOrder.id}/status`, { status });
      setActiveOrder(data);
      await loadOrders();
    } catch (err: any) {
      setAlert({ isOpen: true, message: err.response?.data?.message || 'Erro', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleServiceFee = async () => {
    if (!activeOrder) return;
    setIsSaving(true);
    try {
      const { data } = await api.post<Order>(`/orders/${activeOrder.id}/service-fee`);
      setActiveOrder(data);
    } catch (err: any) {
      setAlert({ isOpen: true, message: err.response?.data?.message || 'Erro', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendToKitchen = async () => {
    if (!activeOrder) return;
    setIsSaving(true);
    try {
      const { data } = await api.post<Order>(`/orders/${activeOrder.id}/send-to-kitchen`);
      setActiveOrder(data);
      await loadOrders();
      setAlert({ isOpen: true, message: 'Itens enviados para produção', type: 'success' });
    } catch (err: any) {
      setAlert({ isOpen: true, message: err.response?.data?.message || 'Erro ao enviar para produção', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setConfirmRemoveItemId(itemId);
  };

  const executeRemoveItem = async () => {
    if (!activeOrder || !confirmRemoveItemId) return;
    const group = groupedActiveItems.find((g) => g.itemIds.includes(confirmRemoveItemId));
    setIsSaving(true);
    try {
      let data: Order;
      if (group && group.itemIds.length === 1 && group.quantity > 1) {
        const res = await api.patch<Order>(`/orders/${activeOrder.id}/items/${confirmRemoveItemId}`, {
          quantity: group.quantity - 1,
        });
        data = res.data;
      } else {
        const res = await api.delete<Order>(`/orders/${activeOrder.id}/items/${confirmRemoveItemId}`);
        data = res.data;
      }
      setConfirmRemoveItemId(null);
      setActiveOrder(data);
      await loadOrders();
    } catch (err: any) {
      setConfirmRemoveItemId(null);
      setAlert({ isOpen: true, message: err.response?.data?.message || 'Erro', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const executeCancelOrder = async () => {
    if (!activeOrder) return;
    setIsSaving(true);
    try {
      await api.post(`/orders/${activeOrder.id}/cancel`);
      setConfirmCancelOrder(false);
      setActiveOrder(null);
      await loadOrders();
      await loadTableOptions();
      setAlert({ isOpen: true, message: `Pedido #${activeOrder.orderNumber} cancelado`, type: 'success' });
    } catch (err: any) {
      setConfirmCancelOrder(false);
      setAlert({ isOpen: true, message: err.response?.data?.message || 'Erro ao cancelar', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const activeOrderRef = useRef(activeOrder);
  activeOrderRef.current = activeOrder;
  const loadOrderRef = useRef(loadOrder);
  loadOrderRef.current = loadOrder;
  const loadOrdersRef = useRef(loadOrders);
  loadOrdersRef.current = loadOrders;

  const handleWaiterNotification = useCallback(
    (payload: WaiterNotification | WaiterNotification[]) => {
      const notifications = Array.isArray(payload) ? payload : [payload];
      const orderIds = new Set<string>();
      for (const n of notifications) {
        if (n.status !== 'pending') continue;
        orderIds.add(n.orderId);
        setOrders((prev) =>
          prev.map((order) => (order.id === n.orderId ? { ...order, status: 'pronto' } : order)),
        );
        setActiveOrder((prev) =>
          prev && prev.id === n.orderId ? { ...prev, status: 'pronto' } : prev,
        );
      }
      if (orderIds.size === 0) return;
      void loadOrdersRef.current();
      const current = activeOrderRef.current;
      if (current && orderIds.has(current.id)) {
        void loadOrderRef.current(current.id);
      }
    },
    [],
  );

  useMobileRealtime({
    enabled: !!useKitchenFlow,
    onTablesUpdate: () => {},
    onWaiterNotification: handleWaiterNotification,
  });

  if (!canOperate) return <div className="container">Acesso negado</div>;

  const statsGrid = (
    <section className="catalog-stats-grid">
      <article className="catalog-stat-card">
        <span>Abertos</span>
        <strong>{stats.open}</strong>
        <p>Pedidos em andamento neste canal.</p>
      </article>
      <article className="catalog-stat-card">
        <span>Pedido ativo</span>
        <strong>{stats.activeTotal}</strong>
        <p>{stats.activeLabel}</p>
      </article>
    </section>
  );

  const isDeliveryFlow = orderType === 'delivery';
  const deliveryAddressFilled = Boolean(activeOrder?.deliveryAddress?.trim());
  const paidAmount = (activeOrder?.payments ?? []).reduce((sum, payment) => {
    const value = Number(payment.amount ?? 0);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
  const orderTotal = Number(activeOrder?.total ?? 0);
  const deliveryPaymentCompleted = paidAmount >= Math.max(orderTotal - 0.01, 0);
  const canSendToProductionInDelivery = !isDeliveryFlow || deliveryPaymentCompleted;
  const canOpenPaymentInDelivery = !isDeliveryFlow || deliveryAddressFilled;

  const workspaceBody = (
    <>
      {!newOrderInModal && (
        <section className="catalog-surface catalog-form-surface--premium">
          <div className="catalog-section-header">
            <div>
              <span className="catalog-section-kicker">PDV</span>
              <h2>Novo pedido</h2>
            </div>
          </div>
          {catalogLoading ? (
            <p>Carregando produtos e clientes…</p>
          ) : (
            <form className="catalog-form" onSubmit={handleCreate}>
              <div className="catalog-form-grid">
                {showComanda && (
                  <PremiumSelect
                    label="Comanda"
                    value={newForm.comandaId}
                    onChange={(v) => setNewForm((f) => ({ ...f, comandaId: v }))}
                    options={[{ value: '', label: 'Sem comanda' }, ...comandaOptions]}
                  />
                )}
                {showTableSelect && (
                  <PremiumSelect
                    label="Mesa"
                    value={newForm.tableId}
                    onChange={(v) => setNewForm((f) => ({ ...f, tableId: v }))}
                    options={[{ value: '', label: 'Sem mesa' }, ...tableOptions]}
                  />
                )}
                {showTable && !showTableSelect && (
                  <div className="form-group">
                    <label htmlFor="pdv-table">Mesa / identificação</label>
                    <input
                      id="pdv-table"
                      className="premium-text-input"
                      value={newForm.tableLabel}
                      onChange={(e) => setNewForm((f) => ({ ...f, tableLabel: e.target.value }))}
                      placeholder="Ex: Mesa 12"
                    />
                  </div>
                )}
                <PremiumSelect
                  label="Cliente (opcional)"
                  value={newForm.customerId}
                  onChange={(v) => setNewForm((f) => ({ ...f, customerId: v }))}
                  options={[{ value: '', label: '—' }, ...customerOptions]}
                />
              </div>
              <div className="form-group">
                <label htmlFor="pdv-notes">Observações</label>
                <input
                  id="pdv-notes"
                  className="premium-text-input"
                  value={newForm.notes}
                  onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <label className="form-group">
                <input
                  type="checkbox"
                  checked={newForm.applyServiceFee}
                  onChange={(e) => setNewForm((f) => ({ ...f, applyServiceFee: e.target.checked }))}
                />{' '}
                Aplicar taxa de serviço ao abrir
              </label>
              <div className="catalog-form-footer">
                <button
                  type="submit"
                  className="catalog-form-footer-btn catalog-form-footer-btn--primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Abrindo…' : 'Abrir pedido'}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      <section className="catalog-surface">
        <div className="catalog-section-header">
          <div>
            <span className="catalog-section-kicker">Listagem</span>
            <h2>Pedidos abertos</h2>
          </div>
          <p>{orders.length} pedido(s)</p>
        </div>
        {loading ? (
          <p>Carregando…</p>
        ) : orders.length === 0 ? (
          <div className="catalog-empty">Nenhum pedido aberto.</div>
        ) : (
          <div className="catalog-grid">
            {orders.map((o) => (
              <article
                key={o.id}
                className={`catalog-card catalog-card--selectable${activeOrder?.id === o.id ? ' is-selected' : ''}`}
                onClick={() => loadOrder(o.id)}
                onKeyDown={(e) => e.key === 'Enter' && loadOrder(o.id)}
                role="button"
                tabIndex={0}
              >
                <div className="catalog-card-headline">
                  <strong>Pedido #{o.orderNumber}</strong>
                  <span>{orderStatusLabel(o.status)}</span>
                </div>
                <div className="catalog-chip-row">
                  <span className="catalog-pill is-muted">{formatMoney(o.total)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {activeOrder && (
        <div className="pdv-edit-order">
          <section className="catalog-surface catalog-form-surface--premium finance-section pdv-edit-order__panel">
            <div className="catalog-section-header pdv-edit-order__block-header">
              <div>
                <span className="catalog-section-kicker">Cardápio</span>
                <h2>Adicionar itens</h2>
              </div>
            </div>
            <FinanceFormActions>
              <button
                type="button"
                className="catalog-form-footer-btn catalog-form-footer-btn--primary"
                onClick={() => setAddItemModalOpen(true)}
                disabled={isSaving || catalogLoading}
              >
                Adicionar item
              </button>
            </FinanceFormActions>
            <div className="pdv-edit-order__block pdv-edit-order__block--list">
              <h3 className="pdv-edit-order__list-title">Itens do pedido</h3>
              {groupedActiveItems.length === 0 ? (
                <p className="catalog-empty">Nenhum item no pedido.</p>
              ) : (
                <div className="finance-table-wrap pdv-edit-order__table-wrap">
                  <table className="finance-table">
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Qtd</th>
                        <th>Unitário</th>
                        <th>Total</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {groupedActiveItems.map((group) => (
                        <tr key={group.key}>
                          <td>{group.productName}</td>
                          <td>{formatItemQty(group.quantity)}</td>
                          <td>{formatMoney(group.unitPrice)}</td>
                          <td>{formatMoney(group.total)}</td>
                          <td className="finance-table-actions">
                            <button
                              type="button"
                              className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                              onClick={() => handleRemoveItem(pickOrderItemIdToRemove(group))}
                              disabled={isSaving}
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section className="catalog-surface catalog-form-surface--premium finance-section pdv-edit-order__panel">
            <div className="catalog-section-header">
              <div>
                <span className="catalog-section-kicker">Edição</span>
                <h2>Pedido #{activeOrder.orderNumber}</h2>
              </div>
              <span className="catalog-pill is-muted">{orderStatusLabel(activeOrder.status)}</span>
            </div>

            <section className="catalog-stats-grid pdv-edit-order__summary" aria-label="Totais do pedido">
              <article className="catalog-stat-card">
                <span>Subtotal</span>
                <strong>{formatMoney(activeOrder.subtotal)}</strong>
              </article>
              <article className="catalog-stat-card">
                <span>Desconto</span>
                <strong>{formatMoney(activeOrder.discount)}</strong>
              </article>
              <article className="catalog-stat-card">
                <span>Taxa de serviço</span>
                <strong>{formatMoney(activeOrder.serviceFee)}</strong>
              </article>
              {showDelivery ? (
                <article className="catalog-stat-card">
                  <span>Entrega</span>
                  <strong>{formatMoney(activeOrder.deliveryFee)}</strong>
                </article>
              ) : null}
              <article className="catalog-stat-card">
                <span>Total</span>
                <strong>{formatMoney(activeOrder.total)}</strong>
                <p>Valor atual do pedido.</p>
              </article>
            </section>

            <FinanceFormActions>
              <button
                type="button"
                className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                onClick={() => setEditOrderModalOpen(true)}
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                ✎ Editar info
              </button>
            </FinanceFormActions>
          </section>

          <section
            ref={orderStatusPanelRef}
            className="catalog-surface catalog-form-surface--premium finance-section pdv-edit-order__panel pdv-edit-order__block--status"
          >
            <div className="catalog-section-header pdv-edit-order__block-header">
                <div>
                  <span className="catalog-section-kicker">Status</span>
                  <h2>Ações do pedido</h2>
                </div>
              </div>
              <FinanceFormActions>
                {useKitchenFlow ? (
                  <>
                    <button
                      type="button"
                      className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                      onClick={handleSendToKitchen}
                      disabled={isSaving || !canSendToProductionInDelivery}
                    >
                      Enviar para produção
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                      onClick={() => handleStatus('confirmado')}
                      disabled={isSaving}
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                      onClick={() => handleStatus('preparando')}
                      disabled={isSaving}
                    >
                      Preparando
                    </button>
                    <button
                      type="button"
                      className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                      onClick={() => handleStatus('pronto')}
                      disabled={isSaving}
                    >
                      Pronto
                    </button>
                    {showDelivery && (
                      <button
                        type="button"
                        className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                        onClick={() => handleStatus('em_entrega')}
                        disabled={isSaving}
                      >
                        Em entrega
                      </button>
                    )}
                    <button
                      type="button"
                      className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                      onClick={handleServiceFee}
                      disabled={isSaving}
                    >
                      Taxa de serviço
                    </button>
                    {billSplitInModal ? (
                      <button
                        type="button"
                        className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                        onClick={() => setBillSplitModalOpen(true)}
                        disabled={isSaving}
                      >
                        Divisão de conta
                      </button>
                    ) : (
                      <Link
                        to={`/pdv/divisao-conta?orderId=${activeOrder.id}`}
                        className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                      >
                        Divisão de conta
                      </Link>
                    )}
                  </>
                )}
                {showDelivery && (
                  <button
                    type="button"
                    className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                    onClick={() => setDeliveryAddressModalOpen(true)}
                    disabled={isSaving}
                  >
                    Endereço de entrega
                  </button>
                )}
                <button
                  type="button"
                  className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                  style={{ color: 'var(--color-danger, #e53e3e)' }}
                  onClick={() => setConfirmCancelOrder(true)}
                  disabled={isSaving}
                >
                  Cancelar pedido
                </button>
                {closeOrderInModal ? (
                  <button
                    type="button"
                    className="catalog-form-footer-btn catalog-form-footer-btn--primary"
                    onClick={() => setCloseOrderModalOpen(true)}
                    disabled={isSaving || !canOpenPaymentInDelivery}
                  >
                    {isDeliveryFlow ? 'Pagar' : 'Fechar / pagar'}
                  </button>
                ) : (
                  <Link
                    to={`/pdv/fechar-pedido?orderId=${activeOrder.id}`}
                    className="catalog-form-footer-btn catalog-form-footer-btn--primary"
                  >
                    {isDeliveryFlow ? 'Pagar' : 'Fechar / pagar'}
                  </Link>
                )}
              </FinanceFormActions>
          </section>
        </div>
      )}

      {billSplitInModal && (
        <PdvBillSplitModal
          isOpen={billSplitModalOpen}
          initialOrderId={activeOrder?.id}
          orderType={orderType}
          onClose={() => setBillSplitModalOpen(false)}
          onOrderUpdated={(order) => {
            if (order && activeOrder?.id === order.id) {
              setActiveOrder(order);
              void loadOrders();
            }
          }}
          onProceedToPayment={
            closeOrderInModal
              ? (order) => {
                  setBillSplitModalOpen(false);
                  setActiveOrder(order);
                  void loadOrders();
                  setCloseOrderModalKey((k) => k + 1);
                  setCloseOrderModalOpen(true);
                }
              : undefined
          }
        />
      )}

      {closeOrderInModal && (
        <PdvCloseOrderModal
          key={closeOrderModalKey}
          isOpen={closeOrderModalOpen}
          initialOrderId={activeOrder?.id}
          orderType={orderType}
          onClose={() => setCloseOrderModalOpen(false)}
          onOrderUpdated={(order) => {
            setActiveOrder(order);
            void loadOrders();
          }}
          onOrderClosed={() => {
            setActiveOrder(null);
            setCloseOrderModalOpen(false);
            void loadOrders();
            void loadTableOptions();
          }}
        />
      )}

      {newOrderInModal && (
        <PdvNewOrderModal
          isOpen={newOrderModalOpen}
          saving={isSaving}
          catalogLoading={catalogLoading}
          form={newForm}
          customerOptions={customerOptions}
          comandaOptions={comandaOptions}
          showComanda={showComanda}
          showTable={showTable}
          showTableSelect={showTableSelect}
          tableOptions={tableOptions}
          onClose={closeNewOrderModal}
          onChange={(patch) => setNewForm((f) => ({ ...f, ...patch }))}
          onSubmit={() => handleCreate()}
        />
      )}

      <ConfirmModal
        isOpen={Boolean(confirmRemoveItemId)}
        title="Remover item"
        message="Deseja remover este item do pedido?"
        confirmLabel="Remover"
        variant="danger"
        isLoading={isSaving}
        onConfirm={executeRemoveItem}
        onClose={() => setConfirmRemoveItemId(null)}
      />

      <ConfirmModal
        isOpen={confirmCancelOrder}
        title="Cancelar pedido"
        message={`Deseja cancelar o pedido #${activeOrder?.orderNumber}? Esta ação não pode ser desfeita.`}
        confirmLabel="Cancelar pedido"
        variant="danger"
        isLoading={isSaving}
        onConfirm={executeCancelOrder}
        onClose={() => setConfirmCancelOrder(false)}
      />

      <PdvEditOrderModal
        isOpen={editOrderModalOpen}
        saving={isSaving}
        order={activeOrder}
        customerOptions={customerOptions}
        showDelivery={showDelivery}
        showTableSelect={showTableSelect}
        tableOptions={tableOptions}
        onClose={() => setEditOrderModalOpen(false)}
        onSubmit={handleEditOrderDetails}
      />

      <AddOrderItemModal
        key={addItemModalOpen ? `pdv-add-${activeOrder?.id ?? 'none'}` : 'pdv-add-closed'}
        isOpen={addItemModalOpen}
        apiBase={apiBase}
        categories={menuCategories}
        items={menuItems}
        addingProductId={addingProductId}
        closeButtonLabel="Concluir"
        onAddItem={(productId, quantity) => void handleAddItem(productId, quantity)}
        onClose={() => {
          if (!addingProductId) setAddItemModalOpen(false);
        }}
      />

      <PdvDeliveryAddressModal
        isOpen={deliveryAddressModalOpen}
        saving={isSaving}
        order={activeOrder}
        onClose={() => setDeliveryAddressModalOpen(false)}
        onSubmit={handleSaveDeliveryAddress}
      />

      <AlertModal
        isOpen={alert.isOpen}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert((a) => ({ ...a, isOpen: false }))}
      />
    </>
  );

  if (embedded) return workspaceBody;

  return (
    <CatalogPageLayout
      className="pdv-page finance-page"
      moduleLabel="PDV"
      modulePath={modulePath}
      title={title}
      description={description}
      loading={loading}
      loadingDescription="Carregando pedidos do PDV."
      actions={
        <>
          {newOrderInModal && (
            <button
              type="button"
              className="catalog-action-button"
              onClick={() => setNewOrderModalOpen(true)}
            >
              Novo pedido
            </button>
          )}
        </>
      }
      stats={!loading ? statsGrid : undefined}
    >
      {workspaceBody}
    </CatalogPageLayout>
  );
};

export default PdvWorkspace;
