import {
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
  useTransition,
} from 'react';
import { groupOrderLines, hasPendingKitchenItems } from './orderLineUtils';
import { MobileTable } from './smartPosTypes';

const DEFER_TABLES_THRESHOLD = 30;

type UseSmartPosSelectionOptions = {
  tables: MobileTable[];
  initialTableId?: string;
};

export function useSmartPosSelection({ tables, initialTableId = '' }: UseSmartPosSelectionOptions) {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState(initialTableId);
  const [isZonePending, startZoneTransition] = useTransition();

  const filteredTables = useMemo(() => {
    if (!selectedZone) return tables;
    return tables.filter((t) => t.zone === selectedZone);
  }, [tables, selectedZone]);

  const shouldDefer = tables.length > DEFER_TABLES_THRESHOLD;
  const deferredFilteredTables = useDeferredValue(filteredTables);
  const displayTables = filteredTables;
  const isTablesStale = shouldDefer && deferredFilteredTables !== filteredTables;

  const setSelectedZoneWithTransition = useCallback((zone: string | null) => {
    startZoneTransition(() => setSelectedZone(zone));
  }, []);

  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const tableIsFree = selectedTable?.status === 'free';
  const tableIsClosed = selectedTable?.status === 'closed';
  const tableAwaitingPayment = selectedTable?.status === 'payment_pending';
  const tableHasOpenSession = selectedTable?.status === 'open';
  const tableHasActiveSession =
    tableHasOpenSession || tableAwaitingPayment || tableIsClosed;

  const orderLines = selectedTable?.session?.orderLines ?? [];
  const groupedOrderLines = useMemo(() => groupOrderLines(orderLines), [orderLines]);
  const canSendToProduction = useMemo(
    () => tableHasOpenSession && orderLines.length > 0 && hasPendingKitchenItems(orderLines),
    [orderLines, tableHasOpenSession],
  );

  const syncSelectedTableId = useCallback(
    (nextTables: MobileTable[]) => {
      setSelectedTableId((prev) => {
        if (prev && nextTables.some((t) => t.id === prev)) return prev;
        return nextTables[0]?.id ?? '';
      });
    },
    [],
  );

  return {
    selectedZone,
    setSelectedZone: setSelectedZoneWithTransition,
    selectedTableId,
    setSelectedTableId,
    selectedTable,
    tableIsFree,
    tableIsClosed,
    tableAwaitingPayment,
    tableHasOpenSession,
    tableHasActiveSession,
    groupedOrderLines,
    canSendToProduction,
    orderLines,
    filteredTables: displayTables,
    isZonePending,
    isTablesStale,
    syncSelectedTableId,
  };
}
