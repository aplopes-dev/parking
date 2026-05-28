import { BadRequestException } from '@nestjs/common';
import {
  PagbankSplitMethod,
  PaymentSettings,
} from './entities/payment-settings.entity';
import {
  PaymentSplitReceiver,
  PaymentSplitReceiverRole,
} from './entities/payment-split-receiver.entity';

export type PagbankSplitReceiverConfig = {
  custody?: {
    apply: boolean;
    release?: { scheduled?: string | null };
  };
  chargeback?: {
    charge_transfer: { percentage: number };
  };
  liable?: boolean;
};

export type PagbankSplitsPayload = {
  method: 'FIXED' | 'PERCENTAGE';
  receivers: Array<{
    account: { id: string };
    amount: { value: string };
    reason?: string;
    configurations?: PagbankSplitReceiverConfig;
  }>;
};

export type PagbankSplitBuildOptions = {
  /** Fluxo split_custody ou flag global de custódia. */
  custody?: boolean;
  /** ISO 8601 com fuso — liberação agendada da custódia (ex.: 2025-12-01T12:00:00-03:00). */
  custodyScheduled?: string | null;
  /** split_chargeback_recovery — repasse 100% para recebedor `isLiable`. */
  chargebackRecovery?: boolean;
  /** split_liable_mcc — designa liable na bandeira (cartão crédito). */
  liableMcc?: boolean;
};

const ALL_SPLIT_FLOWS = new Set([
  'split_payment',
  'split_create_then_pay',
  'split_create_and_pay',
  'split_query',
  'split_custody',
  'split_pix',
  'split_preauth_partial',
  'split_release_custody',
  'split_cancel',
  'split_chargeback_recovery',
  'split_liable_mcc',
]);

export function isPagbankSplitFlow(flowId: string): boolean {
  return ALL_SPLIT_FLOWS.has(flowId) || flowId.startsWith('split_');
}

export function buildPagbankSplitsPayload(
  settings: PaymentSettings,
  receivers: PaymentSplitReceiver[],
  options?: PagbankSplitBuildOptions,
): PagbankSplitsPayload | null {
  if (!settings.pagbankSplitEnabled) return null;

  const masterId = settings.pagbankMasterAccountId?.trim();
  if (!masterId) {
    throw new BadRequestException(
      'Conta PagBank do adquirente (master) não configurada. Informe o ID da conta (ACCO_…) na aba Divisão (split) ou desative o fluxo split_payment em Fluxos PagBank.',
    );
  }

  const active = receivers
    .filter((r) => r.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const method = settings.pagbankSplitMethod;
  const payloadReceivers: PagbankSplitsPayload['receivers'] = [];

  const masterReceiver = active.find((r) => r.role === PaymentSplitReceiverRole.MASTER);
  const secondaries = active.filter((r) => r.role === PaymentSplitReceiverRole.SECONDARY);

  if (method === PagbankSplitMethod.PERCENTAGE) {
    const masterPct = masterReceiver ? Number(masterReceiver.amountValue) : 0;
    const secondarySum = secondaries.reduce((s, r) => s + Number(r.amountValue), 0);
    const total = masterPct + secondarySum;
    if (total > 100.01) {
      throw new BadRequestException(
        `Soma dos percentuais (${total.toFixed(2)}%) não pode exceder 100%`,
      );
    }
  }

  const useCustody = options?.custody ?? settings.pagbankCustodyEnabled;
  const useChargeback = options?.chargebackRecovery ?? false;
  const useLiable = options?.liableMcc ?? false;

  const chargebackResponsibleId = useChargeback
    ? active.find((r) => r.isLiable)?.pagbankAccountId ??
      [...active].sort((a, b) => Number(b.amountValue) - Number(a.amountValue))[0]
        ?.pagbankAccountId
    : null;

  if (useChargeback && !chargebackResponsibleId) {
    throw new BadRequestException(
      'Recuperação de chargeback exige um recebedor marcado como liable ou com maior valor',
    );
  }

  let liableAssigned = false;

  const pushReceiver = (receiver: PaymentSplitReceiver, value: number) => {
    const centsOrPct =
      method === PagbankSplitMethod.FIXED ? Math.round(value) : Number(value.toFixed(2));

    const configurations: PagbankSplitReceiverConfig = {};

    if (useChargeback) {
      const isResponsible =
        receiver.pagbankAccountId === chargebackResponsibleId;
      configurations.chargeback = {
        charge_transfer: { percentage: isResponsible ? 100 : 0 },
      };
    }

    if (useCustody) {
      const applyCustody = receiver.role === PaymentSplitReceiverRole.SECONDARY;
      configurations.custody = applyCustody
        ? {
            apply: true,
            ...(options?.custodyScheduled
              ? { release: { scheduled: options.custodyScheduled } }
              : {}),
          }
        : { apply: false };
    }

    if (useLiable) {
      const isLiableReceiver = receiver.isLiable;
      if (isLiableReceiver) {
        if (liableAssigned) {
          throw new BadRequestException('Apenas um recebedor pode ser liable (MCC)');
        }
        liableAssigned = true;
        configurations.liable = true;
      } else {
        configurations.liable = false;
      }
    }

    const entry: PagbankSplitsPayload['receivers'][0] = {
      account: { id: receiver.pagbankAccountId },
      amount: { value: String(centsOrPct) },
      reason: receiver.label.slice(0, 80),
    };
    if (Object.keys(configurations).length) {
      entry.configurations = configurations;
    }
    payloadReceivers.push(entry);
  };

  if (masterReceiver) {
    pushReceiver(masterReceiver, Number(masterReceiver.amountValue));
  } else {
    const pseudo = {
      pagbankAccountId: masterId,
      label: 'Adquirente',
      role: PaymentSplitReceiverRole.MASTER,
      amountValue: '0',
      isLiable: !useLiable,
      active: true,
    } as PaymentSplitReceiver;
    pushReceiver(pseudo, 0);
  }

  for (const r of secondaries) {
    pushReceiver(r, Number(r.amountValue));
  }

  if (payloadReceivers.length < 2 && method === PagbankSplitMethod.PERCENTAGE) {
    throw new BadRequestException(
      'Divisão PagBank exige ao menos um recebedor secundário além do adquirente',
    );
  }

  if (useLiable && !liableAssigned) {
    throw new BadRequestException(
      'Fluxo liable MCC exige um recebedor marcado como liable na configuração Split',
    );
  }

  return {
    method: method as 'FIXED' | 'PERCENTAGE',
    receivers: payloadReceivers,
  };
}

/** Extrai SPLI_... da resposta de pedido, cobrança ou QR PIX com split. */
export function extractPagbankSplitId(data: Record<string, unknown>): string | null {
  const charges = data.charges as Array<Record<string, unknown>> | undefined;
  const charge = charges?.[0];
  const chargeSplits = charge?.splits as { id?: string } | undefined;
  if (chargeSplits?.id) return String(chargeSplits.id);

  const qrCodes = data.qr_codes as Array<Record<string, unknown>> | undefined;
  const qrSplits = qrCodes?.[0]?.splits as { id?: string } | undefined;
  if (qrSplits?.id) return String(qrSplits.id);

  const topSplits = data.splits as { id?: string } | undefined;
  if (topSplits?.id) return String(topSplits.id);

  return null;
}
