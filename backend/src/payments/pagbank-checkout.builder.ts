import { Order } from '../pdv/entities/order.entity';
import { PaymentSettings } from './entities/payment-settings.entity';
import { buildItemsFromOrder } from './pagbank-order.builder';

export type PagbankHostedCheckoutCustomer = {
  name: string;
  email?: string;
  taxId?: string;
  phone?: { country?: string; area?: string; number?: string };
};

export function buildPagbankHostedCheckoutPayload(
  settings: PaymentSettings,
  params: {
    referenceId: string;
    amountCents: number;
    customer?: PagbankHostedCheckoutCustomer;
    items?: ReturnType<typeof buildItemsFromOrder>;
    returnUrl?: string;
    redirectUrl?: string;
    notificationUrls?: string[];
    expirationDate?: string;
    softDescriptor?: string | null;
  },
): Record<string, unknown> {
  const items =
    params.items?.length ?
      params.items
    : [
        {
          reference_id: params.referenceId,
          name: 'Pedido',
          quantity: 1,
          unit_amount: params.amountCents,
        },
      ];

  const payload: Record<string, unknown> = {
    reference_id: params.referenceId.slice(0, 64),
    customer_modifiable: !params.customer,
    items,
    additional_amount: 0,
    discount_amount: 0,
    payment_methods: [
      { type: 'credit_card' },
      { type: 'debit_card' },
      { type: 'PIX' },
      { type: 'BOLETO' },
    ],
  };

  if (params.customer) {
    payload.customer = {
      name: params.customer.name,
      email: params.customer.email,
      tax_id: params.customer.taxId?.replace(/\D/g, ''),
      phone: params.customer.phone,
    };
    payload.customer_modifiable = false;
  }

  if (params.expirationDate) payload.expiration_date = params.expirationDate;
  if (params.softDescriptor) payload.soft_descriptor = params.softDescriptor.slice(0, 17);

  const returnUrl = params.returnUrl?.trim() || settings.pagbankCheckoutReturnUrl?.trim();
  const successUrl = params.redirectUrl?.trim() || settings.pagbankCheckoutSuccessUrl?.trim();
  if (returnUrl) payload.return_url = returnUrl.slice(0, 255);
  if (successUrl) payload.redirect_url = successUrl.slice(0, 255);

  const notify = params.notificationUrls?.filter(Boolean) ?? [];
  const fallback = settings.pagbankNotificationUrl?.trim();
  const urls = notify.length ? notify : fallback ? [fallback] : [];
  if (urls.length) {
    payload.notification_urls = urls.map((u) => u.slice(0, 100));
    payload.payment_notification_urls = urls.map((u) => u.slice(0, 100));
  }

  return payload;
}

export function extractHostedCheckoutData(data: Record<string, unknown>) {
  const links = (data.links as Array<{ rel?: string; href?: string }>) ?? [];
  const payLink = links.find((l) => String(l.rel).toUpperCase() === 'PAY');
  const charges = data.charges as Array<Record<string, unknown>> | undefined;
  const charge = charges?.[0];
  return {
    checkoutId: data.id ? String(data.id) : undefined,
    status: data.status ? String(data.status) : undefined,
    payUrl: payLink?.href,
    links,
    chargeId: charge?.id ? String(charge.id) : undefined,
    orderId:
      typeof data.order_id === 'string' ? data.order_id
      : charge && typeof (charge as { order_id?: string }).order_id === 'string'
        ? String((charge as { order_id: string }).order_id)
        : undefined,
  };
}

export function mapHostedCheckoutStatus(status: string | undefined) {
  const s = (status ?? '').toUpperCase();
  if (s === 'PAID' || s === 'COMPLETED') return 'paid';
  if (s === 'EXPIRED' || s === 'INACTIVE' || s === 'CANCELED') return 'canceled';
  if (s === 'DECLINED' || s === 'FAILED') return 'declined';
  return 'waiting_payment';
}
