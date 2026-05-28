import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../pdv/entities/order.entity';
import {
  PagbankTransaction,
  PagbankTransactionStatus,
} from './entities/pagbank-transaction.entity';
import { PaymentsService } from './payments.service';
import { PagbankHttpClient } from './pagbank-http.client';
import { PagbankFlowGuard } from './pagbank-flow.guard';
import {
  buildItemsFromOrder,
  buildPagbankOrderPayload,
  buildPagbankPayPayload,
  extractCheckoutData,
  mapPagbankChargeStatus,
  toPagbankTransactionStatus,
} from './pagbank-order.builder';
import { buildFlowPayment } from './pagbank-flow-payment.builder';
import {
  PagbankCaptureDto,
  PagbankCheckoutDto,
  PagbankPayExistingDto,
  dtoPaymentToInput,
} from './dto/pagbank-orders.dto';
import {
  mergePagbankFlowsConfig,
  PAGBANK_IMPLEMENTED_IN_CODE,
  PagbankFlowsConfigMap,
} from './pagbank-flows.catalog';
import { PagbankPdvSettlementService } from './pagbank-pdv-settlement.service';
import { PagbankSplitService } from './pagbank-split.service';
import { extractPagbankSplitId } from './pagbank-split.builder';
import { formatPagbankApiError } from './pagbank-api.util';

@Injectable()
export class PagbankOrdersService {
  constructor(
    @InjectRepository(PagbankTransaction)
    private readonly txRepo: Repository<PagbankTransaction>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly paymentsService: PaymentsService,
    private readonly http: PagbankHttpClient,
    private readonly flowGuard: PagbankFlowGuard,
    private readonly pdvSettlement: PagbankPdvSettlementService,
    private readonly splitService: PagbankSplitService,
  ) {}

  async checkout(tenantId: string, dto: PagbankCheckoutDto) {
    await this.flowGuard.assertFlowAllowed(tenantId, dto.flowId);
    await this.flowGuard.assertSplitIfNeeded(tenantId, dto.flowId);

    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const { order, amountCents, referenceId } = await this.resolveOrderContext(
      tenantId,
      dto.orderId,
      dto.amountCents,
      dto.referenceId,
    );

    const splits = await this.splitService.getSplitsPayloadForFlow(
      tenantId,
      dto.flowId,
      dto.splitOptions,
    );
    const flowPayment = buildFlowPayment(
      dto.flowId,
      amountCents,
      dtoPaymentToInput(dto.payment),
    );

    const payload = buildPagbankOrderPayload(settings, {
      referenceId,
      amountCents,
      softDescriptor: settings.pagbankOrderSoftDescriptor,
      customer: dto.customer,
      items: order ? buildItemsFromOrder(order) : undefined,
      flowPayment,
      splits,
    });

    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'POST',
      '/orders',
      payload,
    );

    const tx = await this.persistFromOrderResponse(tenantId, {
      flowId: dto.flowId,
      orderId: order?.id ?? null,
      amountCents,
      paymentMethod: flowPayment.baseMethod,
      res,
    });

