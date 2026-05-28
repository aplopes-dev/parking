import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { MobileRealtimeService } from './mobile-realtime.service';
import { MobileService } from './mobile.service';
import { MobileParkingService } from './mobile-parking.service';
import { WaiterNotificationService } from './waiter-notification.service';

type ClientMeta = WebSocket & { tenantId?: string; userId?: string };

@WebSocketGateway({ path: '/mobile/ws' })
export class MobileRealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(MobileRealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly realtime: MobileRealtimeService,
    private readonly jwtService: JwtService,
    private readonly mobileService: MobileService,
    private readonly mobileParking: MobileParkingService,
    private readonly waiterNotifications: WaiterNotificationService,
  ) {}

  async handleConnection(client: ClientMeta, req: IncomingMessage): Promise<void> {
    try {
      const url = new URL(req.url ?? '/mobile/ws', 'http://localhost');
      const token = url.searchParams.get('token');
      if (!token) {
        client.close(4001, 'Token obrigatório');
        return;
      }

      const payload = this.jwtService.verify<{
        sub: string;
        tid?: string;
        role?: string;
      }>(token);
      if (!payload.tid) {
        client.close(4001, 'Tenant inválido');
        return;
      }

      client.tenantId = payload.tid;
      client.userId = payload.sub;
      this.realtime.addClient(payload.tid, payload.sub, client, payload.role);

      const tables = await this.mobileService.listTables(payload.tid);
      client.send(
        JSON.stringify({
          event: 'tables.snapshot',
          data: { tables },
        }),
      );

      const viewAllSalon = Boolean(payload.role);
      const pending = await this.waiterNotifications.listPending(
        payload.tid,
        payload.sub,
        payload.role,
        viewAllSalon,
      );
      if (pending.length > 0) {
        client.send(
          JSON.stringify({
            event: 'waiter.notifications.snapshot',
            data: { notifications: pending },
          }),
        );
      }

      const valetPayload = await this.mobileParking.buildValetPayload(payload.tid);
      client.send(
        JSON.stringify({
          event: 'parking.valet.snapshot',
          data: {
            ...valetPayload,
            facilityId: null,
          },
        }),
      );

      this.logger.log(`WS conectado — tenant ${payload.tid} user ${payload.sub}`);
    } catch {
      client.close(4001, 'Não autorizado');
    }
  }

  handleDisconnect(client: ClientMeta): void {
    if (client.tenantId) {
      this.realtime.removeClient(client.tenantId, client);
      this.logger.log(`WS desconectado — tenant ${client.tenantId}`);
    }
  }
}
