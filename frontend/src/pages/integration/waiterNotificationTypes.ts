export type WaiterNotification = {
  id: string;
  targetUserId: string;
  orderId: string;
  orderItemId: string;
  orderNumber: number;
  tableNumber: number | null;
  tableLabel: string | null;
  zone: string | null;
  productName: string;
  quantity: number;
  status: 'pending' | 'read' | 'delivered';
  createdAt: string;
};