    const settlement = await this.pdvSettlement.trySettlePaidTransaction(tx);
    return this.mapTransactionResponse(tx, settlement);
  }

  async payExisting(tenantId: string, transactionId: string, dto: PagbankPayExistingDto) {
    await this.flowGuard.assertFlowAllowed(tenantId, dto.flowId);
    await this.flowGuard.assertSplitIfNeeded(tenantId, dto.flowId);

    const tx = await this.findTx(tenantId, transactionId);
    if (!tx.pagbankOrderId) {
      throw new BadRequestException('Transação sem pedido PagBank para pagar');
    }

    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const splits = await this.splitService.getSplitsPayloadForFlow(
      tenantId,
      dto.flowId,
      dto.splitOptions,
    );
    const payInput = dtoPaymentToInput(dto.payment) ?? {};
    if (dto.payload) {
      payInput.payload = { ...payInput.payload, ...dto.payload };
    }
    if (dto.method) {
      payInput.method = dto.method;
    }
    const flowPayment = buildFlowPayment(dto.flowId, tx.amountCents, payInput);
    const body = buildPagbankPayPayload(
      tx.amountCents,
      flowPayment,
      splits,
      settings.pagbankOrderSoftDescriptor,
      tx.pagbankOrderId,
    );

    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'POST',
      `/orders/${tx.pagbankOrderId}/pay`,
      body,
    );

    return this.applyPayResponse(tx, res, dto.flowId, flowPayment.baseMethod ?? '');
  }

  async cancelCharge(tenantId: string, transactionId: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'orders_cancel');
    const tx = await this.findTx(tenantId, transactionId);
    if (!tx.chargeId) throw new BadRequestException('Transação sem charge_id');

    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const res = await this.http.request(
      settings,
      'POST',
      `/charges/${tx.chargeId}/cancel`,
      {},
    );

    if (!res.ok) {
      tx.status = PagbankTransactionStatus.ERROR;
      tx.errorMessage = this.formatApiError(res.data);
      await this.txRepo.save(tx);
      throw new BadGatewayException(tx.errorMessage);
    }

    tx.status = PagbankTransactionStatus.CANCELED;
    tx.rawLastEvent = res.data;
    await this.txRepo.save(tx);
    return this.mapTransactionResponse(tx);
  }

  async captureCharge(tenantId: string, transactionId: string, dto: PagbankCaptureDto) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'orders_capture');
    const tx = await this.findTx(tenantId, transactionId);
    if (!tx.chargeId) throw new BadRequestException('Transação sem charge_id');

    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const body: Record<string, unknown> = {};
    if (dto.amountCents) {
      body.amount = { value: dto.amountCents, currency: 'BRL' };
    }

    const res = await this.http.request(
      settings,
      'POST',
      `/charges/${tx.chargeId}/capture`,
      body,
    );

    if (!res.ok) {
      tx.errorMessage = this.formatApiError(res.data);
      await this.txRepo.save(tx);
      throw new BadGatewayException(tx.errorMessage);
    }

    tx.rawPay = res.data;
    const charges = (res.data.charges ?? res.data.charge) as
      | Array<Record<string, unknown>>
      | Record<string, unknown>
      | undefined;
    const charge = Array.isArray(charges) ? charges[0] : charges;
    if (charge?.status) {
      tx.status = toPagbankTransactionStatus(mapPagbankChargeStatus(String(charge.status)));
    }
    await this.txRepo.save(tx);
    return this.mapTransactionResponse(tx);
  }

  async querySplit(tenantId: string, transactionId: string) {
    return this.splitService.querySplit(tenantId, transactionId);
  }

  async getTransaction(tenantId: string, id: string) {
    const tx = await this.findTx(tenantId, id);
    return this.mapTransactionResponse(tx);
  }

  async listTransactions(tenantId: string, orderId?: string) {
    const rows = await this.txRepo.find({
      where: orderId ? { tenantId, orderId } : { tenantId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return rows.map((tx) => this.mapTransactionResponse(tx));
  }

  async refreshFromPagbank(tenantId: string, transactionId: string) {
    const tx = await this.findTx(tenantId, transactionId);
    if (!tx.pagbankOrderId) throw new BadRequestException('Sem pedido PagBank');

    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'GET',
      `/orders/${tx.pagbankOrderId}`,
    );

    if (!res.ok) {
      throw new BadGatewayException(this.formatApiError(res.data));
    }

    await this.updateTxFromPagbankOrder(tx, res.data);
    await this.txRepo.save(tx);
    await this.splitService.persistSplitIdFromOrderData(tx, res.data);
    const settlement = await this.pdvSettlement.trySettlePaidTransaction(tx);
    return this.mapTransactionResponse(tx, settlement);
  }

  async updateTxFromPagbankOrder(
    tx: PagbankTransaction,
    orderData: Record<string, unknown>,
  ): Promise<void> {
    tx.rawLastEvent = orderData;
    const charges = orderData.charges as Array<Record<string, unknown>> | undefined;
    const charge = charges?.[0];
    if (charge?.id) tx.chargeId = String(charge.id);
    if (charge?.status) {
      tx.status = toPagbankTransactionStatus(mapPagbankChargeStatus(String(charge.status)));
    }
    const pm = charge?.payment_method as Record<string, unknown> | undefined;
    if (pm?.type) tx.paymentMethod = String(pm.type);
    tx.checkoutData = extractCheckoutData(orderData);
    if (!charge?.status && (tx.checkoutData?.pixCopyPaste || tx.checkoutData?.pixQrCode)) {
      tx.status = PagbankTransactionStatus.WAITING_PAYMENT;
      if (!tx.paymentMethod) tx.paymentMethod = 'PIX';
    }
    const splitId = extractPagbankSplitId(orderData);
    if (splitId) tx.pagbankSplitId = splitId;
  }

  private async persistFromOrderResponse(
    tenantId: string,
    ctx: {
      flowId: string;
      orderId: string | null;
      amountCents: number;
      paymentMethod: string | null;
      res: { ok: boolean; status: number; data: Record<string, unknown> };
    },
  ): Promise<PagbankTransaction> {
    const { res, flowId, orderId, amountCents, paymentMethod } = ctx;

    const tx = this.txRepo.create({
      tenantId,
      orderId,
      flowId,
      amountCents,
      paymentMethod,
      rawCreate: res.data,
      status: res.ok ? PagbankTransactionStatus.CREATED : PagbankTransactionStatus.ERROR,
      errorMessage: res.ok ? null : this.formatApiError(res.data),
    });

    if (res.ok) {
      tx.pagbankOrderId = res.data.id ? String(res.data.id) : null;
      tx.checkoutData = extractCheckoutData(res.data);
      const chargeId = tx.checkoutData?.chargeId;
      if (chargeId) tx.chargeId = String(chargeId);
      const st = tx.checkoutData?.status;
      if (st) {
        tx.status = toPagbankTransactionStatus(mapPagbankChargeStatus(String(st)));
      } else if (
        tx.checkoutData?.pixCopyPaste ||
        tx.checkoutData?.pixQrCode ||
        tx.checkoutData?.boleto ||
        tx.checkoutData?.boletoPdfUrl ||
        tx.checkoutData?.boletoBarcode
      ) {
        tx.status = PagbankTransactionStatus.WAITING_PAYMENT;
      }
      const splitId = extractPagbankSplitId(res.data);
      if (splitId) tx.pagbankSplitId = splitId;
    }

    if (!res.ok) {
      await this.txRepo.save(tx);
      throw new BadGatewayException(tx.errorMessage ?? 'Erro PagBank');
    }

    const saved = await this.txRepo.save(tx);
    return saved;
  }

  private async applyPayResponse(
    tx: PagbankTransaction,
    res: { ok: boolean; data: Record<string, unknown> },
    flowId: string,
    method: string,
  ) {
    tx.flowId = flowId;
    tx.paymentMethod = method;
    tx.rawPay = res.data;

    if (!res.ok) {
      tx.status = PagbankTransactionStatus.ERROR;
      tx.errorMessage = this.formatApiError(res.data);
      await this.txRepo.save(tx);
      throw new BadGatewayException(tx.errorMessage);
    }

    if (res.data.id) tx.pagbankOrderId = String(res.data.id);
    tx.checkoutData = extractCheckoutData(res.data);
    if (tx.checkoutData?.chargeId) tx.chargeId = String(tx.checkoutData.chargeId);
    const st = tx.checkoutData?.status;
    if (st) tx.status = toPagbankTransactionStatus(mapPagbankChargeStatus(String(st)));
    const splitId = extractPagbankSplitId(res.data);
    if (splitId) tx.pagbankSplitId = splitId;

    await this.txRepo.save(tx);
    const settlement = await this.pdvSettlement.trySettlePaidTransaction(tx);
    return this.mapTransactionResponse(tx, settlement);
  }

  private async resolveOrderContext(
    tenantId: string,
    orderId: string | undefined,
    amountCents: number | undefined,
    referenceId: string | undefined,
  ) {
    let order: Order | null = null;
    if (orderId) {
      order = await this.orderRepo.findOne({
        where: { id: orderId, tenantId },
        relations: ['items'],
      });
      if (!order) throw new NotFoundException('Pedido não encontrado');
    }

    const cents =
      amountCents ??
      (order ? Math.round(parseFloat(order.total) * 100) : undefined);

    if (!cents || cents < 1) {
      throw new BadRequestException('Informe orderId ou amountCents');
    }

    const ref =
      referenceId ??
      (order ? `aplopes-order-${order.orderNumber}` : `aplopes-${Date.now()}`);

    return { order, amountCents: cents, referenceId: ref };
  }

  async getCapabilities(tenantId: string) {
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const flows = mergePagbankFlowsConfig(
      settings.pagbankFlowsConfig as PagbankFlowsConfigMap,
    );
    const enabledFlows = [...PAGBANK_IMPLEMENTED_IN_CODE].filter(
      (id) => flows[id]?.enabled,
    );
    return {
      tokenConfigured: Boolean(settings.pagbankToken?.trim()),
      environment: settings.pagbankEnvironment,
      publicKey: settings.pagbankPublicKey,
      implementedFlows: [...PAGBANK_IMPLEMENTED_IN_CODE],
      enabledFlows,
      pixApi: enabledFlows.includes('orders_pix'),
      pagbankWalletQr: enabledFlows.includes('orders_pagbank_qr'),
      cardVault: enabledFlows.includes('orders_card_vault'),
      threeDs: enabledFlows.includes('orders_3ds_pagbank'),
      splitCustody: enabledFlows.includes('split_custody'),
      splitReleaseCustody: enabledFlows.includes('split_release_custody'),
      splitChargebackRecovery: enabledFlows.includes('split_chargeback_recovery'),
      splitLiableMcc: enabledFlows.includes('split_liable_mcc'),
      connectAuthorization: enabledFlows.includes('connect_authorization'),
      hostedCheckout: enabledFlows.includes('checkout_pagbank'),
      recurringPlans: enabledFlows.includes('recurring_plans'),
      recurringSubscriptions: enabledFlows.includes('recurring_subscriptions'),
      transferBalance: enabledFlows.includes('transfer_balance'),
      accountRegister: enabledFlows.includes('account_register'),
    };
  }

  private formatApiError(data: Record<string, unknown>): string {
    return formatPagbankApiError(data);
  }

  private async findTx(tenantId: string, id: string) {
    const tx = await this.txRepo.findOne({ where: { id, tenantId } });
    if (!tx) throw new NotFoundException('Transação PagBank não encontrada');
    return tx;
  }

  mapTransactionResponse(
    tx: PagbankTransaction,
    settlement?: { registered: boolean; reason?: string },
  ) {
    return {
      id: tx.id,
      tenantId: tx.tenantId,
      orderId: tx.orderId,
      flowId: tx.flowId,
      pagbankOrderId: tx.pagbankOrderId,
      pagbankCheckoutId: tx.pagbankCheckoutId,
      pagbankSplitId: tx.pagbankSplitId,
      chargeId: tx.chargeId,
      status: tx.status,
      paymentMethod: tx.paymentMethod,
      amountCents: tx.amountCents,
      currency: tx.currency,
      checkoutData: tx.checkoutData,
      rawCreate: tx.rawCreate,
      errorMessage: tx.errorMessage,
      pdvPaymentRegistered: settlement?.registered ?? false,
      pdvSettlementReason: settlement?.reason ?? null,
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt,
    };
  }
}
