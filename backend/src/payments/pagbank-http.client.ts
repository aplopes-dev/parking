import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { PaymentSettings } from './entities/payment-settings.entity';
import { getPagbankApiBaseUrl } from './pagbank-sdk.config';
import { preparePagbankToken } from './pagbank-token.util';

export type PagbankHttpResult<T = Record<string, unknown>> = {
  ok: boolean;
  status: number;
  data: T;
};

@Injectable()
export class PagbankHttpClient {
  private readonly logger = new Logger(PagbankHttpClient.name);

  async request<T = Record<string, unknown>>(
    settings: PaymentSettings,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
    options?: {
      baseUrl?: string;
      extraHeaders?: Record<string, string>;
      /** Testa token do formulário antes de salvar. */
      tokenOverride?: string;
    },
  ): Promise<PagbankHttpResult<T>> {
    const rawToken = options?.tokenOverride ?? settings.pagbankToken;
    if (!rawToken?.trim()) {
      throw new BadGatewayException('Token PagBank não configurado');
    }
    const token = preparePagbankToken(rawToken);

    const base = options?.baseUrl ?? getPagbankApiBaseUrl(settings.pagbankEnvironment);
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...options?.extraHeaders,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const text = await res.text();
      let data: T;
      try {
        data = text ? (JSON.parse(text) as T) : ({} as T);
      } catch {
        data = { raw: text } as T;
      }

      if (!res.ok) {
        this.logger.warn(`PagBank ${method} ${path} → ${res.status}`);
      }

      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro de rede PagBank';
      this.logger.error(`PagBank ${method} ${path}: ${msg}`);
      throw new BadGatewayException(msg);
    } finally {
      clearTimeout(timeout);
    }
  }

  async requestOnBaseUrl<T = Record<string, unknown>>(
    baseUrl: string,
    settings: PaymentSettings,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<PagbankHttpResult<T>> {
    if (!settings.pagbankToken?.trim()) {
      throw new BadGatewayException('Token PagBank não configurado');
    }
    const token = preparePagbankToken(settings.pagbankToken);

    const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const text = await res.text();
      let data: T;
      try {
        data = text ? (JSON.parse(text) as T) : ({} as T);
      } catch {
        data = { raw: text } as T;
      }

      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro de rede PagBank';
      throw new BadGatewayException(msg);
    } finally {
      clearTimeout(timeout);
    }
  }
}
