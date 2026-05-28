import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiError';
import { WaiterNotification } from './waiterNotificationTypes';

type Options = {
  enabled: boolean;
  /** Admin/gestor/RH: todas as notificações pendentes do salão. */
  viewAllSalon?: boolean;
  currentUserId?: string;
};

function upsertNotifications(
  prev: WaiterNotification[],
  incoming: WaiterNotification[],
): WaiterNotification[] {
  const map = new Map(prev.map((n) => [n.id, n]));
  for (const n of incoming) {
    if (n.status === 'pending') {
      map.set(n.id, n);
    } else {
      map.delete(n.id);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function useWaiterNotifications({
  enabled,
  viewAllSalon = false,
  currentUserId,
}: Options) {
  const [items, setItems] = useState<WaiterNotification[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const { data } = await api.get<WaiterNotification[]>(
        '/mobile/waiter-notifications',
        { params: viewAllSalon ? { scope: 'salon' } : undefined },
      );
      setItems(data);
    } catch {
      /* silencioso — garçom pode estar offline */
    }
  }, [enabled, viewAllSalon]);

  useEffect(() => {
    void load();
  }, [load]);

  const pushFromWs = useCallback(
    (incoming: WaiterNotification | WaiterNotification[]) => {
      const list = Array.isArray(incoming) ? incoming : [incoming];
      const scoped = viewAllSalon
        ? list
        : list.filter((n) => n.targetUserId === currentUserId);
      if (scoped.length === 0) return;
      setItems((prev) => upsertNotifications(prev, scoped));
    },
    [viewAllSalon, currentUserId],
  );

  const resolve = useCallback(
    async (id: string, status: 'read' | 'delivered') => {
      setUpdatingId(id);
      try {
        await api.patch(`/mobile/waiter-notifications/${id}`, { status });
        setItems((prev) => prev.filter((n) => n.id !== id));
      } catch (err: unknown) {
        throw new Error(getApiErrorMessage(err, 'Falha ao atualizar notificação'));
      } finally {
        setUpdatingId(null);
      }
    },
    [],
  );

  return { items, updatingId, reload: load, pushFromWs, resolve };
}
