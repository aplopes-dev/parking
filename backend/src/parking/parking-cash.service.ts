import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  FinanceAccount,
  FinanceAccountType,
  FinanceTransactionOrigin,
  FinanceTransactionType,
} from '../finance/entities/finance.entities';
import {
  FinanceCashSession,
  FinanceCashSessionStatus,
} from '../finance/entities/finance-extended.entities';
import { FinanceOperationsService } from '../finance/finance-operations.service';
import { FinanceService } from '../finance/finance.service';
import { User } from '../users/entities/user.entity';
import { ParkingSession } from './entities/parking-session.entity';
import {
  ParkingPaymentMethod,
  ParkingPaymentStatus,
  ParkingSessionStatus,
} from './entities/parking.enums';
import { ParkingCheckoutDto, ParkingOpenCashDto } from './dto/parking-cash.dto';
import { ParkingService } from './parking.service';
import { ParkingTicketService } from './parking-ticket.service';

const PAYMENT_METHOD_LABELS: Record<ParkingPaymentMethod, string> = {
  [ParkingPaymentMethod.CASH]: 'Dinheiro',
  [ParkingPaymentMethod.PIX]: 'PIX',
  [ParkingPaymentMethod.CREDIT]: 'Cartão crédito',
  [ParkingPaymentMethod.DEBIT]: 'Cartão débito',
};

@Injectable()
export class ParkingCashService {
  constructor(
    @InjectRepository(ParkingSession)
    private readonly sessionsRepo: Repository<ParkingSession>,
    @InjectRepository(FinanceAccount)
    private readonly accountsRepo: Repository<FinanceAccount>,
    @InjectRepository(FinanceCashSession)
    private readonly cashSessionsRepo: Repository<FinanceCashSession>,
    private readonly parkingService: ParkingService,
    private readonly ticketService: ParkingTicketService,
    private readonly financeService: FinanceService,
    private readonly financeOps: FinanceOperationsService,
  ) {}

  async listQueue(tenantId: string, facilityId?: string) {
    const where: Record<string, unknown> = {
      tenantId,
      status: ParkingSessionStatus.ACTIVE,
    };
    if (facilityId) where.facilityId = facilityId;

    return this.sessionsRepo.find({
      where,
      relations: ['facility', 'spot', 'customer', 'subscription', 'agreement', 'tariff'],
      order: { entryAt: 'ASC' },
      take: 200,
    });
  }

