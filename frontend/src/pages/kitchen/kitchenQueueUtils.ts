import { KitchenQueueItem } from './kitchenTypes';

export type KitchenTableGroup = {
  key: string;
  tableNumber: number | null;
  tableLabel: string | null;
  zone: string | null;
  orderNumber: number;
  items: KitchenQueueItem[];
};

export function tableDisplayLabel(item: KitchenQueueItem): string {
  if (item.tableNumber != null) return `Mesa ${item.tableNumber}`;
  if (item.tableLabel) return item.tableLabel;
  return 'Pedido';
}

export function groupKitchenItemsByTable(items: KitchenQueueItem[]): KitchenTableGroup[] {
  const map = new Map<string, KitchenTableGroup>();

  for (const item of items) {
    const key =
      item.tableNumber != null
        ? `mesa-${item.tableNumber}`
        : item.tableLabel
          ? `label-${item.tableLabel}`
          : `order-${item.orderNumber}`;

    const existing = map.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      map.set(key, {
        key,
        tableNumber: item.tableNumber,
        tableLabel: item.tableLabel,
        zone: item.zone,
        orderNumber: item.orderNumber,
        items: [item],
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const na = a.tableNumber ?? 9999;
    const nb = b.tableNumber ?? 9999;
    if (na !== nb) return na - nb;
    return a.orderNumber - b.orderNumber;
  });
}
