export type PagbankFlowCategory =
  | 'orders'
  | 'split'
  | 'connect'
  | 'checkout'
  | 'recurring'
  | 'transfer'
  | 'registration'
  | 'security'
  | 'complementary';

export type PagbankFlowCatalogItem = {
  id: string;
  category: PagbankFlowCategory;
  label: string;
  description: string;
  docUrl: string;
  implemented: boolean;
  optionFields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'url' | 'number' | 'boolean';
    placeholder?: string;
  }>;
  config: { enabled: boolean; options?: Record<string, string | number | boolean> };
};

export type ReceiverForm = {
  id?: string;
  label: string;
  pagbankAccountId: string;
  connectAccountId?: string | null;
  role: 'master' | 'secondary';
  amountValue: string;
  isLiable: boolean;
  active: boolean;
  sortOrder: number;
};

export type PaymentSettingsResponse = {
  catalog: PagbankFlowCatalogItem[];
  categoryLabels: Record<PagbankFlowCategory, string>;
  summary: { enabledFlows: number; totalFlows: number; implementedFlows: number };
  general: {
    pagbankEnvironment: 'sandbox' | 'production';
    pagbankTokenSet: boolean;
    pagbankTokenPreview: string | null;
    pagbankPublicKey: string | null;
    pagbankConnectClientId: string | null;
    pagbankConnectClientSecretSet: boolean;
    pagbankConnectClientSecretPreview: string | null;
    pagbankConnectRedirectUri: string | null;
    pagbankNotificationUrl: string | null;
    pagbankOrderSoftDescriptor: string | null;
    pagbankOrderMcc: string | null;
    notes: string | null;
  };
  flows: Record<string, { enabled: boolean; options?: Record<string, string | number | boolean> }>;
  pagbankSplit: {
    pagbankSplitEnabled: boolean;
    pagbankSplitMethod: 'FIXED' | 'PERCENTAGE';
    pagbankMasterAccountId: string | null;
    pagbankTransferInterest: boolean;
    pagbankTransferShipping: boolean;
    pagbankCustodyEnabled: boolean;
    pagbankCustodyScheduledDefault: string | null;
    pagbankConnectAutoSyncSplit: boolean;
    pagbankConnectSplitPercentEach: number | null;
    pagbankCheckoutReturnUrl: string | null;
    pagbankCheckoutSuccessUrl: string | null;
    receivers: ReceiverForm[];
    percentageTotal: number;
    splitsPreview: unknown;
  };
};
