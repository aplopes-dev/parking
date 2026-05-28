import React, { useCallback, useContext, useEffect, useState } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import { Order, OrderStatus } from '../../types';
import { formatMoney, orderStatusLabel } from './pdvUtils';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import '../delivery/DeliveryPages.css';
import './Pdv.css';

const COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: 'confirmado', label: 'Confirmado' },
  { status: 'preparando', label: 'Preparando' },
  { status: 'pronto', label: 'Pronto' },
  { status: 'em_entrega', label: 'Em entrega' },
];

const STATUS_FLOW: OrderStatus[] = COLUMNS.map((c) => c.status);

const STATUS_LABEL: Record<OrderStatus, string> = Object.fromEntries(
  COLUMNS.map((c) => [c.status, c.label]),
) as Record<OrderStatus, string>;

function adjacentStatuses(status: OrderStatus): { prev: OrderStatus | null; next: OrderStatus | null } {
  const index = STATUS_FLOW.indexOf(status);
  if (index < 0) return { prev: null, next: null };
  return {
    prev: index > 0 ? STATUS_FLOW[index - 1] : null,
    next: index < STATUS_FLOW.length - 1 ? STATUS_FLOW[index + 1] : null,
  };
}

const PdvDeliveryPanel: React.FC = () => {
  const { user } = useContext(AuthContext) || {};
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await api.get<Order[]>('/orders', {
      params: { type: 'delivery', openOnly: true, limit: 80 },
    });
    setOrders(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [user, load]);

  const moveStatus = async (orderId: string, status: OrderStatus) => {
    await api.patch(`/orders/${orderId}/status`, { status });
    await load();
  };

  const statsGrid = !loading ? (
    <section className="catalog-stats-grid">
      {COLUMNS.map((col) => (
        <article className="catalog-stat-card" key={col.status}>
          <span>{col.label}</span>
          <strong>{orders.filter((o) => o.status === col.status).length}</strong>
          <p>Pedidos nesta etapa.</p>
        </article>
      ))}
    </section>
  ) : undefined;

  return (
    <CatalogPageLayout
      moduleLabel="PDV"
      modulePath="/pdv/painel-entregas"
      title="Painel de entregas"
      description="Acompanhe pedidos de delivery por estágio de produção e entrega."
      loading={loading}
      loadingDescription="Carregando painel de entregas."
      stats={statsGrid}
    >
      <section className="catalog-surface pdv-delivery-panel-kanban">
        <div className="catalog-section-header">
          <div>
            <span className="catalog-section-kicker">Fluxo</span>
            <h2>Pedidos por etapa</h2>
          </div>
          <p>{orders.length} pedido(s) em andamento</p>
        </div>
        <div className="catalog-kanban">
          {COLUMNS.map((col) => {
            const colOrders = orders.filter((o) => o.status === col.status);
            return (
              <div key={col.status} className="catalog-kanban-col">
                <h3>
                  {col.label} ({colOrders.length})
                </h3>
                {colOrders.length === 0 ? (
                  <div className="catalog-empty pdv-delivery-panel-kanban__empty">Nenhum pedido.</div>
                ) : (
                  colOrders.map((o) => {
                    const { prev, next } = adjacentStatuses(o.status);
                    return (
                      <article key={o.id} className="catalog-card">
                        <div className="catalog-card-headline">
                          <strong>Pedido #{o.orderNumber}</strong>
                          <span>{formatMoney(o.total)}</span>
                        </div>
                        <span className="delivery-card-address">
                          {o.deliveryAddress || 'Sem endereço'}
                        </span>
                        <div className="catalog-chip-row">
                          <span className="catalog-pill is-muted">{orderStatusLabel(o.status)}</span>
                        </div>
                        {(prev || next) && (
                          <div className="catalog-card-actions pdv-delivery-panel-card-actions">
                            {prev ? (
                              <button
                                type="button"
                                className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                                onClick={() => moveStatus(o.id, prev)}
                              >
                                {STATUS_LABEL[prev]}
                              </button>
                            ) : null}
                            {next ? (
                              <button
                                type="button"
                                className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
                                onClick={() => moveStatus(o.id, next)}
                              >
                                {STATUS_LABEL[next]}
                              </button>
                            ) : null}
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </section>
    </CatalogPageLayout>
  );
};

export default PdvDeliveryPanel;
