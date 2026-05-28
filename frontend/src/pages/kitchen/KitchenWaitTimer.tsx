import React, { useEffect, useState } from 'react';
import {
  elapsedSeconds,
  formatElapsed,
  waitUrgency,
} from './kitchenTimerUtils';

type KitchenWaitTimerProps = {
  sentAt: string;
  className?: string;
};

const KitchenWaitTimer: React.FC<KitchenWaitTimerProps> = ({ sentAt, className = '' }) => {
  const [seconds, setSeconds] = useState(() => elapsedSeconds(sentAt));

  useEffect(() => {
    setSeconds(elapsedSeconds(sentAt));
    const id = window.setInterval(() => {
      setSeconds(elapsedSeconds(sentAt));
    }, 1000);
    return () => window.clearInterval(id);
  }, [sentAt]);

  const urgency = waitUrgency(seconds);
  const label = formatElapsed(seconds);

  return (
    <div
      className={`kitchen-wait-timer kitchen-wait-timer--${urgency}${className ? ` ${className}` : ''}`}
      role="timer"
      aria-live="off"
      aria-label={`Tempo de espera: ${label}`}
      title="Tempo desde o envio à produção"
    >
      <span className="kitchen-wait-timer-icon" aria-hidden>
        ⏱
      </span>
      <span className="kitchen-wait-timer-value">{label}</span>
    </div>
  );
};

export default KitchenWaitTimer;
