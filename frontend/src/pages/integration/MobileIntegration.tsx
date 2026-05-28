import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import SmartPosReceipt from './components/SmartPosReceipt';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import AddOrderItemModal from './AddOrderItemModal';
import RemoveOrderLineModal from './RemoveOrderLineModal';
import RegisterPaymentModal from './RegisterPaymentModal';
import PagbankPixPaymentModal from './PagbankPixPaymentModal';
import {
  fetchPagbankCapabilities,
  PagbankCapabilities,
} from '../../services/pagbankApi';
import SmartPosFloor from './components/SmartPosFloor';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import SmartPosLoading from './components/SmartPosLoading';
import SmartPosPanel from './components/SmartPosPanel';
import SmartPosStats from './components/SmartPosStats';
import WaiterNotificationPanel from './components/WaiterNotificationPanel';
import { useSmartPosActions } from './useSmartPosActions';
import { useSmartPosBootstrap } from './useSmartPosBootstrap';
import { useWaiterNotifications } from './useWaiterNotifications';
import { useSmartPosCheckout } from './useSmartPosCheckout';
import { useSmartPosSelection } from './useSmartPosSelection';
import { usePermissions } from '../../hooks/usePermissions';
import { getApiErrorMessage } from '../../utils/apiError';
import { SMARTPOS_STACK_BREAKPOINT_PX } from './smartPosConstants';
import type { MobileBootstrap, MobileMenuItem, MobileTable } from './smartPosTypes';
import {
  applyPromoPricesToMenuItems,
  MenuPromoPriceDto,
} from './menuPromoUtils';
import './MobileIntegration.css';

