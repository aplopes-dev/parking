import { PaymentSettings } from './entities/payment-settings.entity';
import { Order } from '../pdv/entities/order.entity';
import { PagbankSplitsPayload } from './pagbank-split.builder';
import { PagbankTransactionStatus } from './entities/pagbank-transaction.entity';
import { FlowPaymentBuildResult } from './pagbank-flow-payment.builder';

export type PagbankPaymentMethodType = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BOLETO';

export type BuildPagbankOrderInput = {
  referenceId: string;
  amountCents: number;
  softDescriptor?: string | null;
  notificationUrls?: string[];
  customer?: {
    name: string;
    email?: string;
    taxId?: string;
  };
  items?: Array<{ name: string; quantity: number; unitAmountCents: number }>;
  flowPayment?: FlowPaymentBuildResult;
  splits?: PagbankSplitsPayload | null;
};

function moneyCentsFromDecimal(value: string | number): number {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Math.round(n * 100);
}

export function buildItemsFromOrder(order: Order): BuildPagbankOrderInput['items'] {
  if (!order.items?.length) {
    return [
      {
        name: `Pedido #${order.orderNumber}`,
        quantity: 1,
        unitAmountCents: moneyCentsFromDecimal(order.total),
      },
    ];
  }
  return order.items.map((item) => ({
    name: item.productName.slice(0, 100),
    quantity: Math.max(1, Math.round(parseFloat(item.quantity))),
    unitAmountCents: moneyCentsFromDecimal(item.unitPrice),
  }));
}

export function buildPagbankOrderPayload(
  settings: PaymentSettings,
  input: BuildPagbankOrderInput,
): Record<string, unknown> {
  const items =
    input.items?.map((i) => ({
      reference_id: i.name.slice(0, 50),
      name: i.name,
      quantity: i.quantity,
      unit_amount: i.unitAmountCents,
    })) ?? [
      {
        reference_id: input.referenceId,
        name: 'Pedido',
        quantity: 1,
        unit_amount: input.amountCents,
      },
    ];

  const payload: Record<string, unknown> = {
    reference_id: input.referenceId,
    items,
  };

  if (input.customer?.name) {
    const customer: Record<string, unknown> = { name: input.customer.name };
    if (input.customer.email?.trim()) {
      customer.email = input.customer.email.trim();
    }
    const taxId = input.customer.taxId?.replace(/\D/g, '');
    if (taxId) customer.tax_id = taxId;
    payload.customer = customer;
  }

  const urls = input.notificationUrls?.filter(Boolean) ?? [];
  if (settings.pagbankNotificationUrl?.trim()) {
    urls.push(settings.pagbankNotificationUrl.trim());
  }
  if (urls.length) payload.notification_urls = [...new Set(urls)];

  if (input.flowPayment?.orderExtras) {
    Object.assign(payload, input.flowPayment.orderExtras);
  }

  /** Split PIX: splits dentro de qr_codes[0] (sem charges). */
  if (
    input.splits &&
    Array.isArray(payload.qr_codes) &&
    (payload.qr_codes as unknown[]).length > 0
  ) {
    const qrList = payload.qr_codes as Array<Record<string, unknown>>;
    payload.qr_codes = [{ ...qrList[0], splits: input.splits }, ...qrList.slice(1)];
  }

  if (input.flowPayment?.includeCharge && input.flowPayment.baseMethod) {
    const charge: Record<string, unknown> = {
      reference_id: `${input.referenceId}-charge`,
      description: input.softDescriptor?.trim() || 'Aplopes Food',
      amount: { value: input.amountCents, currency: 'BRL' },
      payment_method: input.flowPayment.paymentMethod,
    };
    if (input.splits) charge.splits = input.splits;
    payload.charges = [charge];
  }

  return payload;
}

export function buildPagbankPayPayload(
  amountCents: number,
  flowPayment: FlowPaymentBuildResult,
  splits: PagbankSplitsPayload | null,
  softDescriptor?: string | null,
  referenceId?: string,
): Record<string, unknown> {
  if (!flowPayment.includeCharge || !flowPayment.baseMethod) {
    throw new Error('Fluxo de pagamento não inclui cobrança');
  }
  const charge: Record<string, unknown> = {
    reference_id: referenceId ?? `pay-${Date.now()}`,
    amount: { value: amountCents, currency: 'BRL' },
    description: softDescriptor?.trim() || 'Aplopes Food',
    payment_method: flowPayment.paymentMethod,
  };
  if (splits) charge.splits = splits;
  return { charges: [charge] };
}

