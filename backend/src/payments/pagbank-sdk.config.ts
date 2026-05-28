import { PagbankEnvironment } from './entities/payment-settings.entity';

/** Host da API Orders (Bearer token). */
export function getPagbankApiBaseUrl(environment: PagbankEnvironment): string {
  return environment === PagbankEnvironment.PRODUCTION
    ? 'https://api.pagseguro.com'
    : 'https://sandbox.api.pagseguro.com';
}

/** Host do checkout-sdk (sessão 3DS). */
export function getPagbankSdkBaseUrl(environment: PagbankEnvironment): string {
  return environment === PagbankEnvironment.PRODUCTION
    ? 'https://sdk.pagseguro.com'
    : 'https://sandbox.sdk.pagseguro.com';
}

/** API PagBank Assinaturas (planos, assinaturas, faturas). */
export function getPagbankSubscriptionsBaseUrl(environment: PagbankEnvironment): string {
  return environment === PagbankEnvironment.PRODUCTION
    ? 'https://api.assinaturas.pagseguro.com'
    : 'https://sandbox.api.assinaturas.pagseguro.com';
}

/** API Transferências (P2P / PIX). */
export function getPagbankSecureBaseUrl(environment: PagbankEnvironment): string {
  return environment === PagbankEnvironment.PRODUCTION
    ? 'https://secure.api.pagseguro.com'
    : 'https://secure.sandbox.api.pagseguro.com';
}
