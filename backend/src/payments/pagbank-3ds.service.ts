import { BadGatewayException, Injectable } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PagbankHttpClient } from './pagbank-http.client';
import { PagbankFlowGuard } from './pagbank-flow.guard';
import { Pagbank3dsSessionDto } from './dto/pagbank-vault.dto';
import { getPagbankSdkBaseUrl } from './pagbank-sdk.config';

@Injectable()
export class Pagbank3dsService {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly http: PagbankHttpClient,
    private readonly flowGuard: PagbankFlowGuard,
  ) {}

  async createSession(tenantId: string, dto: Pagbank3dsSessionDto) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'orders_3ds_pagbank');

    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const sdkBase = getPagbankSdkBaseUrl(settings.pagbankEnvironment);

    const body: Record<string, unknown> = { ...(dto.payload ?? {}) };
    if (dto.amountCents) {
      body.amount = { value: dto.amountCents, currency: 'BRL' };
    }

    const res = await this.http.requestOnBaseUrl<Record<string, unknown>>(
      sdkBase,
      settings,
      'POST',
      '/checkout-sdk/sessions',
      body,
    );

    if (!res.ok) {
      throw new BadGatewayException('Falha ao criar sessão 3DS PagBank');
    }

    return {
      session: res.data.session ?? res.data.id,
      expiresAt: res.data.expires_at,
      publicKey: settings.pagbankPublicKey,
      environment: settings.pagbankEnvironment,
      raw: res.data,
    };
  }
}
