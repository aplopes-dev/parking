import api from './api';

export type PagbankTransactionStatus =
  | 'created'
  | 'waiting_payment'
  | 'paid'
  | 'declined'
  | 'canceled'
  | 'error';

export type PagbankCheckoutData = {
  chargeId?: string;
  status?: string;
  paymentMethodType?: string;
  pixQrCode?: unknown;
  pixCopyPaste?: string;
  boleto?: unknown;
  links?: Array<{ rel: string; href: string }>;
  orderQrCodes?: unknown;
  deeplink?: string;
  payUrl?: string;
  hosted?: boolean;
};

export type PagbankTransaction = {
  id: string;
  orderId: string | null;
  flowId: string;
  pagbankOrderId: string | null;
  pagbankCheckoutId?: string | null;
  pagbankSplitId?: string | null;
  status: PagbankTransactionStatus;
  amountCents: number;
  checkoutData: PagbankCheckoutData | null;
  errorMessage: string | null;
  pdvPaymentRegistered?: boolean;
  pdvSettlementReason?: string | null;
  createdAt?: string;
};

export type PagbankCapabilities = {
  tokenConfigured: boolean;
  environment: string;
  publicKey: string | null;
  enabledFlows: string[];
  pixApi: boolean;
  pagbankWalletQr: boolean;
  cardVault: boolean;
  threeDs: boolean;
  splitReleaseCustody?: boolean;
  connectAuthorization?: boolean;
  hostedCheckout?: boolean;
  recurringPlans?: boolean;
  recurringSubscriptions?: boolean;
  transferBalance?: boolean;
  accountRegister?: boolean;
};

export type PagbankRecurringPlanLocal = {
  id: string;
  pagbankPlanId: string;
  name: string;
  amountCents: number;
  status: string | null;
  referenceId?: string | null;
};

export type PagbankSubscriptionLocal = {
  id: string;
  pagbankSubscriptionId: string;
  pagbankPlanId: string | null;
  referenceId: string | null;
  customerEmail: string | null;
  status: string | null;
  amountCents: number;
};

export type PagbankTransferLocal = {
  id: string;
  pagbankTransferId: string | null;
  amountCents: number;
  status: string | null;
  instrumentType: string;
};

export type PagbankRegisteredAccountLocal = {
  id: string;
  pagbankAccountId: string | null;
  accountType: string;
  email: string;
  status: string | null;
};

export type PagbankConnectAccount = {
  id: string;
  label: string | null;
  pagbankAccountId: string | null;
  authMethod: string;
  bankBranch: string | null;
  accountNumber: string | null;
  scopes: string | null;
  tokenExpiresAt: string | null;
  createdAt: string;
};

export async function fetchPagbankCapabilities(): Promise<PagbankCapabilities> {
  const { data } = await api.get<PagbankCapabilities>('/payments/pagbank/capabilities');
  return data;
}

export async function listPagbankTransactions(orderId?: string): Promise<PagbankTransaction[]> {
  const { data } = await api.get<PagbankTransaction[]>('/payments/pagbank/transactions', {
    params: orderId ? { orderId } : undefined,
  });
  return data;
}

export async function pagbankHostedCheckout(params: {
  orderId: string;
  customerName?: string;
  customerEmail?: string;
  returnUrl?: string;
  redirectUrl?: string;
}): Promise<PagbankTransaction> {
  const { data } = await api.post<PagbankTransaction>('/payments/pagbank/checkout/hosted', {
    orderId: params.orderId,
    customer: params.customerName
      ? { name: params.customerName, email: params.customerEmail }
      : undefined,
    returnUrl: params.returnUrl,
    redirectUrl: params.redirectUrl,
  });
  return data;
}

export async function syncConnectSplitReceivers(): Promise<{
  created: number;
  updated: number;
  skipped?: boolean;
}> {
  const { data } = await api.post('/payments/pagbank/connect/accounts/sync-split-receivers');
  return data;
}

export async function pagbankCheckoutPix(params: {
  orderId: string;
  customerName?: string;
  customerEmail?: string;
  amountCents?: number;
}): Promise<PagbankTransaction> {
  const { data } = await api.post<PagbankTransaction>('/payments/pagbank/checkout', {
    flowId: 'orders_pix',
    orderId: params.orderId,
    amountCents: params.amountCents,
    customer: params.customerName
      ? {
          name: params.customerName,
          email: params.customerEmail,
        }
      : undefined,
  });
  return data;
}

