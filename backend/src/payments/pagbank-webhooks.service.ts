import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PagbankTransaction,
  PagbankTransactionStatus,
} from './entities/pagbank-transaction.entity';
import { PagbankOrdersService } from './pagbank-orders.service';
import { PagbankHostedCheckoutService } from './pagbank-hosted-checkout.service';
import { PagbankPdvSettlementService } from './pagbank-pdv-settlement.service';
import { ParkingPagbankSettlementService } from '../parking/parking-pagbank-settlement.service';
import {
  mapPagbankChargeStatus,
  toPagbankTransactionStatus,
} from './pagbank-order.builder';

@Injectable()
export class PagbankWebhooksService {
  private readonly logger = new Logger(PagbankWebhooksService.name);

  constructor(
    @InjectRepository(PagbankTransaction)
    private readonly txRepo: Repository<PagbankTransaction>,
    private readonly ordersService: PagbankOrdersService,
    private readonly hostedCheckout: PagbankHostedCheckoutService,
    private readonly pdvSettlement: PagbankPdvSettlementService,
    @Inject(forwardRef(() => ParkingPagbankSettlementService))
    private readonly parkingSettlement: ParkingPagbankSettlementService,
  ) {}

  async handleNotification(
    payload: Record<string, unknown>,
  ): Promise<{ processed: boolean; pdvPaymentRegistered?: boolean; parkingBillSettled?: boolean }> {
    const ids = this.extractIds(payload);
    if (!ids.orderId && !ids.chargeId && !ids.checkoutId) {
      this.logger.warn('Webhook PagBank sem IDs reconhecíveis');
      return { processed: false };
    }

    let tx: PagbankTransaction | null = null;
    if (ids.checkoutId) {
      tx = await this.txRepo.findOne({
        where: { pagbankCheckoutId: ids.checkoutId },
      });
    }
    if (ids.orderId) {
      tx =
        tx ??
        (await this.txRepo.findOne({
          where: { pagbankOrderId: ids.orderId },
        }));
    }
    if (!tx && ids.chargeId) {
      tx = await this.txRepo.findOne({ where: { chargeId: ids.chargeId } });
    }
    if (!tx) {
      this.logger.warn(`Webhook sem transação local: ${JSON.stringify(ids)}`);
      return { processed: false };
    }

    tx.rawLastEvent = payload;

    let pdvRegistered = false;
    let parkingSettled = false;

    try {
      const refreshed =
        tx.flowId === 'checkout_pagbank' && tx.pagbankCheckoutId
          ? await this.hostedCheckout.refreshHostedCheckout(tx.tenantId, tx.id)
          : await this.ordersService.refreshFromPagbank(tx.tenantId, tx.id);
      pdvRegistered = Boolean(refreshed.pdvPaymentRegistered);
      const latest = await this.txRepo.findOne({ where: { id: tx.id } });
      if (latest?.status === PagbankTransactionStatus.PAID) {
        const parkingResult = await this.parkingSettlement.trySettlePaidTransaction(latest);
        parkingSettled = parkingResult.settled;
      }
      if (refreshed.status === PagbankTransactionStatus.PAID) {
        this.logger.log(
          `PagBank pago: tx=${tx.id} order=${tx.orderId} pdv=${pdvRegistered ? 'ok' : 'skip'} parking=${parkingSettled ? 'ok' : 'skip'}`,
        );
      }
    } catch (err) {
      const chargeStatus = this.extractStatusFromPayload(payload);
      if (chargeStatus) {
        tx.status = toPagbankTransactionStatus(mapPagbankChargeStatus(chargeStatus));
      }
      await this.txRepo.save(tx);
      if (tx.status === PagbankTransactionStatus.PAID) {
        const settlement = await this.pdvSettlement.trySettlePaidTransaction(tx);
        pdvRegistered = settlement.registered;
        const parkingResult = await this.parkingSettlement.trySettlePaidTransaction(tx);
        parkingSettled = parkingResult.settled;
      }
      this.logger.error(`Falha ao atualizar via API: ${err}`);
    }

    return { processed: true, pdvPaymentRegistered: pdvRegistered, parkingBillSettled: parkingSettled };
  }

  private extractIds(payload: Record<string, unknown>): {
    orderId?: string;
    chargeId?: string;
    checkoutId?: string;
  } {
    const result: { orderId?: string; chargeId?: string; checkoutId?: string } = {};

    if (typeof payload.id === 'string') {
      if (payload.id.startsWith('ORDE')) result.orderId = payload.id;
      if (payload.id.startsWith('CHEC')) result.checkoutId = payload.id;
    }
    if (typeof payload.reference_id === 'string') {
      /* reference only */
    }

    const charges = payload.charges as Array<{ id?: string }> | undefined;
    if (charges?.[0]?.id) result.chargeId = charges[0].id;

    const charge = payload.charge as { id?: string } | undefined;
    if (charge?.id) result.chargeId = charge.id;

    const resource = payload.resource as Record<string, unknown> | undefined;
    if (resource) {
      if (typeof resource.id === 'string') {
        if (resource.id.startsWith('ORDE')) result.orderId = resource.id;
        if (resource.id.startsWith('CHAR')) result.chargeId = resource.id;
        if (resource.id.startsWith('CHEC')) result.checkoutId = resource.id;
      }
    }

    const notification = payload.notification as Record<string, unknown> | undefined;
    if (notification?.id && String(notification.id).startsWith('ORDE')) {
      result.orderId = String(notification.id);
    }

    return result;
  }

  private extractStatusFromPayload(payload: Record<string, unknown>): string | undefined {
    const charges = payload.charges as Array<{ status?: string }> | undefined;
    if (charges?.[0]?.status) return charges[0].status;
    const charge = payload.charge as { status?: string } | undefined;
    return charge?.status;
  }
}
