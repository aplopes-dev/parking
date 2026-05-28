import { createPublicKey, publicEncrypt, constants } from 'crypto';
import {
  buildPagseguroEncryptPayload,
  normalizePagseguroHolder,
  RecurringCardPlain,
} from './pagbank-recurring-card-crypto.util';

export { RecurringCardPlain, normalizePagseguroHolder };

/** Converte a chave retornada por POST /public-keys (Orders) para PEM. */
export function pemFromPagbankPublicKey(base64: string): string {
  const body = base64.replace(/\s/g, '');
  const lines = body.match(/.{1,64}/g) ?? [body];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
}

/**
 * Criptografia compatível com PagSeguro.encryptCard (checkout-sdk-js).
 * Payload: numero;cvv;mes;ano;titular;timestamp + RSA PKCS#1 v1.5
 * @see https://developer.pagbank.com.br/docs/criptografia-e-chave-publica
 * @see https://developer.pagbank.com.br/reference/criar-pagar-pedido-com-cartao
 */
export function encryptPagbankCardSdk(
  publicKeyBase64: string,
  card: RecurringCardPlain,
  timestamp = Date.now(),
): string {
  const payload = buildPagseguroEncryptPayload(card, timestamp);
  const key = createPublicKey(pemFromPagbankPublicKey(publicKeyBase64));
  const encrypted = publicEncrypt(
    { key, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(payload, 'utf8'),
  );
  return encrypted.toString('base64');
}