export async function refreshPagbankTransaction(id: string): Promise<PagbankTransaction> {
  const { data } = await api.post<PagbankTransaction>(
    `/payments/pagbank/transactions/${id}/refresh`,
  );
  return data;
}

export async function releasePagbankCustody(
  transactionId: string,
  receiverAccountIds?: string[],
): Promise<{ ok: boolean; pagbankSplitId: string }> {
  const { data } = await api.post<{ ok: boolean; pagbankSplitId: string }>(
    `/payments/pagbank/transactions/${transactionId}/split/release-custody`,
    receiverAccountIds?.length ? { receiverAccountIds } : {},
  );
  return data;
}

export async function queryPagbankSplit(transactionId: string) {
  const { data } = await api.get(`/payments/pagbank/transactions/${transactionId}/split`);
  return data;
}

export async function getConnectAuthorizeUrl(redirectUri?: string) {
  const { data } = await api.get<{ url: string }>('/payments/pagbank/connect/authorize-url', {
    params: redirectUri ? { redirectUri } : undefined,
  });
  return data;
}

export async function listConnectAccounts(): Promise<PagbankConnectAccount[]> {
  const { data } = await api.get<PagbankConnectAccount[]>('/payments/pagbank/connect/accounts');
  return data;
}

export async function requestConnectSms(bankBranch: string, accountNumber: string) {
  const { data } = await api.post('/payments/pagbank/connect/sms/request', {
    bankBranch,
    accountNumber,
  });
  return data as { smsSessionId: string; phoneNumber: string; retryAfterSeconds: number };
}

export async function createRecurringPlan(body: {
  name: string;
  amountCents: number;
  referenceId?: string;
  intervalUnit?: 'DAY' | 'MONTH' | 'YEAR';
  intervalLength?: number;
}) {
  const { data } = await api.post('/payments/pagbank/recurring/plans', {
    name: body.name,
    amountCents: body.amountCents,
    referenceId: body.referenceId,
    interval: body.intervalUnit
      ? { unit: body.intervalUnit, length: body.intervalLength ?? 1 }
      : undefined,
  });
  return data;
}

export async function listRecurringPlans(): Promise<PagbankRecurringPlanLocal[]> {
  const { data } = await api.get<PagbankRecurringPlanLocal[]>('/payments/pagbank/recurring/plans');
  return data;
}

export async function inactivateRecurringPlan(id: string) {
  const { data } = await api.put(`/payments/pagbank/recurring/plans/${id}/inactivate`);
  return data;
}

export async function createRecurringSubscription(body: {
  referenceId: string;
  localPlanId?: string;
  planId?: string;
  customerName?: string;
  customerEmail?: string;
  customerTaxId?: string;
  cardToken?: string;
  cardSecurityCode?: string;
}) {
  const { data } = await api.post('/payments/pagbank/recurring/subscriptions', body);
  return data;
}

export async function listRecurringSubscriptions(): Promise<PagbankSubscriptionLocal[]> {
  const { data } = await api.get<PagbankSubscriptionLocal[]>(
    '/payments/pagbank/recurring/subscriptions',
  );
  return data;
}

export async function cancelRecurringSubscription(id: string) {
  const { data } = await api.put(`/payments/pagbank/recurring/subscriptions/${id}/cancel`);
  return data;
}

export async function listSubscriptionInvoices(subscriptionLocalId: string) {
  const { data } = await api.get(
    `/payments/pagbank/recurring/subscriptions/${subscriptionLocalId}/invoices`,
  );
  return data;
}

export async function refundRecurringPayment(paymentId: string) {
  const { data } = await api.post(`/payments/pagbank/recurring/payments/${paymentId}/refund`);
  return data;
}

export async function createPagbankTransfer(body: {
  amountCents: number;
  instrumentType: 'P2P' | 'PIX';
  description?: string;
  referenceId?: string;
  notificationUrl?: string;
  p2p?: { accountId?: string; bankBranch?: string; accountNumber?: string };
  pix?: { key?: string; name?: string; taxId?: string };
}) {
  const { data } = await api.post('/payments/pagbank/transfers', body);
  return data;
}

