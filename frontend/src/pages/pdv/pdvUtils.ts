import { OrderItem, OrderStatus, OrderType, PaymentMethod, ComandaStatus } from '../../types';

export type GroupedOrderItem = {
  key: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  itemIds: string[];
};

/** Agrupa itens repetidos do mesmo produto para exibição no PDV. */
export function groupOrderItems(items: OrderItem[]): GroupedOrderItem[] {
  const map = new Map<string, GroupedOrderItem>();
  for (const item of items) {
    const key = item.productId;
    const qty = Number(item.quantity) || 0;
    const lineTotal = Number(item.total) || 0;
    const unit = Number(item.unitPrice) || 0;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += qty;
      existing.total += lineTotal;
      existing.itemIds.push(item.id);
    } else {
      map.set(key, {
        key,
        productId: item.productId,
        productName: item.productName,
        quantity: qty,
        unitPrice: unit,
        total: lineTotal,
        itemIds: [item.id],
      });
    }
  }
  return Array.from(map.values());
}

/** ID da linha a remover ao tirar uma unidade (LIFO). */
export function pickOrderItemIdToRemove(group: GroupedOrderItem): string {
  return group.itemIds[group.itemIds.length - 1];
}

export function formatMoney(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatItemQty(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '0';
}

export function pdvModulePath(type: OrderType): string {
  const paths: Record<OrderType, string> = {
    online: '/pdv/online',
    tablet: '/pdv/tablet',
    balcao: '/pdv/balcao',
    comanda: '/pdv/comanda',
    delivery: '/pdv/delivery',
  };
  return paths[type];
}

export function orderTypeLabel(type: OrderType): string {
  const map: Record<OrderType, string> = {
    online: 'PDV online',
    balcao: 'Balcão',
    comanda: 'Comanda',
    delivery: 'Delivery',
    tablet: 'Tablet',
  };
  return map[type] ?? type;
}

export function orderStatusLabel(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    aberto: 'Aberto',
    confirmado: 'Confirmado',
    preparando: 'Preparando',
    pronto: 'Pronto',
    em_entrega: 'Em entrega',
    fechado: 'Fechado',
    cancelado: 'Cancelado',
  };
  return map[status] ?? status;
}

export function paymentMethodLabel(method: PaymentMethod): string {
  const map: Record<PaymentMethod, string> = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    cartao_debito: 'Débito',
    cartao_credito: 'Crédito',
    vale: 'Vale',
  };
  return map[method] ?? method;
}

export function comandaStatusLabel(status: ComandaStatus): string {
  const map: Record<ComandaStatus, string> = {
    livre: 'Livre',
    ocupada: 'Ocupada',
    reservada: 'Reservada',
  };
  return map[status] ?? status;
}

export const OPEN_STATUSES: OrderStatus[] = [
  'aberto',
  'confirmado',
  'preparando',
  'pronto',
  'em_entrega',
];
