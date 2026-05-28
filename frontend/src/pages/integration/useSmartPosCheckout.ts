import { useCallback, useRef, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { MobileTable } from './smartPosTypes';
import {
  CloseAccountResponse,
  SmartPosReceiptData,
} from './smartPosReceiptTypes';
import { buildReceiptFromTable } from './smartPosReceiptUtils';

type UseSmartPosCheckoutOptions = {
  selectedTableId: string;
  selectedTable: MobileTable | undefined;
  setTables: React.Dispatch<React.SetStateAction<MobileTable[]>>;
  setActionLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

const PRINT_DELAY_MS = 200;

export function useSmartPosCheckout({
  selectedTableId,
  selectedTable,
  setTables,
  setActionLoading,
}: UseSmartPosCheckoutOptions) {
  const toast = useToast();
  const [printReceipt, setPrintReceipt] = useState<SmartPosReceiptData | null>(null);
  const receiptByTableId = useRef<Record<string, SmartPosReceiptData>>({});

  const triggerPrint = useCallback((receipt: SmartPosReceiptData) => {
    setPrintReceipt(receipt);
    window.setTimeout(() => {
      window.print();
    }, PRINT_DELAY_MS);
  }, []);

  const cacheReceipt = useCallback((tableId: string, receipt: SmartPosReceiptData) => {
    receiptByTableId.current[tableId] = receipt;
  }, []);

  const getReceiptForTable = useCallback(
    (table: MobileTable): SmartPosReceiptData | null => {
      const cached = receiptByTableId.current[table.id];
      if (cached) return cached;
      return buildReceiptFromTable(table);
    },
    [],
  );

  const clearReceiptForTable = useCallback((tableId: string) => {
    delete receiptByTableId.current[tableId];
    setPrintReceipt(null);
  }, []);

  const handleCloseAccount = useCallback(async () => {
    if (!selectedTableId || !selectedTable) {
      toast.error('Selecione uma mesa');
      return;
    }
    if (selectedTable.status === 'closed') {
      return;
    }
    if (selectedTable.status === 'free') {
      toast.error('Abra a mesa antes de encerrar a conta');
      return;
    }

    const session = selectedTable.session;
    if (!session?.orderLines.length) {
      toast.error('Adicione itens antes de encerrar a conta');
      return;
    }

    setActionLoading(true);
    try {
      const { data } = await api.post<CloseAccountResponse>(
        `/mobile/tables/${selectedTableId}/close-account`,
      );

      const receipt: SmartPosReceiptData = {
        ...data.receipt,
        orderNumber:
          data.receipt.orderNumber ?? session.orderNumber,
        waiterName: data.receipt.waiterName ?? session.waiterName,
        receiptKind: 'account_preview',
        paidAmount: data.receipt.paidAmount ?? data.table.session?.paidAmount ?? 0,
        remaining:
          data.receipt.remaining ??
          data.table.session?.remaining ??
          data.receipt.total,
      };

      cacheReceipt(selectedTableId, receipt);
      setTables((prev) =>
        prev.map((t) => (t.id === data.table.id ? data.table : t)),
      );

      toast.success('Conta encerrada — imprima a conferência ou registre o pagamento');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Falha ao encerrar conta'));
    } finally {
      setActionLoading(false);
    }
  }, [
    cacheReceipt,
    selectedTable,
    selectedTableId,
    setActionLoading,
    setTables,
    toast,
  ]);

  const handlePrintReceipt = useCallback(() => {
    if (!selectedTable) {
      toast.error('Selecione uma mesa');
      return;
    }
    if (
      selectedTable.status !== 'payment_pending' &&
      selectedTable.status !== 'closed'
    ) {
      toast.error('Encerre a conta antes de imprimir');
      return;
    }

    const session = selectedTable.session;
    if (!session) {
      toast.error('Não há cupom disponível para impressão');
      return;
    }

    const isFinal = selectedTable.status === 'closed';
    const base = buildReceiptFromTable(selectedTable) ?? getReceiptForTable(selectedTable);
    if (!base) {
      toast.error('Não há cupom disponível para impressão');
      return;
    }

    const receipt: SmartPosReceiptData = {
      ...base,
      paidAmount: session.paidAmount,
      remaining: session.remaining,
      receiptKind: isFinal ? 'payment_final' : 'account_preview',
      payments: isFinal ? base.payments : [],
    };

    triggerPrint(receipt);
  }, [getReceiptForTable, selectedTable, toast, triggerPrint]);

  const clearPrintReceipt = useCallback(() => {
    setPrintReceipt(null);
  }, []);

  return {
    printReceipt,
    handleCloseAccount,
    handlePrintReceipt,
    clearPrintReceipt,
    clearReceiptForTable,
  };
}
