import type { AppUserRole } from './userRole';

export interface User {
  id: string;
  email: string;
  name: string;
  role: AppUserRole;
  level?: 'junior' | 'pleno' | 'senior';
  photoKey?: string | null;
  photoMimeType?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  tenant?: { id: string; name: string; slug: string; unitLabel?: string | null };
  manager?: User | null;
  teamMembers?: User[];
}

export interface AlertState {
  isOpen: boolean;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface ProductGroup {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProductUnit = 'un' | 'kg' | 'l' | 'porcao';

export interface Product {
  id: string;
  tenantId: string;
  groupId?: string | null;
  group?: ProductGroup | null;
  name: string;
  description?: string | null;
  sku?: string | null;
  costPrice: string | number;
  salePrice: string | number;
  unit: ProductUnit;
  sortOrder?: number;
  active: boolean;
  photoKey?: string | null;
  photoMimeType?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  birthDate?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  allergyNotes?: string | null;
  notes?: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockLocation {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  sortOrder?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType =
  | 'entrada'
  | 'saida'
  | 'acerto'
  | 'producao_entrada'
  | 'producao_saida';

export interface StockBalance {
  id: string;
  tenantId: string;
  productId: string;
  locationId: string;
  quantity: string | number;
  product?: Product;
  location?: StockLocation;
  belowMinimum?: boolean;
  minimumQuantity?: number | null;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  tenantId: string;
  productId: string;
  locationId: string;
  type: StockMovementType;
  quantity: string | number;
  balanceBefore: string | number;
  balanceAfter: string | number;
  reason?: string | null;
  notes?: string | null;
  product?: Product;
  location?: StockLocation;
  createdByUser?: { id: string; name: string } | null;
  createdAt: string;
}

export interface StockMinimum {
  id: string;
  tenantId: string;
  productId: string;
  locationId?: string | null;
  minimumQuantity: string | number;
  active: boolean;
  product?: Product;
  location?: StockLocation | null;
  currentQuantity?: number;
  belowMinimum?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TechnicalSheetItem {
  id?: string;
  sheetId?: string;
  ingredientProductId: string;
  quantity: string | number;
  unit: ProductUnit;
  sortOrder: number;
  ingredientProduct?: Product;
}

export interface TechnicalSheet {
  id: string;
  tenantId: string;
  productId: string;
  name: string;
  yieldQuantity: string | number;
  notes?: string | null;
  sortOrder?: number;
  active: boolean;
  product?: Product;
  items: TechnicalSheetItem[];
  createdAt: string;
  updatedAt: string;
}

export interface RecipeProduction {
  id: string;
  tenantId: string;
  sheetId: string;
  locationId: string;
  quantityProduced: string | number;
  notes?: string | null;
  sheet?: TechnicalSheet;
  location?: StockLocation;
  createdByUser?: { id: string; name: string } | null;
  createdAt: string;
}

export type CrmSegment = 'novo' | 'regular' | 'vip' | 'inativo';
export type CrmInteractionType =
  | 'ligacao'
  | 'visita'
  | 'pedido'
  | 'campanha'
  | 'observacao'
  | 'fidelidade';
export type CrmCampaignStatus = 'rascunho' | 'ativa' | 'pausada' | 'encerrada';
export type CrmCampaignType = 'promocao' | 'desconto' | 'combo' | 'comunicado';
export type CrmCampaignChannel = 'whatsapp' | 'email' | 'pdv' | 'geral';
export type CrmDiscountType = 'percentual' | 'valor_fixo' | 'nenhum';
export type CrmLoyaltyTier = 'bronze' | 'prata' | 'ouro';
export type CrmLoyaltyTxType = 'ganho' | 'resgate' | 'ajuste';

export interface CrmCustomerProfile {
  id: string;
  tenantId: string;
  customerId: string;
  segment: CrmSegment;
  tags?: string | null;
  preferredChannel?: string | null;
  marketingOptIn: boolean;
  lastContactAt?: string | null;
  crmNotes?: string | null;
}

export interface CrmInteraction {
  id: string;
  customerId: string;
  type: CrmInteractionType;
  subject: string;
  notes?: string | null;
  createdByUser?: { id: string; name: string } | null;
  createdAt: string;
}

export interface CrmCustomerListItem extends Customer {
  profile: CrmCustomerProfile | null;
  loyaltyAccount: CrmLoyaltyAccount | null;
  interactionsCount: number;
}

export interface CrmCampaignProductRef {
  id: string;
  name: string;
  salePrice: string | number;
  groupName: string | null;
}

export interface CrmCampaign {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  type: CrmCampaignType;
  status: CrmCampaignStatus;
  channel: CrmCampaignChannel;
  discountType: CrmDiscountType;
  discountValue: string | number;
  audienceSegment?: CrmSegment | null;
  startsAt?: string | null;
  endsAt?: string | null;
  productIds?: string[];
  products?: CrmCampaignProductRef[];
  createdAt: string;
  updatedAt: string;
}

export interface CrmLoyaltyProgram {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  pointsPerReal: string | number;
  redeemRate: string | number;
  minRedeemPoints: number;
  tierSilverMin: number;
  tierGoldMin: number;
  active: boolean;
  isDefault: boolean;
}

export interface CrmLoyaltyAccount {
  id: string;
  tenantId: string;
  customerId: string;
  programId: string;
  pointsBalance: number;
  lifetimePoints: number;
  tier: CrmLoyaltyTier;
  customer?: Customer;
  program?: CrmLoyaltyProgram;
}

export interface CrmLoyaltyTransaction {
  id: string;
  accountId: string;
  type: CrmLoyaltyTxType;
  points: number;
  balanceAfter: number;
  notes?: string | null;
  createdAt: string;
  account?: CrmLoyaltyAccount;
  createdByUser?: { id: string; name: string } | null;
}

export type OrderType = 'balcao' | 'comanda' | 'delivery' | 'tablet' | 'online';
export type OrderStatus =
  | 'aberto'
  | 'confirmado'
  | 'preparando'
  | 'pronto'
  | 'em_entrega'
  | 'fechado'
  | 'cancelado';
export type PaymentMethod =
  | 'dinheiro'
  | 'pix'
  | 'cartao_debito'
  | 'cartao_credito'
  | 'vale';
export type ComandaStatus = 'livre' | 'ocupada' | 'reservada';
export type MenuChannel = 'mesa' | 'delivery';

export interface PdvSettings {
  id: string;
  tenantId: string;
  defaultServiceFeePercent: string | number;
  allowSplitBill: boolean;
  mapsEnabled: boolean;
  mapsEmbedUrl?: string | null;
}

export interface Comanda {
  id: string;
  tenantId: string;
  number: number;
  label?: string | null;
  status: ComandaStatus;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: string | number;
  unitPrice: string | number;
  total: string | number;
  notes?: string | null;
  product?: Product;
}

export interface OrderPayment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  amount: string | number;
  paidAt: string;
}

export interface BillSplit {
  id: string;
  orderId: string;
  label: string;
  amount: string | number;
}

export interface Order {
  id: string;
  tenantId: string;
  orderNumber: number;
  type: OrderType;
  status: OrderStatus;
  comandaId?: string | null;
  comanda?: Comanda | null;
  customerId?: string | null;
  customer?: Customer | null;
  tableLabel?: string | null;
  tableId?: string | null;
  subtotal: string | number;
  discount: string | number;
  serviceFee: string | number;
  deliveryFee: string | number;
  total: string | number;
  notes?: string | null;
  deliveryAddress?: string | null;
  deliveryLat?: string | number | null;
  deliveryLng?: string | number | null;
  items?: OrderItem[];
  payments?: OrderPayment[];
  billSplits?: BillSplit[];
  openedAt: string;
  closedAt?: string | null;
}

export interface OrderLog {
  id: string;
  tenantId: string;
  orderId: string;
  action: string;
  message: string;
  createdAt: string;
  createdByUser?: { id: string; name: string } | null;
  order?: { id: string; orderNumber: number } | null;
}

export interface MenuSettings {
  id: string;
  tenantId: string;
  channel: MenuChannel;
  title: string;
  welcomeMessage?: string | null;
  active: boolean;
  serviceFeeEnabled: boolean;
  serviceFeePercent: string | number;
  minOrderAmount: string | number;
  estimatedMinutes: number;
}

export interface MenuCatalogItem {
  product: Product;
  entry: {
    id: string;
    visible: boolean;
    featured: boolean;
    sortOrder: number;
    promoLabel?: string | null;
  } | null;
  visible: boolean;
  featured: boolean;
  sortOrder: number;
  promoLabel: string | null;
}

export interface AuthContextType {
  user: User | null;
  login: (
    email: string,
    password: string,
    tenantSlug: string,
  ) => Promise<{ access_token: string; user: User }>;
  logout: () => void;
  loading: boolean;
  refreshUser: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
}