  async getQuote(tenantId: string, sessionId: string, tariffId?: string) {
    const session = await this.sessionsRepo.findOne({
      where: { id: sessionId, tenantId },
      relations: ['customer', 'agreement', 'facility'],
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');

    const quote = await this.parkingService.computeSessionExitQuote(
      tenantId,
      sessionId,
      tariffId,
    );

    return { session, quote };
  }

  async getQuoteByTicket(tenantId: string, ticketCode: string, tariffId?: string) {
    const ticket = await this.ticketService.getTicketByCode(tenantId, ticketCode);
    if (!ticket.isActive) {
      throw new BadRequestException('Ticket já utilizado ou sessão encerrada');
    }
    return this.getQuote(tenantId, ticket.session.id, tariffId);
  }

  async getMyCashSession(user: User) {
    const session = await this.financeOps.getOpenCashSessionForUser(user.tenantId, user.id);
    if (!session) return { open: false as const, session: null, summary: null };

    const summary = await this.financeOps.getOperatorCashSummary(
      user.tenantId,
      user.id,
      session.id,
    );

    return { open: true as const, session, summary };
  }

  async openMyCashSession(user: User, dto: ParkingOpenCashDto) {
    const session = await this.financeOps.openOperatorCashSession(
      user,
      dto.accountId,
      dto.openingBalance ?? 0,
      dto.facilityId,
      dto.notes,
    );
    return session;
  }

  async closeMyCashSession(user: User, sessionId: string, countedBalance: number, notes?: string) {
    const open = await this.cashSessionsRepo.findOne({
      where: {
        id: sessionId,
        tenantId: user.tenantId,
        openedByUserId: user.id,
        status: FinanceCashSessionStatus.OPEN,
      },
    });
    if (!open) throw new NotFoundException('Caixa aberto não encontrado para este operador');
    return this.financeOps.closeCashSession(user, sessionId, countedBalance, notes);
  }

  async getSummary(tenantId: string, facilityId?: string) {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const sessionWhere: Record<string, unknown> = { tenantId };
    if (facilityId) sessionWhere.facilityId = facilityId;

    const queueCount = await this.sessionsRepo.count({
      where: { ...sessionWhere, status: ParkingSessionStatus.ACTIVE },
    });

    const closedToday = await this.sessionsRepo.find({
      where: {
        ...sessionWhere,
        status: ParkingSessionStatus.CLOSED,
        exitAt: Between(start, end),
      },
    });

    const paidToday = closedToday.filter(
      (s) =>
        s.paymentStatus === ParkingPaymentStatus.PAID ||
        s.paymentStatus === ParkingPaymentStatus.WAIVED,
    );

    const revenueToday = closedToday
      .filter((s) => s.paymentStatus === ParkingPaymentStatus.PAID)
      .reduce((sum, s) => sum + Number(s.amountCharged ?? 0), 0);

    return {
      facilityId: facilityId ?? null,
      queueCount,
      checkoutsToday: paidToday.length,
      revenueToday: Math.round(revenueToday * 100) / 100,
    };
  }

  async checkout(
    tenantId: string,
    userId: string | null,
    sessionId: string,
    dto: ParkingCheckoutDto,
  ) {
    const cashSession = userId
      ? await this.requireOpenCashSession(tenantId, userId)
      : null;
    return this.processCheckout(tenantId, userId, sessionId, dto, cashSession);
  }

  async checkoutByTicket(
    tenantId: string,
    userId: string,
    ticketCode: string,
    dto: ParkingCheckoutDto,
  ) {
    const ticket = await this.ticketService.getTicketByCode(tenantId, ticketCode);
    if (!ticket.isActive) {
      throw new BadRequestException('Ticket já utilizado ou sessão encerrada');
    }
    const cashSession = await this.requireOpenCashSession(tenantId, userId);
    return this.processCheckout(tenantId, userId, ticket.session.id, dto, cashSession);
  }

  private async requireOpenCashSession(tenantId: string, userId: string) {
    const session = await this.financeOps.getOpenCashSessionForUser(tenantId, userId);
    if (!session) {
      throw new BadRequestException(
        'Abra seu caixa de operador antes de registrar cobranças na saída',
      );
    }
    return session;
  }

  private async processCheckout(
    tenantId: string,
    userId: string | null,
    sessionId: string,
    dto: ParkingCheckoutDto,
    cashSession: FinanceCashSession | null,
  ) {
    const preview = await this.getQuote(tenantId, sessionId, dto.tariffId);
    const { quote, session } = preview;

    if (quote.amount > 0) {
      const paymentMethod = dto.paymentMethod ?? ParkingPaymentMethod.CASH;
      const accountId =
        dto.accountId ??
        cashSession?.accountId ??
        (await this.resolveDefaultCashAccount(tenantId))?.id;
      if (!accountId) {
        throw new BadRequestException(
          'Cadastre uma conta financeira do tipo Caixa em Gestão financeira',
        );
      }

      await this.parkingService.registerExit(tenantId, sessionId, {
        tariffId: dto.tariffId ?? quote.tariffId ?? undefined,
        notes: dto.notes,
      });

      const closed = await this.sessionsRepo.findOne({ where: { id: sessionId, tenantId } });
      const amount = Number(closed?.amountCharged ?? quote.amount);
      const paymentLabel = PAYMENT_METHOD_LABELS[paymentMethod];
      const description = `Estacionamento ${session.plate} — ${session.ticketCode}`;

      const transaction = await this.financeService.createSystemTransaction(
        tenantId,
        userId,
        {
          type: FinanceTransactionType.INCOME,
          description,
          amount,
          transactionDate: new Date().toISOString().slice(0, 10),
          accountId,
          categoryId: dto.categoryId,
          sourceId: dto.sourceId,
          notes: [paymentLabel, quote.breakdown, dto.notes?.trim()].filter(Boolean).join(' · '),
        },
        FinanceTransactionOrigin.PARKING,
        sessionId,
        cashSession?.id ?? null,
      );

      const issuedTo =
        session.customer?.name ?? session.driverName ?? `Placa ${session.plate}`;

      await this.financeOps.createReceipt(tenantId, {
        issuedTo,
        amount,
        description: `${description} (${paymentLabel})`,
        transactionId: transaction.id,
      });

      await this.sessionsRepo.update(
        { id: sessionId, tenantId },
        {
          paymentStatus: ParkingPaymentStatus.PAID,
          paymentMethod,
          financeTransactionId: transaction.id,
          paidAt: new Date(),
          paidByUserId: userId,
          cashSessionId: cashSession?.id ?? null,
        },
      );
    } else {
      await this.parkingService.registerExit(tenantId, sessionId, {
        tariffId: dto.tariffId ?? quote.tariffId ?? undefined,
        notes: dto.notes,
      });

      await this.sessionsRepo.update(
        { id: sessionId, tenantId },
        {
          paymentStatus: ParkingPaymentStatus.WAIVED,
          paymentMethod: null,
          financeTransactionId: null,
          paidAt: new Date(),
          paidByUserId: userId,
          cashSessionId: cashSession?.id ?? null,
        },
      );
    }

    return this.sessionsRepo.findOne({
      where: { id: sessionId, tenantId },
      relations: ['facility', 'spot', 'tariff', 'customer', 'subscription', 'agreement'],
    });
  }

  private async resolveDefaultCashAccount(tenantId: string) {
    return this.accountsRepo.findOne({
      where: { tenantId, active: true, type: FinanceAccountType.CASH },
      order: { createdAt: 'ASC' },
    });
  }
}
