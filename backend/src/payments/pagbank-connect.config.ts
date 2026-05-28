import { PagbankEnvironment } from './entities/payment-settings.entity';

const CONNECT_AUTHORIZE: Record<PagbankEnvironment, string> = {
  [PagbankEnvironment.SANDBOX]: 'https://connect.sandbox.pagbank.com.br/oauth2/authorize',
  [PagbankEnvironment.PRODUCTION]: 'https://connect.pagbank.com.br/oauth2/authorize',
};

const API_BASE: Record<PagbankEnvironment, string> = {
  [PagbankEnvironment.SANDBOX]: 'https://sandbox.api.pagseguro.com',
  [PagbankEnvironment.PRODUCTION]: 'https://api.pagseguro.com',
};

export const DEFAULT_CONNECT_SCOPES = [
  'payments.create',
  'payments.read',
  'payments.refund',
  'accounts.read',
].join('+');

export function getConnectAuthorizeUrl(environment: PagbankEnvironment): string {
  return CONNECT_AUTHORIZE[environment];
}

export function getConnectApiBaseUrl(environment: PagbankEnvironment): string {
  return API_BASE[environment];
}
