export type RecurringCardPlain = {
  holder: string;
  number: string;
  expMonth: string;
  expYear: string;
  securityCode: string;
};

/** Igual ao SDK PagSeguro.encryptCard (holder normalizado, expMonth com 2 dígitos). */
export function buildPagseguroEncryptPayload(
  card: RecurringCardPlain,
  timestamp = Date.now(),
): string {
  const number = String(card.number ?? '').trim();
  const securityCode = String(card.securityCode ?? '').trim();
  const expMonthRaw = String(card.expMonth ?? '').trim();
  const expMonth = expMonthRaw.length === 1 ? `0${expMonthRaw}` : expMonthRaw;
  const expYear = String(card.expYear ?? '').trim();
  const holder = normalizePagseguroHolder(card.holder);
  return `${number};${securityCode};${expMonth};${expYear};${holder};${timestamp}`;
}

export function normalizePagseguroHolder(name: string): string {
  return String(name ?? '')
    .substring(0, 30)
    .replace(/'/g, '')
    .replace(/\//g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z\s]/g, '')
    .trim();
}
