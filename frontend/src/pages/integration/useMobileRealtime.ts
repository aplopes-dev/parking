import { useCallback, useEffect, useRef, useState } from 'react';
import { MobileTable, WsConnectionState } from './smartPosTypes';
import { WaiterNotification } from './waiterNotificationTypes';

export function buildMobileWsUrl(token: string): string {
  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3071';
  const url = new URL(apiBase);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  const basePath = url.pathname.replace(/\/$/, '');
  url.pathname = `${basePath}/mobile/ws`;
  url.search = `?token=${encodeURIComponent(token)}`;
  return url.toString();
}

type Options = {
  enabled: boolean;
  onTablesUpdate: (tables: MobileTable[], source?: string) => void;
  onWaiterNotification?: (payload: WaiterNotification | WaiterNotification[]) => void;
};

export function useMobileRealtime({ enabled, onTablesUpdate, onWaiterNotification }: Options) {
  const [wsState, setWsState] = useState<WsConnectionState>('offline');
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTablesRef = useRef(onTablesUpdate);
  onTablesRef.current = onTablesUpdate;
  const onWaiterRef = useRef(onWaiterNotification);
  onWaiterRef.current = onWaiterNotification;

  const disconnect = useCallback(() => {
    if (retryRef.current) {
      clearTimeout(retryRef.current);
      retryRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsState('offline');
  }, []);

  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!enabled || !token) {
      disconnect();
      return;
    }

    disconnect();
    setWsState('connecting');

    const ws = new WebSocket(buildMobileWsUrl(token));
    wsRef.current = ws;

    ws.onopen = () => setWsState('live');

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as {
          event: string;
          data?: {
            tables?: MobileTable[];
            source?: string;
            notification?: WaiterNotification;
            notifications?: WaiterNotification[];
          };
        };
        if (
          (msg.event === 'tables.updated' || msg.event === 'tables.snapshot') &&
          msg.data?.tables
        ) {
          setLastEvent(msg.data.source ?? msg.event);
          onTablesRef.current(msg.data.tables, msg.data.source);
        }
        if (msg.event === 'waiter.notification' && msg.data?.notification) {
          onWaiterRef.current?.(msg.data.notification);
        }
        if (msg.event === 'waiter.notifications.snapshot' && msg.data?.notifications) {
          onWaiterRef.current?.(msg.data.notifications);
        }
      } catch {
        /* ignore malformed */
      }
    };

    ws.onclose = (ev) => {
      wsRef.current = null;
      setWsState('offline');
      if (process.env.NODE_ENV === 'development' && ev.code !== 1000) {
        console.warn('[SmartPOS WS] desconectado', ev.code, ev.reason || '');
      }
      if (enabled && localStorage.getItem('token')) {
        retryRef.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[SmartPOS WS] falha na conexão — verifique proxy/nginx em /api/mobile/ws');
      }
      ws.close();
    };
  }, [enabled, disconnect]);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return { wsState, lastEvent, reconnect: connect };
}