export async function listPagbankTransfers(): Promise<PagbankTransferLocal[]> {
  const { data } = await api.get<PagbankTransferLocal[]>('/payments/pagbank/transfers');
  return data;
}

export async function registerPagbankAccount(body: {
  type: 'BUYER' | 'SELLER' | 'ENTERPRISE';
  email: string;
  person: Record<string, unknown>;
  tosAcceptance: Record<string, unknown>;
  businessCategory?: string;
}) {
  const { data } = await api.post('/payments/pagbank/registration/accounts', body);
  return data;
}

export type PagbankRecurringTestScenario = {
  id: string;
  label: string;
  group: string;
  brand: string;
  behavior: string;
  cardNumber: string;
  cardToken: string;
  securityCode: string;
  expMonth: string;
  expYear: string;
};

export type PagbankOrdersTestScenario = {
  id: string;
  label: string;
  group: 'success' | 'denied';
  brand: string;
  behavior: string;
  cardNumber: string;
  securityCode: string;
  expMonth: string;
  expYear: string;
};

export type PagbankOrders3dsDebitScenario = {
  id: string;
  label: string;
  group: 'auth_success' | 'auth_declined';
  brand: string;
  behavior: string;
  cardNumber: string;
  securityCode: string;
  expMonth: string;
  expYear: string;
  amountCents: number;
};

export type PagbankTestPanel = {
  environment: string;
  tokenConfigured: boolean;
  isSandbox: boolean;
  apiBases: { orders: string; subscriptions: string };
  docUrl: string;
  ordersTestCardsDocUrl?: string;
  groupLabels: Record<string, string>;
  scenarios: PagbankRecurringTestScenario[];
  ordersGroupLabels?: Record<string, string>;
  ordersScenarios?: PagbankOrdersTestScenario[];
  orders3dsGroupLabels?: Record<string, string>;
  orders3dsScenarios?: PagbankOrders3dsDebitScenario[];
  orders3dsDocUrl?: string;
  ordersBoletoDocUrl?: string;
  splitSandbox?: {
    ready: boolean;
    pixReady: boolean;
    queryReady: boolean;
    issues: string[];
    pixIssues: string[];
    queryIssues: string[];
    masterAccountId: string | null;
    secondaryReceivers: number;
    splitsPreview: unknown;
    splitsPixPreview?: unknown;
    docUrl: string;
    pixDocUrl?: string;
    queryDocUrl?: string;
  };
  testPlan: { id: string; pagbankPlanId: string; name: string; amountCents: number } | null;
};

export type PagbankTestRunResult = {
  ok: boolean;
  httpStatus?: number;
  durationMs?: number;
  scenario?: PagbankRecurringTestScenario;
  ordersScenario?: PagbankOrdersTestScenario | PagbankOrders3dsDebitScenario;
  apiBase?: string;
  endpoint?: string;
  request?: unknown;
  response?: unknown;
  error?: string | null;
  localSubscription?: { id: string; pagbankSubscriptionId: string; status: string | null };
  expectedBehavior?: string;
  cardStrategy?: string;
  attempts?: Array<{
    cardStrategy: string;
    endpoint?: string;
    ok: boolean;
    httpStatus: number;
    request?: Record<string, unknown>;
    response?: Record<string, unknown>;
    error: string | null;
  }>;
  ordersTestCard?: {
    maskedPan: string;
    brand: string;
    panKind: string;
    docUrl: string;
    note?: string;
  };
  chargeStatus?: string | null;
  threeDsId?: string;
  threedsStatus?: string | null;
  paymentType?: string;
  boletoPdfUrl?: string;
  boletoBarcode?: string;
  pagbankSplitId?: string | null;
  pagbankOrderId?: string | null;
  transactionId?: string | null;
  splitSandbox?: PagbankTestPanel['splitSandbox'];
};

