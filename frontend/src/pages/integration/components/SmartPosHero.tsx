import React from 'react';
import { WsConnectionState } from '../smartPosTypes';

type SmartPosHeroProps = {
  isDashboard: boolean;
  apiBase: string;
  lastEvent: string | null;
  wsState: WsConnectionState;
  onReconnect: () => void;
};

const SmartPosHero: React.FC<SmartPosHeroProps> = ({
  isDashboard,
  apiBase,
  lastEvent,
  wsState,
  onReconnect,
}) => {
  const wsLabel =
    wsState === 'live'
      ? 'Ao vivo'
      : wsState === 'connecting'
        ? 'Conectando…'
        : 'Offline';

  return (
    <header className="smartpos-hero">
      <div>
        <span className="catalog-section-kicker">
          {isDashboard ? 'Início · food-app' : 'Integração · food-app'}
        </span>
        <h1>{isDashboard ? 'Salão em tempo real' : 'SmartPOS · Salão em tempo real'}</h1>
        <p>
          Painel espelha o app Android. Alterações no terminal ou aqui atualizam todas as telas
          conectadas via WebSocket.
        </p>
        <p className="smartpos-hero-meta">
          API: {apiBase}
          {lastEvent ? ` · último evento: ${lastEvent}` : ''}
        </p>
      </div>
      <div className="smartpos-hero-actions">
        <div
          className={`smartpos-live${wsState === 'live' ? ' is-live' : ''}${wsState === 'connecting' ? ' is-connecting' : ''}`}
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="smartpos-live-dot" aria-hidden />
          {wsLabel}
        </div>
        <button
          type="button"
          className="catalog-action-button is-secondary smartpos-reconnect-btn"
          onClick={onReconnect}
        >
          Reconectar WS
        </button>
      </div>
    </header>
  );
};

export default SmartPosHero;
