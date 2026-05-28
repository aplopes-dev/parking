export type KitchenQueueItem = {
  id: string;
  orderId: string;
  orderNumber: number;
  tableNumber: number | null;
  tableLabel: string | null;
  zone: string | null;
  productName: string;
  quantity: number;
  notes: string | null;
  sentAt: string;
};
