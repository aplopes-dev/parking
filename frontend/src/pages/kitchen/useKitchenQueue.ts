import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiError';
import { buildMobileWsUrl } from '../integration/useMobileRealtime';
import { KitchenQueueItem } from './kitchenTypes';

type Options = {
  enabled: boolean;
};

export function useKitchenQueue({ enabled }: Options) {
  const [items, setItems] = useState<KitchenQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const loadQueue = useCallback(async (silent = false) => {
    if (!enabled) return;
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get<KitchenQueueItem[]>('/mobile/kitchen/queue');
      setItems(data);
      setError(null);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Falha ao carregar fila da cozinha'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (!enabled) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const connect = () => {
      const ws = new WebSocket(buildMobileWsUrl(token));
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as { event?: string };
          if (msg.event === 'kitchen.updated' || msg.event === 'tables.updated') {
            void loadQueue(true);
          }
        } catch {
          /* ignore */
        }
      };
    };

    connect();
    const poll = window.setInterval(() => void loadQueue(true), 5_000);

    const onFocus = () => void loadQueue(true);
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(poll);
      window.removeEventListener('focus', onFocus);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [enabled, loadQueue]);

  const markReady = useCallback(
    async (itemId: string) => {
      setMarkingId(itemId);
      try {
        await api.post(`/mobile/kitchen/items/${itemId}/ready`);
        setItems((prev) => prev.filter((i) => i.id !== itemId));
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'Falha ao marcar item como pronto'));
      } finally {
        setMarkingId(null);
      }
    },
    [],
  );

  return { items, loading, error, markingId, markReady, reload: () => loadQueue() };
}
