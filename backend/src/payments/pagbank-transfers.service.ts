import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentsService } from './payments.service';
import { PagbankHttpClient } from './pagbank-http.client';
import { PagbankFlowGuard } from './pagbank-flow.guard';
import { getPagbankSecureBaseUrl } from './pagbank-sdk.config';
import {
  assertPagbankOk,
  pagbankIdempotencyKey,
} from './pagbank-api.util';
import { PagbankTransfer } from './entities/pagbank-transfer.entity';
import { PagbankCreateTransferDto } from './dto/pagbank-transfer.dto';

@Injectable()
export class PagbankTransfersService {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly http: PagbankHttpClient,
    private readonly flowGuard: PagbankFlowGuard,
    @InjectRepository(PagbankTransfer)
    private readonly transferRepo: Repository<PagbankTransfer>,
  ) {}

  async createTransfer(tenantId: string, dto: PagbankCreateTransferDto) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'transfer_balance');
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);

    const notify =
      dto.notificationUrl?.trim() || settings.pagbankNotificationUrl?.trim();
    if (!notify) {
      throw new BadRequestException(
        'Informe notificationUrl ou configure pagbank_notification_url',
      );
    }

    const instrument: Record<string, unknown> = { type: dto.instrumentType };
    if (dto.instrumentType === 'P2P') {
      if (!dto.p2p?.accountId && !(dto.p2p?.bankBranch && dto.p2p?.accountNumber)) {
        throw new BadRequestException(
          'Transferência P2P: informe accountId ou agência e conta',
        );
      }
      instrument.p2p = {
        account_id: dto.p2p.accountId,
        bank_branch: dto.p2p.bankBranch,
        account_number: dto.p2p.accountNumber,
      };
    } else {
      if (!dto.pix?.key) {
        throw new BadRequestException('Transferência PIX: informe a chave pix');
      }
      instrument.pix = {
        key: dto.pix.key,
        name: dto.pix.name,
        tax_id: dto.pix.taxId?.replace(/\D/g, ''),
      };
    }

    const payload: Record<string, unknown> = {
      amount: { value: dto.amountCents, currency: 'BRL' },
      instrument,
      notification_urls: [notify],
    };
    if (dto.description) payload.description = dto.description;
    if (dto.referenceId) payload.reference_id = dto.referenceId;

    const base = getPagbankSecureBaseUrl(settings.pagbankEnvironment);
    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'POST',
      '/transfers',
      payload,
      {
        baseUrl: base,
        extraHeaders: { 'x-idempotency-key': pagbankIdempotencyKey() },
      },
    );
    const data = assertPagbankOk(res, 'Erro ao criar transferência');

    const row = await this.transferRepo.save(
      this.transferRepo.create({
        tenantId,
        pagbankTransferId: data.id ? String(data.id) : null,
        referenceId: dto.referenceId ?? null,
        amountCents: dto.amountCents,
        status: data.status ? String(data.status) : null,
        instrumentType: dto.instrumentType,
        rawCreate: data,
      }),
    );

    return { local: this.mapTransfer(row), pagbank: data };
  }

  async listTransfers(tenantId: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'transfer_balance');
    const rows = await this.transferRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    return rows.map((t) => this.mapTransfer(t));
  }

  async getTransfer(tenantId: string, localId: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'transfer_balance');
    const local = await this.findLocal(tenantId, localId);
    if (!local.pagbankTransferId) {
      return { local: this.mapTransfer(local), pagbank: local.rawCreate };
    }

    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const base = getPagbankSecureBaseUrl(settings.pagbankEnvironment);
    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'GET',
      `/transfers/${local.pagbankTransferId}`,
      undefined,
      { baseUrl: base },
    );
    const data = assertPagbankOk(res);
    local.status = data.status ? String(data.status) : local.status;
    local.rawCreate = data;
    await this.transferRepo.save(local);
    return { local: this.mapTransfer(local), pagbank: data };
  }

  async queryByTransactionCode(tenantId: string, transactionCode: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'transfer_balance');
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const base = getPagbankSecureBaseUrl(settings.pagbankEnvironment);
    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'GET',
      `/transfers?transaction_code=${encodeURIComponent(transactionCode)}`,
      undefined,
      { baseUrl: base },
    );
    return assertPagbankOk(res);
  }

  private async findLocal(tenantId: string, id: string) {
    const row = await this.transferRepo.findOne({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Transferência não encontrada');
    return row;
  }

  private mapTransfer(t: PagbankTransfer) {
    return {
      id: t.id,
      pagbankTransferId: t.pagbankTransferId,
      referenceId: t.referenceId,
      amountCents: t.amountCents,
      status: t.status,
      instrumentType: t.instrumentType,
      createdAt: t.createdAt,
    };
  }
}
