import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OrdersService } from '../pdv/orders.service';
import { OrderPayment } from '../pdv/entities/order-payment.entity';
import {
  PagbankTransaction,
  PagbankTransactionStatus,
} from './entities/pagbank-transaction.entity';

export type PagbankPdvSettlementResult = {
  registered: boolean;
  reason?: 'not_paid' | 'no_order' | 'order_closed' | 'already_registered' | 'nothing_due';
};

@Injectable()
export class PagbankPdvSettlementService {
  private readonly logger = new Logger(PagbankPdvSettlementService.name);

  constructor(
    private readonly ordersService: OrdersService,
    @InjectRepository(OrderPayment)
    private readonly paymentRepo: Repository<OrderPayment>,
  ) {}

  async trySettlePaidTransaction(
    tx: PagbankTransaction,
  ): Promise<PagbankPdvSettlementResult> {
    if (tx.status !== PagbankTransactionStatus.PAID) {
      return { registered: false, reason: 'not_paid' };
    }
    if (!tx.orderId) {
      return { registered: false, reason: 'no_order' };
    }

    const keys = [tx.pagbankOrderId, tx.id, tx.chargeId].filter(Boolean) as string[];
    if (keys.length) {
      const existing = await this.paymentRepo.findOne({
        where: {
          orderId: tx.orderId,
          pagbankTransactionId: In(keys),
        },
      });
      if (existing) {
        return { registered: false, reason: 'already_registered' };
      }
      const byCode = await this.paymentRepo.findOne({
        where: {
          orderId: tx.orderId,
          pagbankTransactionCode: In(keys),
        },
      });
      if (byCode) {
        return { registered: false, reason: 'already_registered' };
      }
    }

    const pixTxId = this.extractPixTxId(tx);

    const { registered, order } = await this.ordersService.registerPagbankApiPayment(
      tx.orderId,
      tx.tenantId,
      {
        localTransactionId: tx.id,
        pagbankOrderId: tx.pagbankOrderId,
        chargeId: tx.chargeId,
        amountCents: tx.amountCents,
        paymentMethodType: tx.paymentMethod,
        pixTxId,
      },
    );

    if (!registered) {
      const total = parseFloat(order.total);
      const paid = (order.payments ?? []).reduce((s, p) => s + parseFloat(p.amount), 0);
      if (paid >= total - 0.05) {
        return { registered: false, reason: 'nothing_due' };
      }
      return { registered: false, reason: 'order_closed' };
    }

    this.logger.log(
      `PDV: pagamento registrado pedido=${tx.orderId} tx=${tx.id} pagbank=${tx.pagbankOrderId}`,
    );
    return { registered: true };
  }

  private extractPixTxId(tx: PagbankTransaction): string | null {
    const cd = tx.checkoutData;
    if (!cd || typeof cd !== 'object') return null;
    if (typeof cd.pixCopyPaste === 'string' && cd.pixCopyPaste.length <= 120) {
      return cd.pixCopyPaste;
    }
    const qr = cd.pixQrCode;
    if (Array.isArray(qr) && qr[0] && typeof qr[0] === 'object') {
      const id = (qr[0] as { id?: string }).id;
      if (id) return id;
    }
    return null;
  }
}