function extractBoletoPdfUrl(
  boleto: Record<string, unknown> | undefined,
  chargeLinks: Array<{ rel: string; href: string }> | undefined,
): string | undefined {
  const boletoLinks = boleto?.links as Array<{ rel?: string; href?: string }> | undefined;
  const candidates = [...(boletoLinks ?? []), ...(chargeLinks ?? [])];
  const pdf = candidates.find(
    (l) =>
      /\.pdf($|\?)/i.test(l.href ?? '') ||
      /boleto/i.test(l.rel ?? '') ||
      /BOLETO/i.test(l.rel ?? ''),
  );
  if (pdf?.href) return pdf.href;
  if (typeof boleto?.pdf === 'string' && boleto.pdf) return boleto.pdf;
  return undefined;
}

export function extractCheckoutData(
  pagbankResponse: Record<string, unknown>,
): Record<string, unknown> | null {
  const charges = pagbankResponse.charges as Array<Record<string, unknown>> | undefined;
  const charge = charges?.[0];
  const orderQr = pagbankResponse.qr_codes as Array<Record<string, unknown>> | undefined;
  const orderQrFirst = orderQr?.[0];

  if (!charge && !orderQrFirst) return null;

  const pm = charge?.payment_method as Record<string, unknown> | undefined;
  const pix = pm?.pix as Record<string, unknown> | undefined;
  const boleto = pm?.boleto as Record<string, unknown> | undefined;
  const links = charge?.links as Array<{ rel: string; href: string }> | undefined;
  const card = pm?.card as Record<string, unknown> | undefined;

  return {
    chargeId: charge?.id,
    status: charge?.status ?? (orderQrFirst ? 'WAITING' : undefined),
    paymentMethodType: pm?.type ?? (orderQrFirst ? 'PIX' : undefined),
    pixQrCode: pix?.qr_codes ?? pix?.qr_code ?? orderQrFirst?.links,
    pixCopyPaste:
      (typeof pix?.text === 'string' ? pix.text : undefined) ??
      (typeof orderQrFirst?.text === 'string' ? orderQrFirst.text : undefined),
    boleto,
    boletoBarcode:
      (typeof boleto?.barcode === 'string' ? boleto.barcode : undefined) ??
      (typeof boleto?.formatted_barcode === 'string' ? boleto.formatted_barcode : undefined),
    boletoPdfUrl: extractBoletoPdfUrl(boleto, links),
    links,
    cardId: card?.id,
    wallet: card?.wallet,
    orderQrCodes: orderQr,
    deeplink: links?.find((l) => l.rel?.toLowerCase().includes('deeplink'))?.href,
  };
}

export function mapPagbankChargeStatus(
  status: string | undefined,
): 'created' | 'waiting_payment' | 'paid' | 'declined' | 'canceled' | 'error' {
  const s = (status ?? '').toUpperCase();
  if (s === 'PAID' || s === 'COMPLETED') return 'paid';
  if (s === 'DECLINED' || s === 'FAILED') return 'declined';
  if (s === 'CANCELED' || s === 'CANCELLED') return 'canceled';
  if (s === 'WAITING' || s === 'IN_ANALYSIS' || s === 'AUTHORIZED') return 'waiting_payment';
  if (s === 'ERROR') return 'error';
  return 'created';
}

export function toPagbankTransactionStatus(
  s: ReturnType<typeof mapPagbankChargeStatus>,
): PagbankTransactionStatus {
  const map: Record<string, PagbankTransactionStatus> = {
    created: PagbankTransactionStatus.CREATED,
    waiting_payment: PagbankTransactionStatus.WAITING_PAYMENT,
    paid: PagbankTransactionStatus.PAID,
    declined: PagbankTransactionStatus.DECLINED,
    canceled: PagbankTransactionStatus.CANCELED,
    error: PagbankTransactionStatus.ERROR,
  };
  return map[s] ?? PagbankTransactionStatus.CREATED;
}
