import { MobileTable } from './smartPosTypes';

export type SmartPosReceiptItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type SmartPosReceiptPayment = {
  method: string;
  amount: number;
};

/** preview = conferência após encerrar conta; final = após pagamento e fechamento do pedido. */
export type SmartPosReceiptKind = 'account_preview' | 'payment_final';

export type SmartPosReceiptData = {
  id: string;
  tableNumber: number;
  orderNumber?: number;
  waiterName?: string | null;
  issuedAt: string;
  items: SmartPosReceiptItem[];
  subtotal: number;
  serviceFee: number;
  total: number;
  paidAmount?: number;
  remaining?: number;
  payments: SmartPosReceiptPayment[];
  receiptKind?: SmartPosReceiptKind;
};

export type CloseAccountResponse = {
  table: MobileTable;
  receipt: SmartPosReceiptData;
};
