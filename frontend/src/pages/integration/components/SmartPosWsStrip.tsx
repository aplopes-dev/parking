import React from 'react';
import { WsConnectionState } from '../smartPosTypes';

type SmartPosWsStripProps = {
  wsState: WsConnectionState;
  onReconnect: () => void;
};

const SmartPosWsStrip: React.FC<SmartPosWsStripProps> = ({ wsState, onReconnect }) => {
  const wsLabel =
    wsState === 'live'
      ? 'Ao vivo'
      : wsState === 'connecting'
        ? 'Conectando…'
        : 'Offline';

  return (
    <div className="smartpos-ws-strip" aria-live="polite">
      <div
        className={`smartpos-live${wsState === 'live' ? ' is-live' : ''}${wsState === 'connecting' ? ' is-connecting' : ''}`}
      >
        <span className="smartpos-live-dot" aria-hidden />
        {wsLabel}
      </div>
      <button
        type="button"
        className="smartpos-ws-strip-btn"
        onClick={onReconnect}
      >
        Reconectar
      </button>
    </div>
  );
};

export default SmartPosWsStrip;
