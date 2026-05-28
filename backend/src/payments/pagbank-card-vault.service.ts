import { BadGatewayException, Injectable } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PagbankHttpClient } from './pagbank-http.client';
import { PagbankFlowGuard } from './pagbank-flow.guard';
import { PagbankVaultCardDto } from './dto/pagbank-vault.dto';

@Injectable()
export class PagbankCardVaultService {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly http: PagbankHttpClient,
    private readonly flowGuard: PagbankFlowGuard,
  ) {}

  async storeCard(tenantId: string, dto: PagbankVaultCardDto) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'orders_card_vault');

    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const body: Record<string, unknown> = {
      encrypted: dto.encrypted,
      ...(dto.payload ?? {}),
    };
    if (dto.securityCode) body.security_code = dto.securityCode;
    if (dto.holder?.name) {
      body.holder = {
        name: dto.holder.name,
        tax_id: dto.holder.taxId,
      };
    }

    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'POST',
      '/tokens/cards',
      body,
    );

    if (!res.ok) {
      const msg =
        (res.data.error_messages as Array<{ description?: string }> | undefined)
          ?.map((e) => e.description)
          .join('; ') || 'Falha ao armazenar cartão no PagBank';
      throw new BadGatewayException(msg);
    }

    return {
      cardId: res.data.id,
      brand: res.data.brand,
      firstDigits: res.data.first_digits,
      lastDigits: res.data.last_digits,
      expMonth: res.data.exp_month,
      expYear: res.data.exp_year,
      raw: res.data,
    };
  }
}
