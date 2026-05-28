import { BadRequestException } from '@nestjs/common';
import { PagbankCheckoutPaymentMethod } from './dto/pagbank-orders.dto';
import { PagbankPaymentMethodType } from './pagbank-order.builder';
import { formatPagbankDateTimeBr } from './pagbank-api.util';

export type PagbankPaymentInput = {
  method?: PagbankCheckoutPaymentMethod;
  card?: {
    id?: string;
    encrypted?: string;
    securityCode?: string;
    brand?: string;
    store?: boolean;
    installments?: number;
    capture?: boolean;
    holder?: { name: string; taxId?: string };
    networkToken?: Record<string, unknown>;
  };
  wallet?: {
    type: 'GOOGLE_PAY' | 'APPLE_PAY' | 'SAMSUNG_PAY';
    key?: string;
    cryptogram?: string;
    eci?: string;
    assuranceLevel?: number;
  };
  authentication?: {
    type: 'THREEDS' | 'INAPP';
    cavv?: string;
    xid?: string;
    eci?: string;
    version?: string;
    status?: string;
    dsTransactionId?: string;
  };
  recurring?: {
    type: 'INITIAL' | 'SUBSEQUENT' | 'UNSCHEDULED' | 'STANDING_ORDER';
    recurrenceId?: string;
  };
  fees?: {
    buyerInterest?: boolean;
  };
  boleto?: Record<string, unknown>;
  pix?: Record<string, unknown>;
  sdwo?: Record<string, unknown>;
  eloRecurrence?: Record<string, unknown>;
  /** Campos extras no pedido (ex.: qr_codes PagBank wallet). */
  orderExtras?: Record<string, unknown>;
  /** Mescla no payment_method (escape hatch). */
  payload?: Record<string, unknown>;
};

export type FlowPaymentBuildResult = {
  includeCharge: boolean;
  baseMethod: PagbankPaymentMethodType | null;
  paymentMethod: Record<string, unknown>;
  orderExtras: Record<string, unknown>;
};

const CREATE_ONLY = new Set(['orders_create']);

const WALLET_FLOWS = new Set(['orders_google_pay', 'orders_apple_pay']);

/** PIX via QR Code na API Orders — sem objeto `charges` (doc PagBank). */
const QR_PIX_ORDER_FLOWS = new Set(['orders_pix', 'orders_pagbank_qr', 'split_pix']);

export function buildFlowPayment(
  flowId: string,
  amountCents: number,
  payment?: PagbankPaymentInput,
): FlowPaymentBuildResult {
  if (CREATE_ONLY.has(flowId)) {
    return {
      includeCharge: false,
      baseMethod: null,
      paymentMethod: {},
      orderExtras: payment?.orderExtras ?? {},
    };
  }

  if (QR_PIX_ORDER_FLOWS.has(flowId)) {
    const rawQr = payment?.orderExtras?.qr_codes;
    const firstRaw =
      Array.isArray(rawQr) && rawQr.length
        ? (rawQr[0] as Record<string, unknown>)
        : ({} as Record<string, unknown>);
    const amount =
      (firstRaw.amount as Record<string, unknown> | undefined) ??
      ({ value: amountCents, currency: 'BRL' } as Record<string, unknown>);
    const qrEntry: Record<string, unknown> = {
      ...firstRaw,
      amount: {
        ...(amount as object),
        value: (amount.value as number | undefined) ?? amountCents,
        currency: (amount.currency as string | undefined) ?? 'BRL',
      },
    };
    const exp = payment?.pix?.expiration_date;
    if (exp != null && String(exp).trim()) {
      qrEntry.expiration_date = String(exp).trim();
    } else if (!qrEntry.expiration_date) {
      const defaultExp = new Date(Date.now() + 24 * 60 * 60 * 1000);
      qrEntry.expiration_date = formatPagbankDateTimeBr(defaultExp);
    }
    const qrCodes = Array.isArray(rawQr) && rawQr.length ? [qrEntry, ...rawQr.slice(1)] : [qrEntry];
    return {
      includeCharge: false,
      baseMethod: 'PIX',
      paymentMethod: {},
      orderExtras: {
        ...payment?.orderExtras,
        qr_codes: qrCodes,
      },
    };
  }

  const baseMethod = resolveBaseMethod(flowId, payment);
  if (!baseMethod) {
    throw new BadRequestException(
      `Fluxo "${flowId}" exige payment.method ou dados de pagamento compatíveis`,
    );
  }

  const paymentMethod: Record<string, unknown> = { type: baseMethod };

  if (payment?.fees?.buyerInterest !== undefined || flowId === 'orders_fee_pass_through') {
    paymentMethod.fees = {
      buyer_interest: payment?.fees?.buyerInterest ?? true,
      ...(payment?.payload?.fees as Record<string, unknown>),
    };
  }

  if (baseMethod === 'CREDIT_CARD' || baseMethod === 'DEBIT_CARD') {
    const card = buildCardSection(flowId, payment);
    if (card) paymentMethod.card = card;
    if (payment?.card?.installments) {
      paymentMethod.installments = payment.card.installments;
    }
    if (payment?.card?.capture !== undefined) {
      paymentMethod.capture = payment.card.capture;
    }
    if (flowId === 'split_preauth_partial') {
      paymentMethod.capture = false;
    }
    if (baseMethod === 'DEBIT_CARD') {
      if (payment?.authentication) {
        paymentMethod.authentication_method = buildAuthentication(flowId, payment);
      } else {
        throw new BadRequestException(
          'Cartão de débito exige payment.authentication (resultado 3DS PagBank)',
        );
      }
    } else if (payment?.authentication || flowId.includes('3ds')) {
      paymentMethod.authentication_method = buildAuthentication(flowId, payment);
    }
    if (payment?.recurring || flowId === 'orders_recurrence_hint') {
      paymentMethod.recurring = buildRecurring(payment);
    }
    if (flowId === 'orders_elo_recurrence' && payment?.eloRecurrence) {
      Object.assign(paymentMethod, payment.eloRecurrence);
    }
  }

  if (baseMethod === 'BOLETO' && payment?.boleto) {
    paymentMethod.boleto = payment.boleto;
  }

  if (baseMethod === 'PIX' && payment?.pix && !QR_PIX_ORDER_FLOWS.has(flowId)) {
    paymentMethod.pix = payment.pix;
  }

  if (flowId === 'orders_sdwo' && payment?.sdwo) {
    Object.assign(paymentMethod, payment.sdwo);
  }

  if (payment?.payload) {
    const { type: _t, card: _c, ...rest } = payment.payload;
    Object.assign(paymentMethod, rest);
  }

  if (payment?.orderExtras) {
    /* order level only */
  }

  return {
    includeCharge: true,
    baseMethod,
    paymentMethod,
    orderExtras: payment?.orderExtras ?? {},
  };
}

