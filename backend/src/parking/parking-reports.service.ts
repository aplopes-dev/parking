import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinanceTransaction, FinanceTransactionOrigin } from '../finance/entities/finance.entities';
import { ParkingSession } from './entities/parking-session.entity';
import { ParkingSpot } from './entities/parking-spot.entity';
import { ParkingSubscription } from './entities/parking-subscription.entity';
import {
  ContractStatus,
  ParkingAccessType,
  ParkingPaymentStatus,
  ParkingSessionStatus,
  ParkingSpotStatus,
} from './entities/parking.enums';
import { ParkingReportsQueryDto } from './dto/parking-reports.dto';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return round2(values.reduce((a, b) => a + b, 0) / values.length);
}

@Injectable()
export class ParkingReportsService {
  constructor(
    @InjectRepository(ParkingSession)
    private readonly sessionsRepo: Repository<ParkingSession>,
    @InjectRepository(ParkingSpot)
    private readonly spotsRepo: Repository<ParkingSpot>,
    @InjectRepository(ParkingSubscription)
    private readonly subscriptionsRepo: Repository<ParkingSubscription>,
    @InjectRepository(FinanceTransaction)
    private readonly financeTxRepo: Repository<FinanceTransaction>,
  ) {}

  async getOverview(tenantId: string, query: ParkingReportsQueryDto) {
    const { from, to, facilityId } = query;
    const fromDate = `${from}T00:00:00.000Z`;
    const toDate = `${to}T23:59:59.999Z`;

    const sessionQb = this.sessionsRepo
      .createQueryBuilder('s')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('s.entry_at >= :fromDate', { fromDate })
      .andWhere('s.entry_at <= :toDate', { toDate });

    if (facilityId) {
      sessionQb.andWhere('s.facility_id = :facilityId', { facilityId });
    }

    const sessions = await sessionQb.getMany();

    const closedInPeriod = sessions.filter(
      (s) =>
        s.status === ParkingSessionStatus.CLOSED &&
        s.exitAt &&
        s.exitAt >= new Date(fromDate) &&
        s.exitAt <= new Date(toDate),
    );

    const paidSessions = closedInPeriod.filter(
      (s) => s.paymentStatus === ParkingPaymentStatus.PAID && s.amountCharged,
    );

    const waivedSessions = closedInPeriod.filter(
      (s) => s.paymentStatus === ParkingPaymentStatus.WAIVED,
    );

    const rotativoRevenue = paidSessions
      .filter((s) => s.accessType === ParkingAccessType.ROTATIVO)
      .reduce((sum, s) => sum + Number(s.amountCharged), 0);

    const convenioRevenue = paidSessions
      .filter((s) => s.accessType === ParkingAccessType.CONVENIO)
      .reduce((sum, s) => sum + Number(s.amountCharged), 0);

    const totalRevenue = paidSessions.reduce((sum, s) => sum + Number(s.amountCharged), 0);

    const durations = closedInPeriod
      .map((s) => s.durationMinutes ?? 0)
      .filter((d) => d > 0);

    const byAccessType = {
      rotativo: sessions.filter((s) => s.accessType === ParkingAccessType.ROTATIVO).length,
      mensalista: sessions.filter((s) => s.accessType === ParkingAccessType.MENSALISTA).length,
      convenio: sessions.filter((s) => s.accessType === ParkingAccessType.CONVENIO).length,
    };

    const byPaymentMethod: Record<string, number> = {};
    for (const s of paidSessions) {
      const key = s.paymentMethod ?? 'unknown';
      byPaymentMethod[key] = (byPaymentMethod[key] ?? 0) + Number(s.amountCharged);
    }

    const spotWhere: Record<string, unknown> = { tenantId };
    if (facilityId) spotWhere.facilityId = facilityId;
    const spots = await this.spotsRepo.find({ where: spotWhere });
    const occupied = spots.filter((s) => s.status === ParkingSpotStatus.OCCUPIED).length;
    const totalSpots = spots.filter((s) => s.active).length;

    const subWhere: Record<string, unknown> = { tenantId, status: ContractStatus.ACTIVE };
    if (facilityId) subWhere.facilityId = facilityId;
    const activeSubscriptions = await this.subscriptionsRepo.count({ where: subWhere });

    const financeQb = this.financeTxRepo
      .createQueryBuilder('t')
      .where('t.tenant_id = :tenantId', { tenantId })
      .andWhere('t.origin = :origin', { origin: FinanceTransactionOrigin.PARKING })
      .andWhere('t.transaction_date >= :from', { from })
      .andWhere('t.transaction_date <= :to', { to });

    const financeRows = await financeQb.getMany();
    const financeRevenue = financeRows.reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      period: { from, to, facilityId: facilityId ?? null },
      summary: {
        entries: sessions.length,
        exits: closedInPeriod.length,
        activeSessions: sessions.filter((s) => s.status === ParkingSessionStatus.ACTIVE).length,
        paidCheckouts: paidSessions.length,
        waivedCheckouts: waivedSessions.length,
        totalRevenue: round2(totalRevenue),
        rotativoRevenue: round2(rotativoRevenue),
        convenioRevenue: round2(convenioRevenue),
        financeRevenue: round2(financeRevenue),
        avgDurationMinutes: avg(durations),
        avgTicket: paidSessions.length
          ? round2(totalRevenue / paidSessions.length)
          : 0,
        occupancyRate: totalSpots ? round2((occupied / totalSpots) * 100) : 0,
        activeSubscriptions,
      },
      byAccessType,
      byPaymentMethod: Object.entries(byPaymentMethod).map(([method, amount]) => ({
        method,
        amount: round2(amount),
      })),
    };
  }

  async getDaily(tenantId: string, query: ParkingReportsQueryDto) {
    const { from, to, facilityId } = query;
    const fromDate = `${from}T00:00:00.000Z`;
    const toDate = `${to}T23:59:59.999Z`;

    const qb = this.sessionsRepo
      .createQueryBuilder('s')
      .select("TO_CHAR(s.entry_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')", 'day')
      .addSelect('COUNT(*)', 'entries')
      .addSelect(
        `SUM(CASE WHEN s.status = 'closed' AND s.payment_status = 'paid' THEN COALESCE(s.amount_charged, 0) ELSE 0 END)`,
        'revenue',
      )
      .addSelect(
        `SUM(CASE WHEN s.status = 'closed' THEN 1 ELSE 0 END)`,
        'exits',
      )
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('s.entry_at >= :fromDate', { fromDate })
      .andWhere('s.entry_at <= :toDate', { toDate })
      .groupBy('day')
      .orderBy('day', 'ASC');

    if (facilityId) {
      qb.andWhere('s.facility_id = :facilityId', { facilityId });
    }

    const rows = await qb.getRawMany();
    return {
      period: { from, to, facilityId: facilityId ?? null },
      daily: rows.map((r) => ({
        day: r.day,
        entries: Number(r.entries),
        exits: Number(r.exits),
        revenue: round2(Number(r.revenue)),
      })),
    };
  }

  async getTopPlates(tenantId: string, query: ParkingReportsQueryDto) {
    const { from, to, facilityId } = query;
    const fromDate = `${from}T00:00:00.000Z`;
    const toDate = `${to}T23:59:59.999Z`;

    const qb = this.sessionsRepo
      .createQueryBuilder('s')
      .select('s.plate', 'plate')
      .addSelect('COUNT(*)', 'visits')
      .addSelect('SUM(COALESCE(s.duration_minutes, 0))', 'totalMinutes')
      .addSelect(
        `SUM(CASE WHEN s.payment_status = 'paid' THEN COALESCE(s.amount_charged, 0) ELSE 0 END)`,
        'revenue',
      )
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('s.entry_at >= :fromDate', { fromDate })
      .andWhere('s.entry_at <= :toDate', { toDate })
      .groupBy('s.plate')
      .orderBy('visits', 'DESC')
      .limit(20);

    if (facilityId) {
      qb.andWhere('s.facility_id = :facilityId', { facilityId });
    }

    const rows = await qb.getRawMany();
    return {
      period: { from, to, facilityId: facilityId ?? null },
      plates: rows.map((r) => ({
        plate: r.plate,
        visits: Number(r.visits),
        totalMinutes: Number(r.totalMinutes),
        revenue: round2(Number(r.revenue)),
      })),
    };
  }
}
