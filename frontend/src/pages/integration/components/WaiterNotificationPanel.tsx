import React from 'react';
import { formatItemQty } from '../../pdv/pdvUtils';
import { WaiterNotification } from '../waiterNotificationTypes';
import './WaiterNotificationPanel.css';

type WaiterNotificationPanelProps = {
  items: WaiterNotification[];
  updatingId: string | null;
  onRead: (id: string) => void;
  onDelivered: (id: string) => void;
};

function tableLabel(n: WaiterNotification): string {
  if (n.tableNumber != null) return `Mesa ${n.tableNumber}`;
  if (n.tableLabel) return n.tableLabel;
  return `Pedido #${n.orderNumber}`;
}

const WaiterNotificationPanel: React.FC<WaiterNotificationPanelProps> = ({
  items,
  updatingId,
  onRead,
  onDelivered,
}) => {
  if (items.length === 0) return null;

  return (
    <section className="waiter-notif-panel" aria-label="Pedidos prontos na cozinha">
      <header className="waiter-notif-panel-head">
        <span className="catalog-pill is-solid is-muted" aria-hidden>
          {items.length}
        </span>
        <div>
          <strong>Pronto na cozinha</strong>
          <p>Retire na cozinha e confirme quando entregar na mesa.</p>
        </div>
      </header>

      <ul className="waiter-notif-list">
        {items.map((n) => {
          const busy = updatingId === n.id;
          return (
            <li key={n.id} className="waiter-notif-card">
              <div className="waiter-notif-card-body">
                <span className="waiter-notif-mesa">{tableLabel(n)}</span>
                {n.zone ? <span className="waiter-notif-zone">{n.zone}</span> : null}
                <p className="waiter-notif-product">
                  <span className="waiter-notif-qty">{formatItemQty(n.quantity)}×</span> {n.productName}
                </p>
                <time className="waiter-notif-time" dateTime={n.createdAt}>
                  Pronto às{' '}
                  {new Date(n.createdAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>
              <div className="waiter-notif-actions">
                <button
                  type="button"
                  className="waiter-notif-btn waiter-notif-btn--ghost"
                  disabled={Boolean(updatingId)}
                  onClick={() => onRead(n.id)}
                >
                  {busy ? '…' : 'Marcar como lida'}
                </button>
                <button
                  type="button"
                  className="waiter-notif-btn waiter-notif-btn--primary"
                  disabled={Boolean(updatingId)}
                  onClick={() => onDelivered(n.id)}
                >
                  {busy ? '…' : 'Entregue na mesa'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default WaiterNotificationPanel;
