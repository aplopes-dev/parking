export type FiscalEnvironment = 'homologation' | 'production';
export type FiscalOrderType = 'sale' | 'purchase';
export type FiscalOrderStatus = 'draft' | 'confirmed' | 'cancelled';
export type FiscalReturnType = 'sale_return' | 'purchase_return';
export type FiscalInvoiceType = 'nfe' | 'nfce';
export type FiscalInvoiceDirection = 'emitted' | 'received';
export type FiscalInvoiceStatus =
  | 'draft'
  | 'processing'
  | 'authorized'
  | 'rejected'
  | 'cancelled'
  | 'voided';

export type FiscalSettings = {
  id: string;
  legalName: string;
  tradeName?: string | null;
  cnpj?: string | null;
  stateRegistration?: string | null;
  municipalRegistration?: string | null;
  taxRegime: string;
  environment: FiscalEnvironment;
  nfeSeries: number;
  nfceSeries: number;
  lastNfeNumber: number;
  lastNfceNumber: number;
  certificateHint?: string | null;
  sefazNotes?: string | null;
};

export type FiscalOrderItem = {
  id?: string;
  productName: string;
  ncm?: string | null;
  cfop?: string | null;
  unit: string;
  quantity: number | string;
  unitPrice: number | string;
  totalPrice: number | string;
};

export type FiscalOrder = {
  id: string;
  orderType: FiscalOrderType;
  status: FiscalOrderStatus;
  referenceCode?: string | null;
  pdvOrderId?: string | null;
  counterpartyName: string;
  counterpartyDocument?: string | null;
  issueDate: string;
  totalAmount: number | string;
  notes?: string | null;
  items?: FiscalOrderItem[];
  pdvOrder?: { orderNumber: number } | null;
};

export type FiscalInvoice = {
  id: string;
  invoiceType: FiscalInvoiceType;
  direction: FiscalInvoiceDirection;
  status: FiscalInvoiceStatus;
  number?: number | null;
  series: number;
  accessKey?: string | null;
  issueDate?: string | null;
  counterpartyName?: string | null;
  counterpartyDocument?: string | null;
  totalAmount: number | string;
  cancellationReason?: string | null;
};

export type FiscalOverview = {
  settings: FiscalSettings;
  ordersCount: number;
  emittedCount: number;
  receivedCount: number;
  authorizedCount: number;
};
