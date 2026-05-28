import { Injectable } from '@nestjs/common';
import { MobileRealtimeService } from '../mobile/mobile-realtime.service';
import { ParkingValetService } from './parking-valet.service';

@Injectable()
export class ParkingValetBroadcastService {
  constructor(
    private readonly valetService: ParkingValetService,
    private readonly realtime: MobileRealtimeService,
  ) {}

  async notify(tenantId: string, facilityId?: string, source?: string): Promise<void> {
    const payload = await this.valetService.getActiveQueuePayload(tenantId, facilityId);
    this.realtime.broadcast(tenantId, {
      event: 'parking.valet.updated',
      data: {
        ...payload,
        facilityId: facilityId ?? null,
        source,
      },
    });
  }
}
