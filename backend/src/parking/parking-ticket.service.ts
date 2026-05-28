import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParkingSession } from './entities/parking-session.entity';
import { ParkingSessionStatus } from './entities/parking.enums';

@Injectable()
export class ParkingTicketService {
  constructor(
    @InjectRepository(ParkingSession)
    private readonly sessionsRepo: Repository<ParkingSession>,
  ) {}

  buildQrPayload(ticketCode: string): string {
    return ticketCode.trim().toUpperCase();
  }

  async getTicketByCode(tenantId: string, ticketCode: string) {
    const normalized = ticketCode.trim().toUpperCase();
    const session = await this.sessionsRepo.findOne({
      where: { tenantId, ticketCode: normalized },
      relations: ['facility', 'spot', 'customer'],
      order: { entryAt: 'DESC' },
    });
    if (!session) throw new NotFoundException('Ticket não encontrado');

    return {
      session,
      ticketCode: session.ticketCode,
      qrPayload: this.buildQrPayload(session.ticketCode),
      isActive: session.status === ParkingSessionStatus.ACTIVE,
    };
  }

  async getTicketBySessionId(tenantId: string, sessionId: string) {
    const session = await this.sessionsRepo.findOne({
      where: { id: sessionId, tenantId },
      relations: ['facility', 'spot', 'customer'],
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');

    return {
      session,
      ticketCode: session.ticketCode,
      qrPayload: this.buildQrPayload(session.ticketCode),
      isActive: session.status === ParkingSessionStatus.ACTIVE,
    };
  }
}