const MobileIntegration: React.FC = () => {
  const { pathname } = useLocation();
  const isDashboard = pathname === '/';
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const { smartPos, hasRole } = usePermissions();
  const viewAllSalonKitchenNotifications = true;
  const showKitchenDotOnTables = true;
  const showWaiterDeliveryPanel = true;
  const toast = useToast();
  const apiBase = process.env.REACT_APP_API_URL || 'https://estacionamento.aplopes.com/api';

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pagbankPixModalOpen, setPagbankPixModalOpen] = useState(false);
  const [pagbankCaps, setPagbankCaps] = useState<PagbankCapabilities | null>(null);
  const [menuItemsForModal, setMenuItemsForModal] = useState<MobileMenuItem[]>([]);

  const kitchenNotificationScope = useMemo(
    () => ({
      viewAllSalon: viewAllSalonKitchenNotifications,
      currentUserId: user?.id,
    }),
    [viewAllSalonKitchenNotifications, user?.id],
  );

  const {
    items: waiterNotifications,
    updatingId: waiterNotifUpdatingId,
    pushFromWs: pushWaiterNotification,
    reload: reloadWaiterNotifications,
    resolve: resolveWaiterNotification,
  } = useWaiterNotifications({
    enabled: Boolean(user) && showKitchenDotOnTables,
    viewAllSalon: viewAllSalonKitchenNotifications,
    currentUserId: user?.id,
  });

  const panelWaiterNotifications = useMemo(() => {
    if (viewAllSalonKitchenNotifications) return [];
    return waiterNotifications.filter((n) => n.targetUserId === user?.id);
  }, [viewAllSalonKitchenNotifications, waiterNotifications, user?.id]);

  const handleWaiterNotification = useCallback(
    (payload: Parameters<typeof pushWaiterNotification>[0]) => {
      const isNew = !Array.isArray(payload);
      pushWaiterNotification(payload);
      if (isNew && showWaiterDeliveryPanel) {
        toast.success('Item pronto na cozinha');
      }
    },
    [pushWaiterNotification, showWaiterDeliveryPanel, toast],
  );

  const handleWaiterRead = useCallback(
    async (id: string) => {
      try {
        await resolveWaiterNotification(id, 'read');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao marcar como lida');
      }
    },
    [resolveWaiterNotification, toast],
  );

  const handleWaiterDelivered = useCallback(
    async (id: string) => {
      try {
        await resolveWaiterNotification(id, 'delivered');
        toast.success('Entrega registrada');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao registrar entrega');
      }
    },
    [resolveWaiterNotification, toast],
  );

  const handleTablesFromRealtime = useCallback(
    (_tables: MobileTable[], _source?: string) => {
      if (viewAllSalonKitchenNotifications) {
        void reloadWaiterNotifications();
      }
    },
    [viewAllSalonKitchenNotifications, reloadWaiterNotifications],
  );

  const {
    bootstrap,
    tables,
    setTables,
    zones,
    stats,
    loading,
    loadBootstrap,
    wsState,
    lastEvent,
    reconnect,
  } = useSmartPosBootstrap({
    enabled: Boolean(user),
    authoritativeTablesRealtime: viewAllSalonKitchenNotifications,
    pollTablesIntervalMs: viewAllSalonKitchenNotifications ? 8000 : 0,
    onTablesUpdate: handleTablesFromRealtime,
    onWaiterNotification: showKitchenDotOnTables ? handleWaiterNotification : undefined,
  });

  const {
    selectedZone,
    setSelectedZone,
    selectedTableId,
    setSelectedTableId: setSelectedTableIdBase,
    selectedTable,
    tableIsFree,
    tableIsClosed,
    tableAwaitingPayment,
    tableHasOpenSession,
    tableHasActiveSession,
    groupedOrderLines,
    canSendToProduction,
    filteredTables,
    isZonePending,
    isTablesStale,
    syncSelectedTableId,
  } = useSmartPosSelection({ tables });

  const actionsBlockRef = useRef<HTMLDivElement>(null);

  const scrollToActionsIfStacked = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia(`(max-width: ${SMARTPOS_STACK_BREAKPOINT_PX}px)`).matches) {
      return;
    }
    const el = actionsBlockRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const topInset = 88;
    const alreadyVisible =
      rect.top >= topInset && rect.bottom <= window.innerHeight - 16;
    if (alreadyVisible) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.requestAnimationFrame(() => {
      el.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  }, []);

  const handleSelectTable = useCallback(
    (tableId: string) => {
      setSelectedTableIdBase(tableId);
      scrollToActionsIfStacked();
    },
    [setSelectedTableIdBase, scrollToActionsIfStacked],
  );

  useEffect(() => {
    syncSelectedTableId(tables);
  }, [tables, syncSelectedTableId]);

  useEffect(() => {
    if (!user) return;
    fetchPagbankCapabilities()
      .then(setPagbankCaps)
      .catch(() => setPagbankCaps(null));
  }, [user]);

  const {
    actionLoading,
    setActionLoading,
    addingProductId,
    addItem,
    registerPayment,
    sendToProduction,
    freeTable,
    removeOneFromGroup,
  } = useSmartPosActions({
    selectedTableId,
    selectedTable,
    tables,
    groupedOrderLines,
    setTables,
  });

  const {
    printReceipt,
    handleCloseAccount,
    handlePrintReceipt,
    clearPrintReceipt,
    clearReceiptForTable,
  } = useSmartPosCheckout({
      selectedTableId,
      selectedTable,
      setTables,
      setActionLoading,
    });

  useEffect(() => {
    const onAfterPrint = () => clearPrintReceipt();
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, [clearPrintReceipt]);

  useEffect(() => {
    if (removeModalOpen && groupedOrderLines.length === 0) {
      setRemoveModalOpen(false);
    }
  }, [removeModalOpen, groupedOrderLines.length]);

  useEffect(() => {
    if (paymentModalOpen && !tableAwaitingPayment) {
      setPaymentModalOpen(false);
    }
  }, [paymentModalOpen, tableAwaitingPayment]);

  const menuCategories = bootstrap?.menu.categories ?? [];
  const menuItems = bootstrap?.menu.items ?? [];
  const showFinancialStats = viewAllSalonKitchenNotifications;

  const openAddItemModal = useCallback(async () => {
    try {
      const [bootRes, promoRes] = await Promise.all([
        api.get<MobileBootstrap>('/mobile/bootstrap'),
        api.get<Record<string, MenuPromoPriceDto>>('/mobile/menu-promo-prices'),
      ]);
      await loadBootstrap({ silent: true });
      setMenuItemsForModal(
        applyPromoPricesToMenuItems(bootRes.data.menu.items, promoRes.data),
      );
      setAddModalOpen(true);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Erro ao carregar cardápio'));
    }
  }, [loadBootstrap, toast]);

  if (loading && !bootstrap) {
    return <SmartPosLoading isDashboard={isDashboard} />;
  }

  const salonStats = (
    <SmartPosStats
      loading={loading}
      open={stats.open}
      free={stats.free}
      revenue={showFinancialStats ? stats.revenue : undefined}
      menuItemCount={bootstrap?.menu.items.length ?? 0}
      compact={false}
    />
  );

  const wsActions = (
    <>
      <div
        className={`smartpos-live smartpos-live--light${wsState === 'live' ? ' is-live' : ''}${wsState === 'connecting' ? ' is-connecting' : ''}`}
        aria-live="polite"
      >
        <span className="smartpos-live-dot" aria-hidden />
        {wsState === 'live' ? 'Ao vivo' : wsState === 'connecting' ? 'Conectando…' : 'Offline'}
      </div>
      <button type="button" className="catalog-action-button is-secondary" onClick={reconnect}>
        Reconectar WS
      </button>
    </>
  );

  return (
    <>
    <CatalogPageLayout
      className="smartpos-page"
      moduleLabel="Início"
      title="Salão em tempo real"
      description="Mesas, comandas e cardápio sincronizados com o terminal e o app via WebSocket."
      actions={wsActions}
      stats={salonStats}
    >
      {showWaiterDeliveryPanel && panelWaiterNotifications.length > 0 ? (
        <WaiterNotificationPanel
          items={panelWaiterNotifications}
          updatingId={waiterNotifUpdatingId}
          onRead={(id) => void handleWaiterRead(id)}
          onDelivered={(id) => void handleWaiterDelivered(id)}
        />
      ) : null}

      {!showWaiterDeliveryPanel && lastEvent ? (
        <p className="smartpos-page-header__meta smartpos-api-meta">
          API: {apiBase} · último evento: {lastEvent}
        </p>
      ) : null}

      <div className="smartpos-layout">
        <SmartPosFloor
          zones={zones}
          selectedZone={selectedZone}
          onSelectZone={setSelectedZone}
          tables={filteredTables}
          selectedTableId={selectedTableId}
          onSelectTable={handleSelectTable}
          isZonePending={isZonePending}
          isTablesStale={isTablesStale}
          waiterNotifications={waiterNotifications}
          tieKitchenDotToNotifications={showKitchenDotOnTables}
          kitchenNotificationScope={kitchenNotificationScope}
        />

        <SmartPosPanel
          actionsBlockRef={actionsBlockRef}
          selectedTable={selectedTable}
          groupedOrderLines={groupedOrderLines}
          bootstrap={bootstrap}
          userName={user?.name}
          actionLoading={actionLoading}
          tableIsFree={tableIsFree}
          tableIsClosed={tableIsClosed}
          tableAwaitingPayment={tableAwaitingPayment}
          tableHasOpenSession={tableHasOpenSession}
          hasMenuItems={menuItems.length > 0}
          canSendToProduction={canSendToProduction}
          permissions={smartPos}
          onOpenTable={async () => {
            if (!selectedTableId || actionLoading) return;
            setActionLoading(true);
            try {
              const { data } = await api.post<MobileTable>(
                `/mobile/tables/${selectedTableId}/open`,
                {
                  guestCount: 2,
                  waiterName: user?.name || 'Garçom',
                },
              );
              setTables((prev) => prev.map((t) => (t.id === data.id ? data : t)));
              toast.success('Abrir mesa realizado');
            } catch (err: unknown) {
              toast.error(getApiErrorMessage(err, 'Abrir mesa falhou'));
            } finally {
              setActionLoading(false);
            }
          }}
          onAddItem={() => {
            void openAddItemModal();
          }}
          onRemoveItem={() => setRemoveModalOpen(true)}
          onSendToProduction={() => {
            void sendToProduction();
          }}
          onPayment={() => setPaymentModalOpen(true)}
          onCloseAccount={() => void handleCloseAccount()}
          onPrintReceipt={() => handlePrintReceipt()}
          onFreeTable={() => {
            void freeTable().then(() => clearReceiptForTable(selectedTableId));
          }}
        />
      </div>

      <AddOrderItemModal
        key={addModalOpen ? `add-${selectedTableId}` : 'add-closed'}
        isOpen={addModalOpen}
        apiBase={apiBase}
        tableNumber={selectedTable?.number}
        categories={menuCategories}
        items={menuItemsForModal.length > 0 ? menuItemsForModal : menuItems}
        addingProductId={addingProductId}
        onAddItem={(productId, quantity) => void addItem(productId, quantity)}
        onClose={() => {
          if (!addingProductId) setAddModalOpen(false);
        }}
      />

      <RemoveOrderLineModal
        isOpen={removeModalOpen}
        tableNumber={selectedTable?.number}
        orderNumber={selectedTable?.session?.orderNumber}
        lines={groupedOrderLines}
        isLoading={actionLoading}
        onRemoveOne={(key) => void removeOneFromGroup(key)}
        onClose={() => {
          if (!actionLoading) setRemoveModalOpen(false);
        }}
      />

      {smartPos.canRegisterPayment ? (
      <RegisterPaymentModal
        isOpen={paymentModalOpen}
        tableNumber={selectedTable?.number}
        orderNumber={selectedTable?.session?.orderNumber}
        remaining={selectedTable?.session?.remaining ?? 0}
        total={selectedTable?.session?.total ?? 0}
        isLoading={actionLoading}
        pagbankPixAvailable={Boolean(pagbankCaps?.pixApi)}
        onPagbankPix={() => {
          setPaymentModalOpen(false);
          setPagbankPixModalOpen(true);
        }}
        onConfirm={(method) => {
          void registerPayment(method).then((ok) => {
            if (ok) setPaymentModalOpen(false);
          });
        }}
        onClose={() => {
          if (!actionLoading) setPaymentModalOpen(false);
        }}
      />
      ) : null}

      {smartPos.canRegisterPayment && selectedTable?.session?.orderId ? (
        <PagbankPixPaymentModal
          isOpen={pagbankPixModalOpen}
          tableNumber={selectedTable?.number}
          orderNumber={selectedTable?.session?.orderNumber}
          orderId={selectedTable.session.orderId}
          remaining={selectedTable.session.remaining}
          onClose={() => setPagbankPixModalOpen(false)}
          onPaid={(tx) => {
            setPagbankPixModalOpen(false);
            void loadBootstrap();
            if (tx.pdvPaymentRegistered) {
              toast.success('PIX confirmado e registrado na conta da mesa');
            } else {
              toast.success('PIX confirmado no PagBank');
            }
          }}
        />
      ) : null}

    </CatalogPageLayout>

    {printReceipt ? <SmartPosReceipt receipt={printReceipt} /> : null}
    </>
  );
};

export default MobileIntegration;
