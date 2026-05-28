import React, { useMemo } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import { useKitchenQueue } from './useKitchenQueue';
import { groupKitchenItemsByTable, tableDisplayLabel } from './kitchenQueueUtils';
import KitchenWaitTimer from './KitchenWaitTimer';
import { formatItemQty } from '../pdv/pdvUtils';
import './KitchenQueue.css';

const KitchenQueue: React.FC = () => {
  const { pdvRole } = usePermissions();
  const { items, loading, error, markingId, markReady, reload } = useKitchenQueue({
    enabled: true,
  });

  const groups = useMemo(() => groupKitchenItemsByTable(items), [items]);
  const pendingCount = items.length;

  const stats = (
    <section className="catalog-stats-grid kitchen-stats">
      <article className="catalog-stat-card">
        <span>Na fila</span>
        <strong>{pendingCount}</strong>
        <p>{pendingCount === 1 ? 'Item aguardando' : 'Itens aguardando'} preparo.</p>
      </article>
      <article className="catalog-stat-card">
        <span>Mesas</span>
        <strong>{groups.length}</strong>
        <p>Destinos com pedidos em produção.</p>
      </article>
    </section>
  );

  return (
    <CatalogPageLayout
      className="kitchen-page-wrap"
      moduleLabel="Produção"
      modulePath="/producao/kds"
      title="Fila de produção"
      description="Toque no card do item quando estiver pronto para retirada no salão."
      loading={loading && items.length === 0}
      loadingDescription="Carregando fila da cozinha…"
      stats={!loading || items.length > 0 ? stats : undefined}
      actions={
        <>
          <span className="catalog-pill is-role" aria-live="polite">
            {pendingCount} {pendingCount === 1 ? 'item' : 'itens'}
          </span>
          <button type="button" className="catalog-action-button is-secondary" onClick={() => void reload()}>
            Atualizar
          </button>
        </>
      }
    >
      {error ? (
        <p className="kitchen-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading && items.length === 0 ? null : items.length === 0 ? (
        <section className="catalog-surface">
          <div className="catalog-empty">Nenhum item aguardando preparo.</div>
        </section>
      ) : (
        <section className="catalog-surface kitchen-board-surface">
          <div className="kitchen-board" aria-label="Fila da cozinha">
            {groups.map((group) => (
              <section key={group.key} className="kitchen-table-group">
                <header className="kitchen-table-group-head">
                  <span className="kitchen-table-destination">
                    {group.tableNumber != null ? group.tableNumber : '—'}
                  </span>
                  <div className="kitchen-table-group-meta">
                    <strong>{tableDisplayLabel(group.items[0])}</strong>
                    {group.zone ? <span className="kitchen-zone">{group.zone}</span> : null}
                    <span className="kitchen-order">Pedido #{group.orderNumber}</span>
                  </div>
                </header>

                <ul className="kitchen-queue">
                  {group.items.map((item) => {
                    const isMarking = markingId === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={`kitchen-card${isMarking ? ' is-marking' : ''}`}
                          disabled={Boolean(markingId)}
                          aria-busy={isMarking}
                          onClick={() => void markReady(item.id)}
                        >
                          <div className="kitchen-card-top">
                            <div className="kitchen-card-product">
                              <span className="kitchen-qty">{formatItemQty(item.quantity)}×</span>
                              <span className="kitchen-product-name">{item.productName}</span>
                            </div>
                            <KitchenWaitTimer sentAt={item.sentAt} />
                          </div>
                          {item.notes ? (
                            <p className="kitchen-notes">Obs.: {item.notes}</p>
                          ) : null}
                          <footer className="kitchen-card-foot">
                            <time dateTime={item.sentAt}>
                              Enviado{' '}
                              {new Date(item.sentAt).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </time>
                            <span className="kitchen-card-cta">
                              {isMarking ? 'Marcando…' : 'Marcar pronto'}
                            </span>
                          </footer>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </section>
      )}

      {pdvRole !== 'cozinha' && pdvRole === 'admin' ? (
        <p className="kitchen-admin-hint">
          Visão administrativa — valores e pagamentos ficam no painel de mesas.
        </p>
      ) : null}
    </CatalogPageLayout>
  );
};

export default KitchenQueue;
