import { useCallback, useRef, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { hasPendingKitchenItems, pickLineIdToRemove } from './orderLineUtils';
import { DisplayOrderLine } from './orderLineUtils';
import { mergeTableIntoList } from './smartPosTableMerge';
import { MobileTable } from './smartPosTypes';
import { MobilePaymentMethod } from './smartPosPaymentTypes';

type UseSmartPosActionsOptions = {
  selectedTableId: string;
  selectedTable: MobileTable | undefined;
  tables: MobileTable[];
  groupedOrderLines: DisplayOrderLine[];
  setTables: React.Dispatch<React.SetStateAction<MobileTable[]>>;
};

export function useSmartPosActions({
  selectedTableId,
  selectedTable,
  tables,
  groupedOrderLines,
  setTables,
}: UseSmartPosActionsOptions) {
  const toast = useToast();
  const [actionLoading, setActionLoading] = useState(false);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const sendToProductionInFlight = useRef(false);

  const resolveSelectedTable = useCallback((): MobileTable | undefined => {
    if (!selectedTableId) return undefined;
    return tables.find((t) => t.id === selectedTableId) ?? selectedTable;
  }, [selectedTable, selectedTableId, tables]);

  const runAction = useCallback(
    async (label: string, fn: () => Promise<unknown>) => {
      setActionLoading(true);
      try {
        await fn();
        toast.success(`${label} realizado`);
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, `${label} falhou`));
      } finally {
        setActionLoading(false);
      }
    },
    [toast],
  );

  const addItem = useCallback(
    async (productId: string, quantity = 1) => {
      if (!selectedTableId) return;
      setAddingProductId(productId);
      try {
        const { data } = await api.post<MobileTable>(`/mobile/tables/${selectedTableId}/items`, {
          productId,
          quantity: Number(quantity) > 0 ? Number(quantity) : 1,
        });
        setTables((prev) => mergeTableIntoList(prev, data));
        toast.success('Item adicionado');
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Falha ao lançar item'));
      } finally {
        setAddingProductId(null);
      }
    },
    [selectedTableId, setTables, toast],
  );

  const registerPayment = useCallback(
    async (method: MobilePaymentMethod): Promise<boolean> => {
      const table = resolveSelectedTable();
      const session = table?.session;
      const remaining = session?.remaining ?? 0;
      if (!selectedTableId || !session) {
        toast.error('Selecione uma mesa com conta');
        return false;
      }
      if (table?.status !== 'payment_pending') {
        toast.error('Encerre a conta antes de registrar o pagamento');
        return false;
      }
      if (remaining <= 0.01) {
        toast.error('Não há valor pendente para pagar');
        return false;
      }

      setActionLoading(true);
      try {
        const { data } = await api.post<MobileTable>(
          `/mobile/tables/${selectedTableId}/payments`,
          { method, amount: remaining },
        );
        setTables((prev) => mergeTableIntoList(prev, data));
        toast.success('Pagamento registrado');
        return true;
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Falha ao registrar pagamento'));
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [resolveSelectedTable, selectedTableId, setTables, toast],
  );

  const sendToProduction = useCallback(async () => {
    if (!selectedTableId) {
      toast.error('Selecione uma mesa');
      return;
    }
    if (sendToProductionInFlight.current || actionLoading) return;

    const table = resolveSelectedTable();
    if (!table?.session) {
      toast.error('Abra a mesa e adicione itens à comanda');
      return;
    }
    if (table.status !== 'open') {
      toast.error('Só é possível enviar itens com a mesa em atendimento');
      return;
    }
    if (!hasPendingKitchenItems(table.session.orderLines)) {
      toast.error('Não há itens novos para enviar à cozinha');
      return;
    }

    sendToProductionInFlight.current = true;
    setActionLoading(true);
    try {
      const { data } = await api.post<MobileTable>(
        `/mobile/tables/${selectedTableId}/send-to-kitchen`,
      );
      setTables((prev) => mergeTableIntoList(prev, data));

      const stillPending = hasPendingKitchenItems(data.session?.orderLines ?? []);
      if (stillPending) {
        toast.success('Itens enviados — ainda há lançamentos pendentes na comanda');
      } else {
        toast.success('Pedido enviado para produção');
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Falha ao enviar para produção'));
    } finally {
      sendToProductionInFlight.current = false;
      setActionLoading(false);
    }
  }, [actionLoading, resolveSelectedTable, selectedTableId, setTables, toast]);

  const freeTable = useCallback(async () => {
    if (!selectedTableId) {
      toast.error('Selecione uma mesa');
      return;
    }

    setActionLoading(true);
    try {
      const { data } = await api.post<MobileTable>(`/mobile/tables/${selectedTableId}/free`);
      setTables((prev) => mergeTableIntoList(prev, data));
      toast.success('Mesa liberada');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Falha ao liberar mesa'));
    } finally {
      setActionLoading(false);
    }
  }, [selectedTableId, setTables, toast]);

  const removeOneFromGroup = useCallback(
    async (groupKey: string) => {
      const group = groupedOrderLines.find((g) => g.key === groupKey);
      const itemId = group ? pickLineIdToRemove(group) : '';
      if (!selectedTableId || !itemId) return;
      setActionLoading(true);
      try {
        const { data } = await api.delete<MobileTable>(
          `/mobile/tables/${selectedTableId}/items/${itemId}`,
        );
        setTables((prev) => mergeTableIntoList(prev, data));
        toast.success('Item retirado');
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Falha ao retirar item'));
      } finally {
        setActionLoading(false);
      }
    },
    [groupedOrderLines, selectedTableId, setTables, toast],
  );

  return {
    actionLoading,
    setActionLoading,
    addingProductId,
    runAction,
    addItem,
    registerPayment,
    sendToProduction,
    freeTable,
    removeOneFromGroup,
  };
}
