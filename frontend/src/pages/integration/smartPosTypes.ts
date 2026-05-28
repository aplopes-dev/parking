export type MobileTableStatus = 'free' | 'open' | 'payment_pending' | 'closed';

export type MobileOrderLine = {
  id: string;
  productId?: string;
  productName: string;
  quantity: number;
  total: number;
  status: string;
};

export type MobileSessionPayment = {
  id: string;
  method: string;
  amount: number;
};

export type MobileTableSession = {
  orderId: string;
  orderNumber: number;
  guestCount?: number | null;
  waiterName?: string | null;
  subtotal: number;
  serviceFee: number;
  total: number;
  paidAmount: number;
  remaining: number;
  isFullyPaid: boolean;
  orderLines: MobileOrderLine[];
  payments?: MobileSessionPayment[];
};

export type MobileTable = {
  id: string;
  number: number;
  capacity: number;
  zone: string;
  status: MobileTableStatus;
  session?: MobileTableSession | null;
};

export type MobileMenuCategory = {
  id: string;
  name: string;
  icon?: string;
};

export type MobileMenuItem = {
  id: string;
  name: string;
  price: number;
  /** Preço de tabela antes da campanha ativa. */
  originalPrice?: number;
  /** Ex.: "-10%" ou "Promo R$ 5,00" */
  promoLabel?: string;
  categoryId?: string;
  description?: string;
  imageUrl?: string | null;
  imageKey?: string | null;
  /** ISO — invalida cache do navegador quando a foto do produto muda. */
  imageUpdatedAt?: string | null;
  featured?: boolean;
  available?: boolean;
};

export type MobileBootstrap = {
  settings: { defaultServiceFeePercent: number; allowSplitBill?: boolean };
  menu: {
    categories: MobileMenuCategory[];
    items: MobileMenuItem[];
  };
  tables: MobileTable[];
};

export type WsConnectionState = 'connecting' | 'live' | 'offline';
