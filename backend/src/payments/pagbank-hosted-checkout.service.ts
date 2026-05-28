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
import { PagbankOrdersService } from './pagbank-orders.service';
import { PagbankPdvSettlementService } from './pagbank-pdv-settlement.service';
import { PagbankHostedCheckoutDto } from './dto/pagbank-hosted-checkout.dto';
import {
  buildPagbankHostedCheckoutPayload,
  extractHostedCheckoutData,
  mapHostedCheckoutStatus,
} from './pagbank-checkout.builder';
import { buildItemsFromOrder } from './pagbank-order.builder';

@Injectable()
export class PagbankHostedCheckoutService {
  constructor(
    @InjectRepository(PagbankTransaction)
    private readonly txRepo: Repository<PagbankTransaction>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly paymentsService: PaymentsService,
    private readonly http: PagbankHttpClient,
    private readonly flowGuard: PagbankFlowGuard,
    private readonly ordersService: PagbankOrdersService,
    private readonly pdvSettlement: PagbankPdvSettlementService,
  ) {}

  async createHostedCheckout(tenantId: string, dto: PagbankHostedCheckoutDto) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'checkout_pagbank');
    await this.paymentsService.syncConnectAccountsToSplitReceivers(tenantId);

    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const { order, amountCents, referenceId } = await this.resolveOrderContext(
      tenantId,
      dto.orderId,
      dto.amountCents,
      dto.referenceId,
    );

    const payload = buildPagbankHostedCheckoutPayload(settings, {
      referenceId,
      amountCents,
      customer: dto.customer,
      items: order ? buildItemsFromOrder(order) : undefined,
      returnUrl: dto.returnUrl,
      redirectUrl: dto.redirectUrl,
      expirationDate: dto.expirationDate,
      softDescriptor: settings.pagbankOrderSoftDescriptor,
      notificationUrls: settings.pagbankNotificationUrl
        ? [settings.pagbankNotificationUrl]
        : undefined,
    });

    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'POST',
      '/checkouts',
      payload,
    );

    const tx = this.txRepo.create({
      tenantId,
      orderId: order?.id ?? null,
      flowId: 'checkout_pagbank',
      amountCents,
      rawCreate: res.data,
      status: res.ok ? PagbankTransactionStatus.WAITING_PAYMENT : PagbankTransactionStatus.ERROR,
      errorMessage: res.ok ? null : this.formatApiError(res.data),
    });

    if (res.ok) {
      const meta = extractHostedCheckoutData(res.data);
      tx.pagbankCheckoutId = meta.checkoutId ?? null;
      tx.checkoutData = {
        ...meta,
        hosted: true,
      } as Record<string, unknown>;
      if (meta.orderId?.startsWith('ORDE')) tx.pagbankOrderId = meta.orderId;
      if (meta.chargeId) tx.chargeId = meta.chargeId;
      const mapped = mapHostedCheckoutStatus(meta.status);
      tx.status = this.hostedStatusToEnum(mapped);
    }

    if (!res.ok) {
      await this.txRepo.save(tx);
      throw new BadGatewayException(tx.errorMessage ?? 'Erro ao criar checkout PagBank');
    }

    const saved = await this.txRepo.save(tx);
    const settlement = await this.pdvSettlement.trySettlePaidTransaction(saved);
    return this.ordersService.mapTransactionResponse(saved, settlement);
  }

  async refreshHostedCheckout(tenantId: string, transactionId: string) {
    const tx = await this.txRepo.findOne({ where: { id: transactionId, tenantId } });
    if (!tx) throw new NotFoundException('Transação PagBank não encontrada');
    if (!tx.pagbankCheckoutId) {
      throw new BadRequestException('Transação sem checkout PagBank');
    }

    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'GET',
      `/checkouts/${tx.pagbankCheckoutId}`,
    );

    if (!res.ok) {
      throw new BadGatewayException(this.formatApiError(res.data));
    }

    const meta = extractHostedCheckoutData(res.data);
    tx.rawLastEvent = res.data;
    tx.checkoutData = { ...meta, hosted: true } as Record<string, unknown>;
    tx.status = this.hostedStatusToEnum(mapHostedCheckoutStatus(meta.status));

    if (meta.orderId?.startsWith('ORDE') && !tx.pagbankOrderId) {
      tx.pagbankOrderId = meta.orderId;
    }
    if (meta.chargeId) tx.chargeId = meta.chargeId;

    await this.txRepo.save(tx);

    if (tx.pagbankOrderId && tx.status !== PagbankTransactionStatus.PAID) {
      try {
        return this.ordersService.refreshFromPagbank(tenantId, tx.id);
      } catch {
        /* segue com status do checkout */
      }
    }

    const settlement = await this.pdvSettlement.trySettlePaidTransaction(tx);
    return this.ordersService.mapTransactionResponse(tx, settlement);
  }

  private hostedStatusToEnum(mapped: string): PagbankTransactionStatus {
    if (mapped === 'paid') return PagbankTransactionStatus.PAID;
    if (mapped === 'canceled') return PagbankTransactionStatus.CANCELED;
    if (mapped === 'declined') return PagbankTransactionStatus.DECLINED;
    return PagbankTransactionStatus.WAITING_PAYMENT;
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
      amountCents ?? (order ? Math.round(parseFloat(order.total) * 100) : undefined);
    if (!cents || cents < 1) {
      throw new BadRequestException('Informe orderId ou amountCents');
    }

    const ref =
      referenceId ??
      (order ? `aplopes-order-${order.orderNumber}` : `aplopes-${Date.now()}`);

    return { order, amountCents: cents, referenceId: ref };
  }

  private formatApiError(data: Record<string, unknown>): string {
    const errors = data.error_messages as Array<{ description?: string }> | undefined;
    if (errors?.length) return errors.map((e) => e.description ?? 'Erro').join('; ');
    return (data.message as string) || 'Erro na API PagBank Checkout';
  }
}
