import { MobileTable } from './smartPosTypes';
import { SmartPosReceiptData } from './smartPosReceiptTypes';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  credit: 'Cartão crédito',
  cartao_credito: 'Cartão crédito',
  debit: 'Cartão débito',
  cartao_debito: 'Cartão débito',
  vale: 'Vale',
};

export function formatReceiptDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function paymentMethodLabel(method: string): string {
  const key = method.toLowerCase().replace(/\s/g, '_');
  return PAYMENT_LABELS[key] ?? method;
}

/** Monta cupom a partir da sessão da mesa (reimpressão após encerrar conta). */
export function buildReceiptFromTable(table: MobileTable): SmartPosReceiptData | null {
  const session = table.session;
  if (!session?.orderLines.length) return null;

  const remaining = session.remaining;
  const receiptKind =
    table.status === 'closed' ? 'payment_final' : 'account_preview';

  return {
    id: session.orderId,
    tableNumber: table.number,
    orderNumber: session.orderNumber,
    waiterName: session.waiterName,
    issuedAt: new Date().toISOString(),
    receiptKind,
    paidAmount: session.paidAmount,
    remaining,
    items: session.orderLines.map((line) => ({
      id: line.id,
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: line.quantity > 0 ? line.total / line.quantity : line.total,
      total: line.total,
    })),
    subtotal: session.subtotal,
    serviceFee: session.serviceFee,
    total: session.total,
    payments:
      session.payments?.map((p) => ({
        method: p.method,
        amount: p.amount,
      })) ?? [],
  };
}
