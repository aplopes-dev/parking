import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentsService } from './payments.service';
import { PagbankHttpClient } from './pagbank-http.client';
import { PagbankFlowGuard } from './pagbank-flow.guard';
import { assertPagbankOk } from './pagbank-api.util';
import { PagbankRegisteredAccount } from './entities/pagbank-registered-account.entity';
import { PagbankRegisterAccountDto } from './dto/pagbank-registration.dto';

@Injectable()
export class PagbankRegistrationService {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly http: PagbankHttpClient,
    private readonly flowGuard: PagbankFlowGuard,
    @InjectRepository(PagbankRegisteredAccount)
    private readonly accountRepo: Repository<PagbankRegisteredAccount>,
  ) {}

  private connectHeaders(settings: Awaited<ReturnType<PaymentsService['getOrCreateSettings']>>) {
    const clientId = settings.pagbankConnectClientId?.trim();
    const secret = settings.pagbankConnectClientSecret?.trim();
    if (!clientId || !secret) {
      throw new BadRequestException(
        'Configure Client ID e Client Secret (Connect) para API de Cadastro',
      );
    }
    return {
      'X_CLIENT_ID': clientId,
      'X_CLIENT_SECRET': secret,
    };
  }

  async registerAccount(tenantId: string, dto: PagbankRegisterAccountDto) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'account_register');
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);

    if (
      (dto.type === 'SELLER' || dto.type === 'ENTERPRISE') &&
      !dto.businessCategory?.trim()
    ) {
      throw new BadRequestException('businessCategory é obrigatório para SELLER/ENTERPRISE');
    }

    const payload: Record<string, unknown> = dto.payload ?? {
      type: dto.type,
      email: dto.email,
      person: dto.person,
      tos_acceptance: dto.tosAcceptance,
    };
    if (dto.businessCategory) payload.business_category = dto.businessCategory;
    if (dto.company) payload.company = dto.company;

    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'POST',
      '/accounts',
      payload,
      { extraHeaders: this.connectHeaders(settings) },
    );
    const data = assertPagbankOk(res, 'Erro ao cadastrar conta PagBank');

    const row = await this.accountRepo.save(
      this.accountRepo.create({
        tenantId,
        pagbankAccountId: data.id ? String(data.id) : null,
        accountType: dto.type,
        email: dto.email,
        status: data.status ? String(data.status) : null,
        rawCreate: data,
      }),
    );

    return { local: this.mapAccount(row), pagbank: data };
  }

  async listRegisteredAccounts(tenantId: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'account_register');
    const rows = await this.accountRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    return rows.map((a) => this.mapAccount(a));
  }

  async getRegisteredAccount(tenantId: string, localId: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'account_register');
    const local = await this.findLocal(tenantId, localId);
    if (!local.pagbankAccountId) {
      return { local: this.mapAccount(local), pagbank: local.rawCreate };
    }

    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'GET',
      `/accounts/${local.pagbankAccountId}`,
      undefined,
      { extraHeaders: this.connectHeaders(settings) },
    );
    const data = assertPagbankOk(res);
    local.status = data.status ? String(data.status) : local.status;
    local.rawCreate = data;
    await this.accountRepo.save(local);
    return { local: this.mapAccount(local), pagbank: data };
  }

  private async findLocal(tenantId: string, id: string) {
    const row = await this.accountRepo.findOne({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Conta cadastrada não encontrada');
    return row;
  }

  private mapAccount(a: PagbankRegisteredAccount) {
    return {
      id: a.id,
      pagbankAccountId: a.pagbankAccountId,
      accountType: a.accountType,
      email: a.email,
      status: a.status,
      createdAt: a.createdAt,
    };
  }
}
