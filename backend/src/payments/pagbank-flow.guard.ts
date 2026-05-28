import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  mergePagbankFlowsConfig,
  PAGBANK_IMPLEMENTED_IN_CODE,
  PagbankFlowsConfigMap,
} from './pagbank-flows.catalog';
import { isPagbankSplitFlow } from './pagbank-split.builder';

@Injectable()
export class PagbankFlowGuard {
  constructor(private readonly paymentsService: PaymentsService) {}

  async assertFlowAllowed(tenantId: string, flowId: string): Promise<void> {
    if (!PAGBANK_IMPLEMENTED_IN_CODE.has(flowId)) {
      throw new BadRequestException(
        `Fluxo PagBank "${flowId}" ainda não está implementado no backend`,
      );
    }

    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    if (!settings.pagbankToken?.trim()) {
      throw new BadRequestException('Configure o token PagBank em Pagamentos → Configuração');
    }

    const flows = mergePagbankFlowsConfig(
      settings.pagbankFlowsConfig as PagbankFlowsConfigMap,
    );
    const cfg = flows[flowId];
    if (!cfg?.enabled) {
      throw new BadRequestException(
        `Fluxo "${flowId}" está desativado. Ative em Pagamentos → Fluxos.`,
      );
    }
  }

  /** Fluxos de split reutilizam a flag split_payment ou o próprio id. */
  resolveSplitFlowId(requestedFlowId: string): string {
    if (
      requestedFlowId === 'split_create_and_pay' ||
      requestedFlowId === 'split_create_then_pay' ||
      requestedFlowId === 'split_query'
    ) {
      return requestedFlowId;
    }
    return 'split_payment';
  }

  async assertSplitIfNeeded(tenantId: string, flowId: string): Promise<void> {
    if (!isPagbankSplitFlow(flowId)) return;

    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    if (!settings.pagbankSplitEnabled) {
      throw new BadRequestException('Divisão PagBank não está habilitada');
    }
  }
}
