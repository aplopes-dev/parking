import { Injectable, Logger } from '@nestjs/common';
import { WebSocket } from 'ws';

export type MobileRealtimeEvent =
  | { event: 'tables.snapshot'; data: { tables: unknown[] } }
  | { event: 'tables.updated'; data: { tables: unknown[]; source?: string } }
  | { event: 'kitchen.updated'; data: { source?: string } }
  | { event: 'waiter.notification'; data: { notification: unknown } }
  | { event: 'waiter.notifications.snapshot'; data: { notifications: unknown[] } };

type TrackedClient = {
  socket: WebSocket;
  userId: string;
  role?: string;
};

@Injectable()
export class MobileRealtimeService {
  private readonly logger = new Logger(MobileRealtimeService.name);
  private readonly rooms = new Map<string, Set<TrackedClient>>();

  addClient(
    tenantId: string,
    userId: string,
    client: WebSocket,
    role?: string,
  ): void {
    if (!this.rooms.has(tenantId)) {
      this.rooms.set(tenantId, new Set());
    }
    this.rooms.get(tenantId)!.add({ socket: client, userId, role });
  }

  removeClient(tenantId: string, client: WebSocket): void {
    const room = this.rooms.get(tenantId);
    if (!room) return;
    for (const tracked of room) {
      if (tracked.socket === client) {
        room.delete(tracked);
        break;
      }
    }
    if (room.size === 0) this.rooms.delete(tenantId);
  }

  broadcast(tenantId: string, payload: MobileRealtimeEvent): void {
    const room = this.rooms.get(tenantId);
    if (!room?.size) return;
    const message = JSON.stringify(payload);
    for (const { socket } of room) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    }
    this.logger.debug(
      `Broadcast ${payload.event} → tenant ${tenantId} (${room.size} client(s))`,
    );
  }

  sendToRoles(
    tenantId: string,
    roles: readonly string[],
    payload: MobileRealtimeEvent,
    options?: { excludeUserIds?: string[] },
  ): void {
    const room = this.rooms.get(tenantId);
    if (!room?.size) return;
    const roleSet = new Set(roles);
    const excluded = new Set(options?.excludeUserIds ?? []);
    const message = JSON.stringify(payload);
    let sent = 0;
    for (const tracked of room) {
      if (excluded.has(tracked.userId)) continue;
      if (!tracked.role || !roleSet.has(tracked.role)) continue;
      if (tracked.socket.readyState === WebSocket.OPEN) {
        tracked.socket.send(message);
        sent += 1;
      }
    }
    if (sent > 0) {
      this.logger.debug(
        `Send ${payload.event} → roles [${roles.join(',')}] (${sent} client(s))`,
      );
    }
  }

  sendToUser(tenantId: string, userId: string, payload: MobileRealtimeEvent): void {
    const room = this.rooms.get(tenantId);
    if (!room?.size) return;
    const message = JSON.stringify(payload);
    let sent = 0;
    for (const tracked of room) {
      if (tracked.userId === userId && tracked.socket.readyState === WebSocket.OPEN) {
        tracked.socket.send(message);
        sent += 1;
      }
    }
    if (sent > 0) {
      this.logger.debug(
        `Send ${payload.event} → user ${userId} (${sent} client(s))`,
      );
    }
  }
}
