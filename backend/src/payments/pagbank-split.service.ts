import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentsService } from './payments.service';
import { PagbankHttpClient } from './pagbank-http.client';
import { PagbankFlowGuard } from './pagbank-flow.guard';
import {
  buildPagbankSplitsPayload,
  extractPagbankSplitId,
  isPagbankSplitFlow,
  PagbankSplitBuildOptions,
} from './pagbank-split.builder';
import {
  PagbankTransaction,
  PagbankTransactionStatus,
} from './entities/pagbank-transaction.entity';
import { PagbankReleaseCustodyDto } from './dto/pagbank-split.dto';

@Injectable()
export class PagbankSplitService {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly http: PagbankHttpClient,
    private readonly flowGuard: PagbankFlowGuard,
    @InjectRepository(PagbankTransaction)
    private readonly txRepo: Repository<PagbankTransaction>,
  ) {}

  buildOptionsForFlow(
    flowId: string,
    settings: { pagbankCustodyEnabled: boolean },
  ): PagbankSplitBuildOptions {
    const splitPayFlows = new Set([
      'split_payment',
      'split_create_and_pay',
      'split_create_then_pay',
      'split_pix',
      'split_preauth_partial',
    ]);
    return {
      custody:
        flowId === 'split_custody' ||
        (settings.pagbankCustodyEnabled && splitPayFlows.has(flowId)),
      chargebackRecovery: flowId === 'split_chargeback_recovery',
      liableMcc: flowId === 'split_liable_mcc',
    };
  }

  async getSplitsPayloadForFlow(
    tenantId: string,
    flowId: string,
    extra?: Partial<PagbankSplitBuildOptions>,
  ) {
    if (!isPagbankSplitFlow(flowId)) return null;

    await this.assertSplitFlow(tenantId, flowId);

    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const receivers = await this.paymentsService.getSplitReceivers(tenantId);

    const options: PagbankSplitBuildOptions = {
      ...this.buildOptionsForFlow(flowId, settings),
      ...extra,
    };

    if (flowId === 'split_custody') {
      options.custody = true;
    }

    if (!options.custodyScheduled && settings.pagbankCustodyScheduledDefault) {
      options.custodyScheduled = settings.pagbankCustodyScheduledDefault;
    }

    return buildPagbankSplitsPayload(settings, receivers, options);
  }

  async assertSplitFlow(tenantId: string, flowId: string): Promise<void> {
    if (!isPagbankSplitFlow(flowId)) return;
    await this.flowGuard.assertFlowAllowed(tenantId, flowId);
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    if (!settings.pagbankSplitEnabled) {
      throw new BadRequestException('Divisão PagBank não está habilitada');
    }
  }

  async findTransaction(tenantId: string, transactionId: string) {
    const tx = await this.txRepo.findOne({ where: { id: transactionId, tenantId } });
    if (!tx) throw new NotFoundException('Transação PagBank não encontrada');
    return tx;
  }

  async persistSplitIdFromOrderData(tx: PagbankTransaction, orderData: Record<string, unknown>) {
    const splitId = extractPagbankSplitId(orderData);
    if (splitId) {
      tx.pagbankSplitId = splitId;
      await this.txRepo.save(tx);
    }
    return splitId;
  }

  /** GET /splits/{split_id} — consulta direta (sandbox ou operação manual). */
  async querySplitByPagbankId(tenantId: string, splitId: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'split_query');
    const normalized = splitId?.trim();
    if (!normalized) {
      throw new BadRequestException('split_id PagBank (SPLI_…) é obrigatório');
    }

    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'GET',
      `/splits/${normalized}`,
    );

    if (!res.ok) {
      throw new BadGatewayException(this.formatApiError(res.data));
    }

    return {
      pagbankSplitId: normalized,
      split: res.data,
    };
  }

  /** GET /splits/{split_id} — consulta divisão (split_query). */
  async querySplit(tenantId: string, transactionId: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'split_query');
    const tx = await this.findTransaction(tenantId, transactionId);

    let splitId = tx.pagbankSplitId;
    if (!splitId && tx.pagbankOrderId) {
      const settings = await this.paymentsService.getOrCreateSettings(tenantId);
      const orderRes = await this.http.request<Record<string, unknown>>(
        settings,
        'GET',
        `/orders/${tx.pagbankOrderId}`,
      );
      if (orderRes.ok) {
        splitId = extractPagbankSplitId(orderRes.data);
        if (splitId) {
          tx.pagbankSplitId = splitId;
          await this.txRepo.save(tx);
        }
      }
    }

    if (!splitId) {
      throw new BadRequestException(
        'Transação sem split_id PagBank. Aguarde confirmação do pagamento ou informe split_id manualmente.',
      );
    }

    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'GET',
      `/splits/${splitId}`,
    );

    if (!res.ok) {
      throw new BadGatewayException(this.formatApiError(res.data));
    }

    return {
      transactionId: tx.id,
      pagbankSplitId: splitId,
      pagbankOrderId: tx.pagbankOrderId,
      split: res.data,
    };
  }

  /** POST /splits/{split_id}/custody/release */
  async releaseCustody(
    tenantId: string,
    transactionId: string,
    dto: PagbankReleaseCustodyDto,
  ) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'split_release_custody');
    const tx = await this.findTransaction(tenantId, transactionId);

    let splitId = tx.pagbankSplitId;
    if (!splitId) {
      const q = await this.querySplit(tenantId, transactionId);
      splitId = q.pagbankSplitId;
    }

    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const receivers = (await this.paymentsService.getSplitReceivers(tenantId)).filter(
      (r) => r.active,
    );

    const accountIds =
      dto.receiverAccountIds?.length ?
        dto.receiverAccountIds
      : receivers.map((r) => r.pagbankAccountId);

    if (!accountIds.length) {
      throw new BadRequestException('Informe receiverAccountIds ou configure recebedores ativos');
    }

    const body = {
      receivers: accountIds.map((id) => ({ account: { id: id.trim() } })),
    };

    const res = await this.http.request(
      settings,
      'POST',
      `/splits/${splitId}/custody/release`,
      body,
    );

    if (!res.ok) {
      throw new BadGatewayException(this.formatApiError(res.data));
    }

    tx.rawLastEvent = { custodyRelease: body, response: res.data };
    await this.txRepo.save(tx);

    return {
      transactionId: tx.id,
      pagbankSplitId: splitId,
      releasedReceivers: accountIds,
      ok: true,
    };
  }

  /** Cancelamento com split (split_cancel) — usa charge_id da transação. */
  async cancelSplitPayment(tenantId: string, transactionId: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'split_cancel');
    const tx = await this.findTransaction(tenantId, transactionId);
    if (!tx.chargeId) {
      throw new BadRequestException('Transação sem charge_id para cancelar');
    }

    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const res = await this.http.request(
      settings,
      'POST',
      `/charges/${tx.chargeId}/cancel`,
      {},
    );

    if (!res.ok) {
      throw new BadGatewayException(this.formatApiError(res.data));
    }

    tx.status = PagbankTransactionStatus.CANCELED;
    tx.rawLastEvent = res.data;
    await this.txRepo.save(tx);

    return {
      transactionId: tx.id,
      chargeId: tx.chargeId,
      status: tx.status,
      raw: res.data,
    };
  }

  private formatApiError(data: Record<string, unknown>): string {
    const errors = data.error_messages as Array<{ description?: string }> | undefined;
    if (errors?.length) {
      return errors.map((e) => e.description ?? 'Erro').join('; ');
    }
    return (data.message as string) || 'Erro na API PagBank (split)';
  }
}
