import React from 'react';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { formatMoney } from '../../pdv/pdvUtils';
import {
  type KitchenNotificationScope,
  kitchenReadyDotTitle,
  pendingNotificationsForTable,
  shouldShowTableKitchenReadyDot,
} from '../kitchenReadyIndicator';
import { STATUS_LABEL } from '../smartPosConstants';
import { tableStatusPillClass } from '../../../utils/catalogTags';
import { MobileTable } from '../smartPosTypes';
import { WaiterNotification } from '../waiterNotificationTypes';
import SmartPosTableIcon from './SmartPosTableIcon';

type SmartPosFloorProps = {
  zones: string[];
  selectedZone: string | null;
  onSelectZone: (zone: string | null) => void;
  tables: MobileTable[];
  selectedTableId: string;
  onSelectTable: (id: string) => void;
  isZonePending: boolean;
  isTablesStale: boolean;
  /** Notificações pendentes do garçom (bolinha some ao marcar lida/entregue). */
  waiterNotifications?: WaiterNotification[];
  tieKitchenDotToNotifications?: boolean;
  kitchenNotificationScope?: KitchenNotificationScope;
};

const SmartPosFloor: React.FC<SmartPosFloorProps> = ({
  zones,
  selectedZone,
  onSelectZone,
  tables,
  selectedTableId,
  onSelectTable,
  isZonePending,
  isTablesStale,
  waiterNotifications = [],
  tieKitchenDotToNotifications = false,
  kitchenNotificationScope,
}) => (
  <section className="smartpos-floor" aria-label="Mapa de mesas">
    <div
      className={`smartpos-zone-tabs${isZonePending ? ' is-pending' : ''}`}
      role="tablist"
      aria-label="Zonas do salão"
    >
      <button
        type="button"
        role="tab"
        aria-selected={selectedZone === null}
        className={`smartpos-zone-tab${selectedZone === null ? ' is-active' : ''}`}
        onClick={() => onSelectZone(null)}
      >
        Todas
      </button>
      {zones.map((z) => (
        <button
          key={z}
          type="button"
          role="tab"
          aria-selected={selectedZone === z}
          className={`smartpos-zone-tab${selectedZone === z ? ' is-active' : ''}`}
          onClick={() => onSelectZone(z)}
        >
          {z}
        </button>
      ))}
      {isZonePending ? (
        <LoadingSpinner size="sm" className="smartpos-zone-pending-spinner" />
      ) : null}
    </div>

    <div
      className={`smartpos-floor-grid${isTablesStale ? ' is-stale' : ''}`}
      aria-busy={isTablesStale}
    >
      {tables.map((t) => {
        const hasKitchenReady = shouldShowTableKitchenReadyDot(
          t,
          waiterNotifications,
          tieKitchenDotToNotifications,
          kitchenNotificationScope,
        );
        const pendingForTable = tieKitchenDotToNotifications
          ? pendingNotificationsForTable(t, waiterNotifications, kitchenNotificationScope)
          : [];
        const readyCount = tieKitchenDotToNotifications
          ? pendingForTable.reduce((s, n) => s + n.quantity, 0)
          : 0;
        const dotTitle = kitchenReadyDotTitle(
          t,
          waiterNotifications,
          tieKitchenDotToNotifications,
          kitchenNotificationScope,
        );

        return (
        <button
          key={t.id}
          type="button"
          className={`smartpos-table-card status-${t.status}${t.id === selectedTableId ? ' is-selected' : ''}`}
          onClick={() => onSelectTable(t.id)}
          aria-pressed={t.id === selectedTableId}
          aria-label={
            hasKitchenReady
              ? `Mesa ${t.number}, ${readyCount || 1} ${(readyCount || 1) === 1 ? 'item pronto' : 'itens prontos'} na cozinha`
              : undefined
          }
        >
          {hasKitchenReady ? (
            <span className="smartpos-table-ready-dot" title={dotTitle} aria-hidden />
          ) : null}
          <SmartPosTableIcon className="smartpos-table-icon" />
          <span className="smartpos-table-number">Mesa {t.number}</span>
          <span className="smartpos-table-meta">
            {t.zone} · até {t.capacity} pessoas
          </span>
          <span className={tableStatusPillClass(t.status)}>
            {STATUS_LABEL[t.status]}
          </span>
          {t.session ? (
            <span className="smartpos-table-meta">
              #{t.session.orderNumber} · {formatMoney(t.session.total)}
            </span>
          ) : null}
        </button>
        );
      })}
    </div>
  </section>
);

export default SmartPosFloor;