function resolveBaseMethod(
  flowId: string,
  payment?: PagbankPaymentInput,
): PagbankPaymentMethodType | null {
  if (payment?.method) return payment.method as PagbankPaymentMethodType;

  const map: Record<string, PagbankPaymentMethodType> = {
    orders_pix: 'PIX',
    orders_credit_card: 'CREDIT_CARD',
    orders_debit_card: 'DEBIT_CARD',
    orders_boleto: 'BOLETO',
    orders_pci_card: 'CREDIT_CARD',
    orders_token_pagbank: 'CREDIT_CARD',
    orders_token_card_brand: 'CREDIT_CARD',
    orders_3ds_pagbank: 'CREDIT_CARD',
    orders_3ds_external: 'CREDIT_CARD',
    orders_google_pay: 'CREDIT_CARD',
    orders_apple_pay: 'CREDIT_CARD',
    orders_recurrence_hint: 'CREDIT_CARD',
    orders_elo_recurrence: 'CREDIT_CARD',
    orders_sdwo: 'CREDIT_CARD',
    orders_create_and_pay: 'PIX',
    orders_pagbank_deeplink: 'CREDIT_CARD',
    split_create_and_pay: 'PIX',
    split_pix: 'PIX',
    split_preauth_partial: 'CREDIT_CARD',
    split_custody: 'CREDIT_CARD',
    split_liable_mcc: 'CREDIT_CARD',
    split_chargeback_recovery: 'CREDIT_CARD',
  };

  return map[flowId] ?? null;
}

function buildCardSection(
  flowId: string,
  payment?: PagbankPaymentInput,
): Record<string, unknown> | null {
  const card = payment?.card;
  if (!card && !WALLET_FLOWS.has(flowId)) return null;

  const out: Record<string, unknown> = {};

  if (flowId === 'orders_token_pagbank' && card?.id) {
    out.id = card.id;
    return out;
  }

  if (flowId === 'orders_token_card_brand' && card?.networkToken) {
    return { ...card.networkToken };
  }

  if (card?.id) out.id = card.id;
  if (card?.encrypted) out.encrypted = card.encrypted;
  if (card?.securityCode) out.security_code = card.securityCode;
  if (card?.brand) out.brand = card.brand;
  if (card?.store !== undefined) out.store = card.store;
  if (card?.holder?.name) {
    out.holder = {
      name: card.holder.name,
      tax_id: card.holder.taxId,
    };
  }

  if (WALLET_FLOWS.has(flowId) && payment?.wallet) {
    out.wallet = {
      type: payment.wallet.type,
      key: payment.wallet.key,
      cryptogram: payment.wallet.cryptogram,
      eci: payment.wallet.eci,
      assurance_level: payment.wallet.assuranceLevel,
    };
  }

  if (flowId === 'orders_pci_card' && !card?.encrypted && !card?.id) {
    throw new BadRequestException('orders_pci_card exige payment.card.encrypted ou card.id');
  }

  if (Object.keys(out).length) return out;
  return (payment?.payload?.card as Record<string, unknown>) ?? null;
}

function buildAuthentication(
  flowId: string,
  payment?: PagbankPaymentInput,
): Record<string, unknown> {
  const auth = payment?.authentication;
  if (auth) {
    return {
      type: auth.type,
      cavv: auth.cavv,
      xid: auth.xid,
      eci: auth.eci,
      version: auth.version,
      status: auth.status,
      ds_transaction_id: auth.dsTransactionId,
      dstrans_id: auth.dsTransactionId,
    };
  }
  if (flowId === 'orders_3ds_external' || flowId === 'orders_3ds_pagbank') {
    throw new BadRequestException(
      'Fluxo 3DS exige payment.authentication (resultado da autenticação)',
    );
  }
  return { type: 'THREEDS' };
}

function buildRecurring(payment?: PagbankPaymentInput): Record<string, unknown> {
  const r = payment?.recurring;
  if (!r?.type) {
    return { type: 'INITIAL' };
  }
  return {
    type: r.type,
    recurrence_id: r.recurrenceId,
  };
}
