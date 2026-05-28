import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiError';
import { useToast } from '../../contexts/ToastContext';
import { MobileBootstrap, MobileTable } from './smartPosTypes';
import { mergeTablesFromRealtime } from './smartPosTableMerge';
import { WaiterNotification } from './waiterNotificationTypes';
import { useMobileRealtime } from './useMobileRealtime';

type UseSmartPosBootstrapOptions = {
  enabled: boolean;
  /** Admin/gestor: snapshot WS substitui o mapa (evita merge manter mesa livre). */
  authoritativeTablesRealtime?: boolean;
  /** Recarrega bootstrap em silêncio (fallback se WS falhar). */
  pollTablesIntervalMs?: number;
  onTablesUpdate?: (tables: MobileTable[], source?: string) => void;
  onWaiterNotification?: (payload: WaiterNotification | WaiterNotification[]) => void;
};

export function useSmartPosBootstrap({
  enabled,
  authoritativeTablesRealtime = false,
  pollTablesIntervalMs = 0,
  onTablesUpdate,
  onWaiterNotification,
}: UseSmartPosBootstrapOptions) {
  const toast = useToast();
  const [bootstrap, setBootstrap] = useState<MobileBootstrap | null>(null);
  const [tables, setTables] = useState<MobileTable[]>([]);
  const [loading, setLoading] = useState(true);
  const zoneFilterInitialized = useRef(false);
  const pollSeqRef = useRef(0);

  const handleTablesFromWs = useCallback(
    (next: MobileTable[], source?: string) => {
      pollSeqRef.current += 1;
      if (authoritativeTablesRealtime) {
        setTables(next);
      } else {
        setTables((prev) => mergeTablesFromRealtime(prev, next));
      }
      onTablesUpdate?.(next, source);
    },
    [authoritativeTablesRealtime, onTablesUpdate],
  );

  const { wsState, lastEvent, reconnect } = useMobileRealtime({
    enabled,
    onTablesUpdate: handleTablesFromWs,
    onWaiterNotification,
  });

  const loadBootstrap = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    const seq = ++pollSeqRef.current;
    try {
      const { data } = await api.get<MobileBootstrap>('/mobile/bootstrap');
      if (seq !== pollSeqRef.current) return;
      setBootstrap(data);
      setTables(data.tables);
      if (!zoneFilterInitialized.current) {
        zoneFilterInitialized.current = true;
      }
    } catch (err: unknown) {
      if (seq !== pollSeqRef.current) return;
      toast.error(getApiErrorMessage(err, 'Erro ao carregar dados'));
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [toast]);

  useEffect(() => {
    if (enabled) void loadBootstrap();
  }, [enabled, loadBootstrap]);

  useEffect(() => {
    if (!enabled || !authoritativeTablesRealtime || pollTablesIntervalMs <= 0) {
      return undefined;
    }
    const id = window.setInterval(() => {
      void loadBootstrap({ silent: true });
    }, pollTablesIntervalMs);
    return () => window.clearInterval(id);
  }, [enabled, authoritativeTablesRealtime, pollTablesIntervalMs, loadBootstrap]);

  useEffect(() => {
    if (!enabled || !authoritativeTablesRealtime) return undefined;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadBootstrap({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [enabled, authoritativeTablesRealtime, loadBootstrap]);

  const setTablesAndInvalidatePoll: typeof setTables = useCallback(
    (action) => {
      pollSeqRef.current += 1;
      setTables(action);
    },
    [],
  );

  const zones = useMemo(
    () => Array.from(new Set(tables.map((t) => t.zone))).sort(),
    [tables],
  );

  const stats = useMemo(() => {
    const open = tables.filter(
      (t) => t.status === 'open' || t.status === 'payment_pending',
    ).length;
    const free = tables.filter((t) => t.status === 'free').length;
    const revenue = tables.reduce((s, t) => s + (t.session?.total ?? 0), 0);
    return { open, free, revenue };
  }, [tables]);

  return {
    bootstrap,
    tables,
    setTables: setTablesAndInvalidatePoll,
    zones,
    stats,
    loading,
    loadBootstrap,
    wsState,
    lastEvent,
    reconnect,
    zoneFilterInitialized,
  };
}
