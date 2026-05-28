import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentSettings, PagbankSplitMethod } from './entities/payment-settings.entity';
import {
  PaymentSplitReceiver,
  PaymentSplitReceiverRole,
} from './entities/payment-split-receiver.entity';
import { PagbankConnectAccount } from './entities/pagbank-connect-account.entity';
import { UpdatePagbankSplitSettingsDto } from './dto/payment-settings.dto';
import { UpdatePaymentSettingsDto } from './dto/payment-settings-full.dto';
import {
  buildPagbankSplitsPayload,
  PagbankSplitBuildOptions,
} from './pagbank-split.builder';
import { mapPaymentSettingsResponse } from './payments.mapper';
import { preparePagbankToken } from './pagbank-token.util';
import {
  mergePagbankFlowsConfig,
  PagbankFlowsConfigMap,
} from './pagbank-flows.catalog';

export type PagbankSplitSettingsResponse = {
  pagbankSplitEnabled: boolean;
  pagbankEnvironment: string;
  pagbankTokenSet: boolean;
  pagbankTokenPreview: string | null;
  pagbankMasterAccountId: string | null;
  pagbankSplitMethod: string;
  pagbankTransferInterest: boolean;
  pagbankTransferShipping: boolean;
  pagbankCustodyEnabled: boolean;
  notes: string | null;
  receivers: Array<{
    id: string;
    label: string;
    pagbankAccountId: string;
    role: string;
    amountValue: number;
    isLiable: boolean;
    active: boolean;
    sortOrder: number;
  }>;
  percentageTotal: number;
  splitsPreview: ReturnType<typeof buildPagbankSplitsPayload>;
};

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentSettings)
    private readonly settingsRepo: Repository<PaymentSettings>,
    @InjectRepository(PaymentSplitReceiver)
    private readonly receiversRepo: Repository<PaymentSplitReceiver>,
    @InjectRepository(PagbankConnectAccount)
    private readonly connectRepo: Repository<PagbankConnectAccount>,
  ) {}

  async getOrCreateSettings(tenantId: string): Promise<PaymentSettings> {
    let settings = await this.settingsRepo.findOne({ where: { tenantId } });
    if (!settings) {
      settings = await this.settingsRepo.save(this.settingsRepo.create({ tenantId }));
    }
    return settings;
  }

  private maskToken(token: string | null): { set: boolean; preview: string | null } {
    if (!token?.trim()) return { set: false, preview: null };
    const t = token.trim();
    if (t.length <= 8) return { set: true, preview: '••••••••' };
    return { set: true, preview: `••••${t.slice(-4)}` };
  }

  async getPaymentSettings(tenantId: string) {
    const settings = await this.getOrCreateSettings(tenantId);
    const receivers = await this.receiversRepo.find({
      where: { tenantId },
      order: { sortOrder: 'ASC', label: 'ASC' },
    });
    return mapPaymentSettingsResponse(settings, receivers);
  }

  async getPagbankSplitConfig(tenantId: string): Promise<PagbankSplitSettingsResponse> {
    const full = await this.getPaymentSettings(tenantId);
    const split = full.pagbankSplit;
    return {
      pagbankSplitEnabled: split.pagbankSplitEnabled,
      pagbankEnvironment: full.general.pagbankEnvironment,
      pagbankTokenSet: full.general.pagbankTokenSet,
      pagbankTokenPreview: full.general.pagbankTokenPreview,
      pagbankMasterAccountId: split.pagbankMasterAccountId,
      pagbankSplitMethod: split.pagbankSplitMethod,
      pagbankTransferInterest: split.pagbankTransferInterest,
      pagbankTransferShipping: split.pagbankTransferShipping,
      pagbankCustodyEnabled: split.pagbankCustodyEnabled,
      notes: full.general.notes,
      receivers: split.receivers,
      percentageTotal: split.percentageTotal,
      splitsPreview: split.splitsPreview,
    };
  }

  async updatePaymentSettings(tenantId: string, dto: UpdatePaymentSettingsDto) {
    const settings = await this.getOrCreateSettings(tenantId);

    if (dto.pagbankEnvironment !== undefined) settings.pagbankEnvironment = dto.pagbankEnvironment;
    if (dto.pagbankToken !== undefined) {
      const trimmed = dto.pagbankToken.trim();
      if (trimmed) settings.pagbankToken = preparePagbankToken(trimmed);
    }
    if (dto.pagbankMasterAccountId !== undefined) {
      settings.pagbankMasterAccountId = dto.pagbankMasterAccountId?.trim() || null;
    }
    if (dto.pagbankPublicKey !== undefined) {
      settings.pagbankPublicKey = dto.pagbankPublicKey?.trim() || null;
    }
    if (dto.pagbankConnectClientId !== undefined) {
      settings.pagbankConnectClientId = dto.pagbankConnectClientId?.trim() || null;
    }
    if (dto.pagbankConnectClientSecret !== undefined) {
      const trimmed = dto.pagbankConnectClientSecret.trim();
      if (trimmed) settings.pagbankConnectClientSecret = trimmed;
    }
    if (dto.pagbankNotificationUrl !== undefined) {
      settings.pagbankNotificationUrl = dto.pagbankNotificationUrl?.trim() || null;
    }
    if (dto.pagbankOrderSoftDescriptor !== undefined) {
      settings.pagbankOrderSoftDescriptor = dto.pagbankOrderSoftDescriptor?.trim() || null;
    }
    if (dto.pagbankOrderMcc !== undefined) {
      settings.pagbankOrderMcc = dto.pagbankOrderMcc?.trim() || null;
    }
    if (dto.pagbankConnectRedirectUri !== undefined) {
      settings.pagbankConnectRedirectUri = dto.pagbankConnectRedirectUri?.trim() || null;
    }
    if (dto.pagbankConnectAutoSyncSplit !== undefined) {
      settings.pagbankConnectAutoSyncSplit = dto.pagbankConnectAutoSyncSplit;
    }
    if (dto.pagbankConnectSplitPercentEach !== undefined) {
      settings.pagbankConnectSplitPercentEach =
        dto.pagbankConnectSplitPercentEach == null
          ? null
          : Number(dto.pagbankConnectSplitPercentEach).toFixed(4);
    }
    if (dto.pagbankCheckoutReturnUrl !== undefined) {
      settings.pagbankCheckoutReturnUrl = dto.pagbankCheckoutReturnUrl?.trim() || null;
    }
    if (dto.pagbankCheckoutSuccessUrl !== undefined) {
      settings.pagbankCheckoutSuccessUrl = dto.pagbankCheckoutSuccessUrl?.trim() || null;
    }
    if (dto.pagbankCustodyScheduledDefault !== undefined) {
      settings.pagbankCustodyScheduledDefault =
        dto.pagbankCustodyScheduledDefault?.trim() || null;
    }
    if (dto.notes !== undefined) settings.notes = dto.notes?.trim() || null;

    if (dto.pagbankFlows !== undefined) {
      const current = mergePagbankFlowsConfig(
        settings.pagbankFlowsConfig as PagbankFlowsConfigMap,
      );
      for (const [flowId, item] of Object.entries(dto.pagbankFlows)) {
        if (current[flowId]) {
          current[flowId] = {
            enabled: item.enabled,
            options: { ...current[flowId].options, ...item.options },
          };
        }
      }
      settings.pagbankFlowsConfig = current;
      const splitFlow = current.split_payment;
      if (splitFlow) settings.pagbankSplitEnabled = splitFlow.enabled;
    }

    await this.settingsRepo.save(settings);

    if (dto.pagbankSplit) {
      await this.applyPagbankSplitUpdate(tenantId, dto.pagbankSplit);
    }

    return this.getPaymentSettings(tenantId);
  }

  private async applyPagbankSplitUpdate(
    tenantId: string,
    dto: UpdatePagbankSplitSettingsDto,
  ): Promise<void> {
    const settings = await this.getOrCreateSettings(tenantId);
    const method = dto.pagbankSplitMethod ?? settings.pagbankSplitMethod;
    this.validateReceivers(dto, method);

    if (dto.pagbankEnvironment !== undefined) settings.pagbankEnvironment = dto.pagbankEnvironment;
    if (dto.pagbankToken !== undefined) {
      const trimmed = dto.pagbankToken.trim();
      if (trimmed) settings.pagbankToken = preparePagbankToken(trimmed);
    }
    if (dto.notes !== undefined) settings.notes = dto.notes?.trim() || null;

    if (dto.pagbankSplitEnabled !== undefined) {
      settings.pagbankSplitEnabled = dto.pagbankSplitEnabled;
      const flows = mergePagbankFlowsConfig(
        settings.pagbankFlowsConfig as PagbankFlowsConfigMap,
      );
      if (flows.split_payment) flows.split_payment.enabled = dto.pagbankSplitEnabled;
      settings.pagbankFlowsConfig = flows;
    }
    if (dto.pagbankSplitMethod !== undefined) settings.pagbankSplitMethod = dto.pagbankSplitMethod;
    if (dto.pagbankTransferInterest !== undefined) {
      settings.pagbankTransferInterest = dto.pagbankTransferInterest;
    }
    if (dto.pagbankTransferShipping !== undefined) {
      settings.pagbankTransferShipping = dto.pagbankTransferShipping;
    }
    if (dto.pagbankCustodyEnabled !== undefined) {
      settings.pagbankCustodyEnabled = dto.pagbankCustodyEnabled;
    }
    if (dto.pagbankCustodyScheduledDefault !== undefined) {
      settings.pagbankCustodyScheduledDefault =
        dto.pagbankCustodyScheduledDefault?.trim() || null;
    }
    if (dto.pagbankConnectRedirectUri !== undefined) {
      settings.pagbankConnectRedirectUri = dto.pagbankConnectRedirectUri?.trim() || null;
    }
    if (dto.pagbankConnectAutoSyncSplit !== undefined) {
      settings.pagbankConnectAutoSyncSplit = dto.pagbankConnectAutoSyncSplit;
    }
    if (dto.pagbankConnectSplitPercentEach !== undefined) {
      settings.pagbankConnectSplitPercentEach =
        dto.pagbankConnectSplitPercentEach == null
          ? null
          : Number(dto.pagbankConnectSplitPercentEach).toFixed(4);
    }
    if (dto.pagbankCheckoutReturnUrl !== undefined) {
      settings.pagbankCheckoutReturnUrl = dto.pagbankCheckoutReturnUrl?.trim() || null;
    }
    if (dto.pagbankCheckoutSuccessUrl !== undefined) {
      settings.pagbankCheckoutSuccessUrl = dto.pagbankCheckoutSuccessUrl?.trim() || null;
    }
    if (dto.pagbankMasterAccountId !== undefined) {
      settings.pagbankMasterAccountId = dto.pagbankMasterAccountId?.trim() || null;
    }

    await this.settingsRepo.save(settings);

    if (dto.receivers !== undefined) {
      await this.receiversRepo.delete({ tenantId });
      if (dto.receivers.length) {
        const rows = dto.receivers.map((r, i) =>
          this.receiversRepo.create({
            tenantId,
            label: r.label.trim(),
            pagbankAccountId: r.pagbankAccountId.trim(),
            connectAccountId: r.connectAccountId ?? null,
            role: r.role,
            amountValue: r.amountValue.toFixed(4),
            isLiable: r.isLiable ?? false,
            active: r.active ?? true,
            sortOrder: r.sortOrder ?? i,
          }),
        );
        await this.receiversRepo.save(rows);
      }
    }

    if (settings.pagbankSplitEnabled) {
      const masterId = settings.pagbankMasterAccountId?.trim();
      if (!masterId) {
        return;
      }
      const receivers = await this.receiversRepo.find({ where: { tenantId } });
      buildPagbankSplitsPayload(settings, receivers);
    }
  }

  private validateReceivers(
    dto: UpdatePagbankSplitSettingsDto,
    method: string,
  ): void {
    if (!dto.receivers?.length) return;

    const masters = dto.receivers.filter((r) => r.role === PaymentSplitReceiverRole.MASTER);
    if (masters.length > 1) {
      throw new BadRequestException('Apenas um recebedor pode ser marcado como adquirente (master)');
    }

    if (method === 'PERCENTAGE') {
      const total = dto.receivers
        .filter((r) => r.active !== false)
        .reduce((s, r) => s + Number(r.amountValue), 0);
      if (total > 100.01) {
        throw new BadRequestException(
          `Soma dos percentuais (${total.toFixed(2)}%) não pode exceder 100%`,
        );
      }
    }
  }

  async updatePagbankSplit(
    tenantId: string,
    dto: UpdatePagbankSplitSettingsDto,
  ): Promise<PagbankSplitSettingsResponse> {
    await this.applyPagbankSplitUpdate(tenantId, dto);
    return this.getPagbankSplitConfig(tenantId);
  }

  async getSplitReceivers(tenantId: string): Promise<PaymentSplitReceiver[]> {
    await this.syncConnectAccountsToSplitReceivers(tenantId);
    return this.receiversRepo.find({
      where: { tenantId },
      order: { sortOrder: 'ASC' },
    });
  }

  /**
   * Vincula contas PagBank Connect como recebedores secundários no split.
   * Respeita `pagbankConnectAutoSyncSplit` salvo nas configurações, salvo `force: true`.
   */
  async syncConnectAccountsToSplitReceivers(
    tenantId: string,
    opts?: { force?: boolean },
  ): Promise<{ created: number; updated: number; skipped?: boolean }> {
    const settings = await this.getOrCreateSettings(tenantId);
    if (!opts?.force && !settings.pagbankConnectAutoSyncSplit) {
      return { created: 0, updated: 0, skipped: true };
    }
    if (!settings.pagbankSplitEnabled) {
      return { created: 0, updated: 0, skipped: true };
    }

    const masterId = settings.pagbankMasterAccountId?.trim();
    const connectAccounts = await this.connectRepo.find({
      where: { tenantId },
      order: { createdAt: 'ASC' },
    });

    const eligible = connectAccounts.filter((a) => {
      const accId = a.pagbankAccountId?.trim();
      return accId && accId !== masterId;
    });

    let receivers = await this.receiversRepo.find({
      where: { tenantId },
      order: { sortOrder: 'ASC' },
    });

    let created = 0;
    let updated = 0;
    const maxSort = receivers.reduce((m, r) => Math.max(m, r.sortOrder), -1);
    let nextSort = maxSort + 1;

    const fixedEach =
      settings.pagbankConnectSplitPercentEach != null
        ? Number(settings.pagbankConnectSplitPercentEach)
        : null;

    for (const acc of eligible) {
      const accId = acc.pagbankAccountId!.trim();
      let row = receivers.find(
        (r) => r.connectAccountId === acc.id || r.pagbankAccountId === accId,
      );

      if (!row) {
        row = this.receiversRepo.create({
          tenantId,
          label: acc.label?.trim() || `Connect ${acc.accountNumber ?? accId.slice(-6)}`,
          pagbankAccountId: accId,
          connectAccountId: acc.id,
          role: PaymentSplitReceiverRole.SECONDARY,
          amountValue: '0',
          isLiable: false,
          active: true,
          sortOrder: nextSort++,
        });
        receivers.push(row);
        created++;
      } else {
        row.pagbankAccountId = accId;
        row.connectAccountId = acc.id;
        row.label = acc.label?.trim() || row.label;
        row.active = true;
        if (row.role !== PaymentSplitReceiverRole.MASTER) {
          row.role = PaymentSplitReceiverRole.SECONDARY;
        }
        updated++;
      }
    }

    if (settings.pagbankSplitMethod === PagbankSplitMethod.PERCENTAGE) {
      const active = receivers.filter((r) => r.active);
      const manualSecondarySum = active
        .filter((r) => r.role === PaymentSplitReceiverRole.SECONDARY && !r.connectAccountId)
        .reduce((s, r) => s + Number(r.amountValue), 0);
      const masterPct = active
        .filter((r) => r.role === PaymentSplitReceiverRole.MASTER)
        .reduce((s, r) => s + Number(r.amountValue), 0);

      const connectRows = active.filter((r) => r.connectAccountId);
      if (connectRows.length) {
        let each = fixedEach;
        if (each == null || Number.isNaN(each)) {
          const remaining = 100 - masterPct - manualSecondarySum;
          each =
            remaining > 0 && connectRows.length
              ? Math.floor((remaining / connectRows.length) * 10000) / 10000
              : 0;
        }
        for (const r of connectRows) {
          r.amountValue = Math.max(0, each).toFixed(4);
        }
      }
    }

    if (created || updated) {
      await this.receiversRepo.save(receivers);
    }

    return { created, updated };
  }

  /** Usado ao criar/pagar pedidos na API PagBank Orders. */
  async getPagbankSplitsForOrder(
    tenantId: string,
    options?: PagbankSplitBuildOptions,
  ): Promise<ReturnType<typeof buildPagbankSplitsPayload>> {
    await this.syncConnectAccountsToSplitReceivers(tenantId);
    const settings = await this.getOrCreateSettings(tenantId);
    const receivers = await this.receiversRepo.find({
      where: { tenantId },
      order: { sortOrder: 'ASC' },
    });
    return buildPagbankSplitsPayload(settings, receivers, options);
  }
}
