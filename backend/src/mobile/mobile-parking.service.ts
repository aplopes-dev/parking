import { Injectable, NotFoundException } from '@nestjs/common';
import { ParkingService } from '../parking/parking.service';
import { ParkingValetService } from '../parking/parking-valet.service';
import { ParkingCashService } from '../parking/parking-cash.service';
import { ListParkingTariffsQueryDto } from '../parking/dto/parking.dto';
import { MobileRealtimeService } from './mobile-realtime.service';

@Injectable()
export class MobileParkingService {
  constructor(
    private readonly parkingService: ParkingService,
    private readonly valetService: ParkingValetService,
    private readonly cashService: ParkingCashService,
    private readonly realtime: MobileRealtimeService,
  ) {}

  async getBootstrap(tenantId: string, facilityId?: string) {
    const facilities = (await this.parkingService.listFacilities(tenantId)).filter(
      (f) => f.active,
    );
    const selectedFacilityId =
      facilityId && facilities.some((f) => f.id === facilityId)
        ? facilityId
        : facilities[0]?.id ?? null;

    const payload = await this.buildValetPayload(tenantId, selectedFacilityId ?? undefined);
    const spots = selectedFacilityId
      ? await this.parkingService.listSpots(tenantId, selectedFacilityId)
      : [];
    const tariffsQuery: ListParkingTariffsQueryDto = {
      facilityId: selectedFacilityId ?? undefined,
    };
    const tariffs = selectedFacilityId
      ? await this.parkingService.listTariffs(tenantId, tariffsQuery)
      : [];

    return {
      facilities,
      selectedFacilityId,
      ...payload,
      spots,
      tariffs,
    };
  }

  async buildValetPayload(tenantId: string, facilityId?: string) {
    return this.valetService.getActiveQueuePayload(tenantId, facilityId);
  }

  async broadcastValetUpdated(
    tenantId: string,
    facilityId?: string,
    source?: string,
  ): Promise<void> {
    const payload = await this.buildValetPayload(tenantId, facilityId);
    this.realtime.broadcast(tenantId, {
      event: 'parking.valet.updated',
      data: {
        ...payload,
        facilityId: facilityId ?? null,
        source,
      },
    });
  }

  async quoteTicket(tenantId: string, ticketId: string, tariffId?: string) {
    const tickets = await this.valetService.listTickets(tenantId, { queue: 'all' });
    const found = tickets.find((t) => t.id === ticketId);
    if (!found) throw new NotFoundException('Ticket valet não encontrado');
    if (!found.sessionId) {
      return {
        session: null,
        quote: { amount: 0, breakdown: 'Isento', tariffId: null, waived: true },
      };
    }
    return this.cashService.getQuote(tenantId, found.sessionId, tariffId);
  }
}
