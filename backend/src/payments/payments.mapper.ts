import { PaymentSettings } from './entities/payment-settings.entity';
import { PaymentSplitReceiver } from './entities/payment-split-receiver.entity';
import {
  getPagbankFlowCatalog,
  PAGBANK_FLOW_CATEGORY_LABELS,
  mergePagbankFlowsConfig,
  PagbankFlowsConfigMap,
} from './pagbank-flows.catalog';
import { buildPagbankSplitsPayload } from './pagbank-split.builder';

function maskSecret(value: string | null): { set: boolean; preview: string | null } {
  if (!value?.trim()) return { set: false, preview: null };
  const t = value.trim();
  if (t.length <= 8) return { set: true, preview: '••••••••' };
  return { set: true, preview: `••••${t.slice(-4)}` };
}

export function mapPaymentSettingsResponse(
  settings: PaymentSettings,
  receivers: PaymentSplitReceiver[],
) {
  const tokenMask = maskSecret(settings.pagbankToken);
  const connectSecretMask = maskSecret(settings.pagbankConnectClientSecret);
  const flows = mergePagbankFlowsConfig(
    settings.pagbankFlowsConfig as PagbankFlowsConfigMap,
  );

  const activeReceivers = receivers.filter((r) => r.active);
  const percentageTotal = activeReceivers.reduce((s, r) => s + Number(r.amountValue), 0);

  let splitsPreview: ReturnType<typeof buildPagbankSplitsPayload> = null;
  try {
    if (settings.pagbankSplitEnabled && settings.pagbankMasterAccountId) {
      splitsPreview = buildPagbankSplitsPayload(settings, receivers);
    }
  } catch {
    splitsPreview = null;
  }

  const catalog = getPagbankFlowCatalog().map((flow) => ({
    ...flow,
    config: flows[flow.id] ?? { enabled: false, options: {} },
  }));

  const enabledCount = catalog.filter((f) => f.config.enabled).length;

  return {
    catalog,
    categoryLabels: PAGBANK_FLOW_CATEGORY_LABELS,
    summary: {
      enabledFlows: enabledCount,
      totalFlows: catalog.length,
      implementedFlows: catalog.filter((f) => f.implemented && f.config.enabled).length,
    },
    general: {
      pagbankEnvironment: settings.pagbankEnvironment,
      pagbankTokenSet: tokenMask.set,
      pagbankTokenPreview: tokenMask.preview,
      pagbankPublicKey: settings.pagbankPublicKey,
      pagbankConnectClientId: settings.pagbankConnectClientId,
      pagbankConnectClientSecretSet: connectSecretMask.set,
      pagbankConnectClientSecretPreview: connectSecretMask.preview,
      pagbankConnectRedirectUri: settings.pagbankConnectRedirectUri,
      pagbankNotificationUrl: settings.pagbankNotificationUrl,
      pagbankOrderSoftDescriptor: settings.pagbankOrderSoftDescriptor,
      pagbankOrderMcc: settings.pagbankOrderMcc,
      notes: settings.notes,
    },
    flows,
    pagbankSplit: {
      pagbankSplitEnabled: settings.pagbankSplitEnabled,
      pagbankSplitMethod: settings.pagbankSplitMethod,
      pagbankMasterAccountId: settings.pagbankMasterAccountId,
      pagbankTransferInterest: settings.pagbankTransferInterest,
      pagbankTransferShipping: settings.pagbankTransferShipping,
      pagbankCustodyEnabled: settings.pagbankCustodyEnabled,
      pagbankCustodyScheduledDefault: settings.pagbankCustodyScheduledDefault,
      pagbankConnectAutoSyncSplit: settings.pagbankConnectAutoSyncSplit,
      pagbankConnectSplitPercentEach:
        settings.pagbankConnectSplitPercentEach != null
          ? Number(settings.pagbankConnectSplitPercentEach)
          : null,
      pagbankCheckoutReturnUrl: settings.pagbankCheckoutReturnUrl,
      pagbankCheckoutSuccessUrl: settings.pagbankCheckoutSuccessUrl,
      receivers: receivers.map((r) => ({
        id: r.id,
        label: r.label,
        connectAccountId: r.connectAccountId,
        pagbankAccountId: r.pagbankAccountId,
        role: r.role,
        amountValue: Number(r.amountValue),
        isLiable: r.isLiable,
        active: r.active,
        sortOrder: r.sortOrder,
      })),
      percentageTotal,
      splitsPreview,
    },
  };
}
