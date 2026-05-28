import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { PaymentsService } from './payments.service';
import { PagbankFlowGuard } from './pagbank-flow.guard';
import {
  PagbankConnectAccount,
  PagbankConnectAuthMethod,
} from './entities/pagbank-connect-account.entity';
import {
  DEFAULT_CONNECT_SCOPES,
  getConnectApiBaseUrl,
  getConnectAuthorizeUrl,
} from './pagbank-connect.config';
import {
  PagbankConnectSmsConfirmDto,
  PagbankConnectSmsRequestDto,
} from './dto/pagbank-connect.dto';

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  account_id?: string;
};

@Injectable()
export class PagbankConnectService {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly flowGuard: PagbankFlowGuard,
    @InjectRepository(PagbankConnectAccount)
    private readonly connectRepo: Repository<PagbankConnectAccount>,
  ) {}

  async getAuthorizationUrl(tenantId: string, redirectUriOverride?: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'connect_authorization');

    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const clientId = settings.pagbankConnectClientId?.trim();
    const secret = settings.pagbankConnectClientSecret?.trim();
    if (!clientId || !secret) {
      throw new BadRequestException(
        'Configure Client ID e Client Secret PagBank Connect em Geral e credenciais',
      );
    }

    const redirectUri =
      redirectUriOverride?.trim() ||
      settings.pagbankConnectRedirectUri?.trim() ||
      (settings.pagbankFlowsConfig as Record<string, { options?: Record<string, string> }>)
        ?.connect_authorization?.options?.redirectUri;

    if (!redirectUri) {
      throw new BadRequestException(
        'Informe a Redirect URI (configuração Connect ou fluxo connect_authorization)',
      );
    }

    const state = `${tenantId}|${randomUUID()}`;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: DEFAULT_CONNECT_SCOPES,
      state,
    });

    const url = `${getConnectAuthorizeUrl(settings.pagbankEnvironment)}?${params.toString()}`;
    return { url, state, redirectUri, scopes: DEFAULT_CONNECT_SCOPES.replace(/\+/g, ' ') };
  }

  async handleOAuthCallback(code: string, state: string) {
    const tenantId = state?.split('|')[0]?.trim();
    if (!tenantId || tenantId.length < 30) {
      throw new BadRequestException('State OAuth inválido');
    }

    await this.flowGuard.assertFlowAllowed(tenantId, 'connect_token');

    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const redirectUri = settings.pagbankConnectRedirectUri?.trim();
    if (!redirectUri) {
      throw new BadRequestException('Redirect URI não configurada');
    }

    const tokenData = await this.exchangeToken(settings.pagbankEnvironment, {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }, settings.pagbankConnectClientId!, settings.pagbankConnectClientSecret!);

    const account = await this.saveConnectedAccount(tenantId, tokenData, {
      authMethod: PagbankConnectAuthMethod.AUTHORIZATION,
      label: 'Conta Connect (OAuth)',
    });

    await this.paymentsService.syncConnectAccountsToSplitReceivers(tenantId);

    return { tenantId, accountId: account.id, pagbankAccountId: account.pagbankAccountId };
  }

  async requestSmsAuthorization(tenantId: string, dto: PagbankConnectSmsRequestDto) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'connect_sms');
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const base = getConnectApiBaseUrl(settings.pagbankEnvironment);

    const res = await this.postConnect(
      base,
      '/oauth2/authorize/sms',
      {
        bank_branch: dto.bankBranch,
        account_number: dto.accountNumber,
      },
      settings.pagbankConnectClientId!,
      settings.pagbankConnectClientSecret!,
    );

    if (!res.ok) {
      throw new BadGatewayException(this.formatErrors(res.data));
    }

    return {
      smsSessionId: res.data.id,
      phoneNumber: res.data.phone_number,
      retryAfterSeconds: res.data.retry_after_seconds,
      bankBranch: dto.bankBranch,
      accountNumber: dto.accountNumber,
    };
  }

  /** Confirma SMS e obtém tokens (fluxo connect_token após SMS). */
  async confirmSmsAuthorization(tenantId: string, dto: PagbankConnectSmsConfirmDto) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'connect_token');
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const base = getConnectApiBaseUrl(settings.pagbankEnvironment);

    const res = await this.postConnect(
      base,
      '/oauth2/token',
      {
        grant_type: 'sms',
        sms_session_id: dto.smsSessionId,
        sms_code: dto.code,
        bank_branch: dto.bankBranch,
        account_number: dto.accountNumber,
      },
      settings.pagbankConnectClientId!,
      settings.pagbankConnectClientSecret!,
    );

    if (!res.ok) {
      throw new BadGatewayException(this.formatErrors(res.data));
    }

    const account = await this.saveConnectedAccount(tenantId, res.data, {
      authMethod: PagbankConnectAuthMethod.SMS,
      label: `Conta ${dto.accountNumber}`,
      bankBranch: dto.bankBranch,
      accountNumber: dto.accountNumber,
    });

    await this.paymentsService.syncConnectAccountsToSplitReceivers(tenantId);

    return this.mapAccount(account);
  }

  async refreshAccountToken(tenantId: string, accountId: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'connect_token');
    const account = await this.connectRepo.findOne({ where: { id: accountId, tenantId } });
    if (!account?.refreshToken) {
      throw new BadRequestException('Conta sem refresh_token');
    }

    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const tokenData = await this.exchangeToken(
      settings.pagbankEnvironment,
      { grant_type: 'refresh_token', refresh_token: account.refreshToken },
      settings.pagbankConnectClientId!,
      settings.pagbankConnectClientSecret!,
    );

    account.accessToken = tokenData.access_token ?? account.accessToken;
    if (tokenData.refresh_token) account.refreshToken = tokenData.refresh_token;
    account.tokenExpiresAt = this.expiresAt(tokenData.expires_in);
    if (tokenData.scope) account.scopes = tokenData.scope;
    await this.connectRepo.save(account);

    return this.mapAccount(account);
  }

  async listAccounts(tenantId: string) {
    await this.paymentsService.syncConnectAccountsToSplitReceivers(tenantId);
    const rows = await this.connectRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    return rows.map((a) => this.mapAccount(a));
  }

  async syncSplitReceivers(tenantId: string) {
    return this.paymentsService.syncConnectAccountsToSplitReceivers(tenantId, {
      force: true,
    });
  }

  async deleteAccount(tenantId: string, accountId: string) {
    const row = await this.connectRepo.findOne({ where: { id: accountId, tenantId } });
    if (!row) throw new BadRequestException('Conta Connect não encontrada');
    await this.connectRepo.remove(row);
    return { deleted: true };
  }

  private async exchangeToken(
    environment: Parameters<typeof getConnectApiBaseUrl>[0],
    body: Record<string, string>,
    clientId: string,
    clientSecret: string,
  ): Promise<TokenResponse> {
    const base = getConnectApiBaseUrl(environment);
    const res = await this.postConnect(base, '/oauth2/token', body, clientId, clientSecret);
    if (!res.ok) {
      throw new BadGatewayException(this.formatErrors(res.data));
    }
    return res.data;
  }

  private async postConnect(
    baseUrl: string,
    path: string,
    body: Record<string, string>,
    clientId: string,
    clientSecret: string,
  ): Promise<{ ok: boolean; data: TokenResponse & Record<string, unknown> }> {
    const url = `${baseUrl}${path}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        X_CLIENT_ID: clientId,
        X_CLIENT_SECRET: clientSecret,
        Authorization: `Bearer ${clientId}`,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data: TokenResponse & Record<string, unknown>;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text } as TokenResponse & Record<string, unknown>;
    }
    return { ok: res.ok, data };
  }

  private async saveConnectedAccount(
    tenantId: string,
    tokenData: TokenResponse,
    meta: {
      authMethod: PagbankConnectAuthMethod;
      label?: string;
      bankBranch?: string;
      accountNumber?: string;
    },
  ) {
    if (!tokenData.access_token) {
      throw new BadGatewayException('PagBank não retornou access_token');
    }

    const existing = tokenData.account_id
      ? await this.connectRepo.findOne({
          where: { tenantId, pagbankAccountId: String(tokenData.account_id) },
        })
      : null;

    const row =
      existing ??
      this.connectRepo.create({
        tenantId,
        authMethod: meta.authMethod,
      });

    row.accessToken = tokenData.access_token;
    if (tokenData.refresh_token) row.refreshToken = tokenData.refresh_token;
    row.tokenExpiresAt = this.expiresAt(tokenData.expires_in);
    row.scopes = tokenData.scope ?? null;
    row.pagbankAccountId = tokenData.account_id ? String(tokenData.account_id) : row.pagbankAccountId;
    row.label = meta.label ?? row.label;
    row.bankBranch = meta.bankBranch ?? row.bankBranch;
    row.accountNumber = meta.accountNumber ?? row.accountNumber;
    row.authMethod = meta.authMethod;

    return this.connectRepo.save(row);
  }

  private expiresAt(expiresIn?: number): Date | null {
    if (!expiresIn) return null;
    return new Date(Date.now() + expiresIn * 1000);
  }

  private mapAccount(a: PagbankConnectAccount) {
    return {
      id: a.id,
      label: a.label,
      pagbankAccountId: a.pagbankAccountId,
      authMethod: a.authMethod,
      bankBranch: a.bankBranch,
      accountNumber: a.accountNumber,
      scopes: a.scopes,
      tokenExpiresAt: a.tokenExpiresAt,
      createdAt: a.createdAt,
    };
  }

  private formatErrors(data: Record<string, unknown>): string {
    const errors = data.error_messages as Array<{ description?: string }> | undefined;
    if (errors?.length) return errors.map((e) => e.description).join('; ');
    return (data.message as string) || 'Erro Connect PagBank';
  }
}
