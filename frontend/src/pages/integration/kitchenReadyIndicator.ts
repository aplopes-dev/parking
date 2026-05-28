import { hasKitchenReadyItems } from './orderLineUtils';
import { MobileTable } from './smartPosTypes';
import { WaiterNotification } from './waiterNotificationTypes';

export type KitchenNotificationScope = {
  viewAllSalon: boolean;
  currentUserId?: string;
};

/** Filtra notificações visíveis no mapa (admin = salão; garçom = só as dele). */
export function scopeKitchenNotifications(
  notifications: WaiterNotification[],
  scope: KitchenNotificationScope,
): WaiterNotification[] {
  if (scope.viewAllSalon) return notifications;
  if (!scope.currentUserId) return [];
  return notifications.filter((n) => n.targetUserId === scope.currentUserId);
}

export function notificationMatchesTable(
  table: MobileTable,
  notification: WaiterNotification,
): boolean {
  if (notification.status !== 'pending') return false;

  const session = table.session;
  if (!session || table.status === 'free') {
    return false;
  }

  return notification.orderId === session.orderId;
}

export function pendingNotificationsForTable(
  table: MobileTable,
  notifications: WaiterNotification[],
  scope?: KitchenNotificationScope,
): WaiterNotification[] {
  const scoped = scope
    ? scopeKitchenNotifications(notifications, scope)
    : notifications;
  return scoped.filter((n) => notificationMatchesTable(table, n));
}

export function shouldShowTableKitchenReadyDot(
  table: MobileTable,
  notifications: WaiterNotification[],
  tieToWaiterNotifications: boolean,
  scope?: KitchenNotificationScope,
): boolean {
  if (!tieToWaiterNotifications) {
    if (!table.session) return false;
    return hasKitchenReadyItems(table.session.orderLines);
  }

  return pendingNotificationsForTable(table, notifications, scope).length > 0;
}

export function kitchenReadyDotTitle(
  table: MobileTable,
  notifications: WaiterNotification[],
  tieToWaiterNotifications: boolean,
  scope?: KitchenNotificationScope,
): string {
  if (!tieToWaiterNotifications) {
    const lines = table.session?.orderLines ?? [];
    const count = lines
      .filter((l) => l.status === 'delivered')
      .reduce((s, l) => s + l.quantity, 0);
    if (count <= 0) return '';
    return `Pronto na cozinha${count > 1 ? ` (${count} itens)` : ''}`;
  }

  const pending = pendingNotificationsForTable(table, notifications, scope);
  const count = pending.reduce((s, n) => s + n.quantity, 0);
  if (count <= 0) return '';
  return `Pronto na cozinha${count > 1 ? ` (${count} itens)` : ''} — retirar para a mesa`;
}
