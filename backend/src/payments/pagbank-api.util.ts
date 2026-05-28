import { BadGatewayException } from '@nestjs/common';
import { randomUUID } from 'crypto';

type PagbankErrorItem = {
  description?: string;
  error?: string;
  code?: string;
  parameter_name?: string;
  message?: string;
};

function formatPagbankErrorItem(e: PagbankErrorItem): string {
  const parts = [e.code, e.error, e.description, e.parameter_name, e.message].filter(
    (p) => p != null && String(p).trim() !== '',
  );
  return parts.length ? parts.map(String).join(' — ') : 'Erro';
}

export function formatPagbankApiError(data: Record<string, unknown>): string {
  if (!data || Object.keys(data).length === 0) {
    return 'Erro na API PagBank (resposta vazia)';
  }
  const errors = data.error_messages as PagbankErrorItem[] | undefined;
  if (errors?.length) {
    return errors.map(formatPagbankErrorItem).join('; ');
  }
  const msgs = data.errors as PagbankErrorItem[] | undefined;
  if (msgs?.length) {
    return msgs.map(formatPagbankErrorItem).join('; ');
  }
  return (data.message as string) || (data.raw as string) || 'Erro na API PagBank';
}

export function assertPagbankOk<T extends Record<string, unknown>>(
  res: { ok: boolean; data: T },
  fallback?: string,
): T {
  if (!res.ok) {
    throw new BadGatewayException(formatPagbankApiError(res.data) || fallback);
  }
  return res.data;
}

export function pagbankIdempotencyKey(): string {
  return randomUUID().replace(/-/g, '').slice(0, 64);
}

/** Formato aceito em `qr_codes.expiration_date` (ex.: 2021-08-29T20:15:59-03:00). */
export function formatPagbankDateTimeBr(date: Date): string {
  const formatted = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return `${formatted.replace(' ', 'T')}-03:00`;
}