export type PagbankTokenVerifyResult = {
  valid: boolean;
  message: string;
  environment: string;
  environmentLabel?: string;
  isSandbox?: boolean;
  tokenSource: string;
  orders: {
    label: string;
    apiBase: string;
    endpoint: string;
    ok: boolean;
    httpStatus: number;
    authRejected?: boolean;
    error: string | null;
  };
  subscriptions: {
    label: string;
    apiBase: string;
    endpoint: string;
    ok: boolean;
    httpStatus: number;
    authRejected?: boolean;
    error: string | null;
  };
  environmentMismatch?: {
    detected: boolean;
    suggestedEnvironment: string;
    suggestedLabel: string;
    message: string;
  } | null;
};

export async function verifyPagbankToken(params?: {
  token?: string;
  environment?: 'sandbox' | 'production';
}): Promise<PagbankTokenVerifyResult> {
  const body: Record<string, string> = {};
  if (params?.token?.trim()) body.token = params.token.trim();
  if (params?.environment) body.environment = params.environment;
  const { data } = await api.post<PagbankTokenVerifyResult>(
    '/payments/pagbank/test/verify-token',
    body,
  );
  return data;
}

export async function fetchPagbankTestPanel(): Promise<PagbankTestPanel> {
  const { data } = await api.get<PagbankTestPanel>('/payments/pagbank/test/panel');
  return data;
}

export async function ensurePagbankTestPlan() {
  const { data } = await api.post('/payments/pagbank/test/ensure-plan');
  return data;
}

export async function runPagbankRecurringTest(scenarioId: string): Promise<PagbankTestRunResult> {
  const { data } = await api.post<PagbankTestRunResult>('/payments/pagbank/test/recurring/run', {
    scenarioId,
  });
  return data;
}

export async function runPagbankOrdersPixTest(): Promise<PagbankTestRunResult> {
  const { data } = await api.post<PagbankTestRunResult>('/payments/pagbank/test/orders/pix');
  return data;
}

export async function runPagbankOrdersBoletoTest(): Promise<PagbankTestRunResult> {
  const { data } = await api.post<PagbankTestRunResult>('/payments/pagbank/test/orders/boleto');
  return data;
}

export async function runPagbankOrdersSplitTest(): Promise<PagbankTestRunResult> {
  const { data } = await api.post<PagbankTestRunResult>('/payments/pagbank/test/orders/split');
  return data;
}

export async function runPagbankOrdersSplitPixTest(): Promise<PagbankTestRunResult> {
  const { data } = await api.post<PagbankTestRunResult>(
    '/payments/pagbank/test/orders/split/pix',
  );
  return data;
}

export async function runPagbankOrdersSplitQueryTest(params?: {
  splitId?: string;
  transactionId?: string;
  pagbankOrderId?: string;
}): Promise<PagbankTestRunResult> {
  const { data } = await api.post<PagbankTestRunResult>(
    '/payments/pagbank/test/orders/split/query',
    params ?? {},
  );
  return data;
}

export async function runPagbankOrdersCardTest(
  scenarioId: string,
): Promise<PagbankTestRunResult> {
  const { data } = await api.post<PagbankTestRunResult>('/payments/pagbank/test/orders/card', {
    scenarioId,
  });
  return data;
}

export async function runPagbankOrdersDebit3dsTest(
  scenarioId: string,
): Promise<PagbankTestRunResult> {
  const { runPagbankAuthenticate3ds } = await import('../utils/pagbank3dsSdk');
  const { data: prepare } = await api.post<{
    session: string;
    sdkEnv: string;
    authenticate3dsRequest: unknown;
  }>('/payments/pagbank/test/orders/debit/prepare', { scenarioId });

  const auth = await runPagbankAuthenticate3ds(
    prepare.session,
    prepare.sdkEnv,
    prepare.authenticate3dsRequest,
  );

  const { data } = await api.post<PagbankTestRunResult>(
    '/payments/pagbank/test/orders/debit/complete',
    { scenarioId, threeDsId: auth.id },
  );
  return data;
}

export async function listRegisteredPagbankAccounts(): Promise<PagbankRegisteredAccountLocal[]> {
  const { data } = await api.get<PagbankRegisteredAccountLocal[]>(
    '/payments/pagbank/registration/accounts',
  );
  return data;
}

export async function confirmConnectSms(payload: {
  smsSessionId: string;
  code: string;
  bankBranch: string;
  accountNumber: string;
}) {
  const { data } = await api.post<PagbankConnectAccount>(
    '/payments/pagbank/connect/sms/confirm',
    payload,
  );
  return data;
}
