import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import AlertModal from '../../components/AlertModal';
import ConfirmModal from '../../components/ConfirmModal';
import PremiumSelect from '../../components/PremiumSelect';
import { AuthContext } from '../../contexts/AuthContext';
import {
  assignDeliveryOrder,
  createCourier,
  createRoute,
  deleteCourier,
  deleteRoute,
  fetchCouriers,
  fetchDeliveryOrders,
  fetchDeliveryOverview,
  fetchRoutes,
  updateCourier,
  updateDeliveryAssignmentStatus,
} from '../../services/deliveryApi';
import { formatMoney } from '../finance/financeShared';
import { orderStatusLabel } from '../pdv/pdvUtils';
import './DeliveryPages.css';

function errMsg(e: unknown): string {
  const ax = e as { response?: { data?: { message?: string } } };
  return ax.response?.data?.message || 'Erro ao processar.';
}

function useDeliveryAccess() {
  const { user } = useContext(AuthContext) || {};
  return Boolean(user);
}

function AccessDenied() {
  return (
    <div className="catalog-page catalog-page--ifood">
      <div className="catalog-empty">Acesso negado.</div>
    </div>
  );
}

const ASSIGNMENT_LABEL: Record<string, string> = {
  pending: 'Aguardando',
  assigned: 'Atribuído',
  picked_up: 'Saiu',
  delivered: 'Entregue',
  failed: 'Falhou',
};

const COURIER_STATUS_LABEL: Record<string, string> = {
  available: 'Disponível',
  busy: 'Em entrega',
  offline: 'Offline',
};

const VEHICLE_OPTIONS = [
  { value: 'moto', label: 'Moto' },
  { value: 'bike', label: 'Bicicleta' },
  { value: 'car', label: 'Carro' },
];

type AlertState = { open: boolean; message: string; type: 'error' | 'success' };

// —— Gerenciamento ——
export const DeliveryManagementPage: React.FC = () => {
  const can = useDeliveryAccess();
  const [orders, setOrders] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [overview, setOverview] = useState<{
    openOrders: number;
    pending: number;
    inTransit: number;
    deliveredToday: number;
  } | null>(null);
  const [assignOrderId, setAssignOrderId] = useState('');
  const [assignCourierId, setAssignCourierId] = useState('');
  const [alert, setAlert] = useState<AlertState>({ open: false, message: '', type: 'success' });

  const load = useCallback(async () => {
    const [o, c, ov] = await Promise.all([
      fetchDeliveryOrders({ openOnly: true }),
      fetchCouriers(),
      fetchDeliveryOverview(),
    ]);
    setOrders(o);
    setCouriers(c.filter((x: any) => x.active));
    setOverview(ov);
  }, []);

  useEffect(() => {
    if (can) {
      load();
      const t = setInterval(load, 20000);
      return () => clearInterval(t);
    }
  }, [can, load]);

  const stats = useMemo(
    () =>
      overview ? (
        <section className="catalog-stats-grid" aria-label="Resumo de entregas">
          <article className="catalog-stat-card">
            <span>Em aberto</span>
            <strong>{overview.openOrders}</strong>
            <p>Pedidos delivery ainda não finalizados.</p>
          </article>
          <article className="catalog-stat-card">
            <span>Pendentes</span>
            <strong>{overview.pending}</strong>
            <p>Aguardando atribuição de entregador.</p>
          </article>
          <article className="catalog-stat-card">
            <span>Em rota</span>
            <strong>{overview.inTransit}</strong>
            <p>Pedidos saíram para entrega.</p>
          </article>
          <article className="catalog-stat-card">
            <span>Entregues hoje</span>
            <strong>{overview.deliveredToday}</strong>
            <p>Concluídos no dia atual.</p>
          </article>
        </section>
      ) : undefined,
    [overview],
  );

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout
      className="delivery-page"
      moduleLabel="Entregas"
      modulePath="/entregas/gerenciamento"
      title="Gerenciamento de entregas"
      description="Atribua entregadores e acompanhe pedidos delivery em andamento."
      stats={stats}
      actions={
        <button
          type="button"
          className="catalog-action-button is-secondary"
          onClick={() => void load()}
        >
          Atualizar
        </button>
      }
    >
      <section className="catalog-surface catalog-form-surface--premium">
        <div className="catalog-section-header">
          <div>
            <span className="catalog-section-kicker">Operação</span>
            <h2>Atribuir entregador</h2>
          </div>
        </div>
        <div className="delivery-assign-toolbar">
          <PremiumSelect
            label="Pedido"
            value={assignOrderId}
            options={[
              { value: '', label: 'Selecione' },
              ...orders.map((o) => ({
                value: o.id,
                label: `#${o.orderNumber} — ${o.deliveryAddress?.slice(0, 30) ?? 'sem endereço'}`,
              })),
            ]}
            onChange={setAssignOrderId}
          />
          <PremiumSelect
            label="Entregador"
            value={assignCourierId}
            options={[
              { value: '', label: 'Selecione' },
              ...couriers.map((c) => ({ value: c.id, label: c.name })),
            ]}
            onChange={setAssignCourierId}
          />
          <button
            type="button"
            className="catalog-action-button"
            disabled={!assignOrderId || !assignCourierId}
            onClick={async () => {
              try {
                await assignDeliveryOrder(assignOrderId, { courierId: assignCourierId });
                setAssignOrderId('');
                setAssignCourierId('');
                await load();
                setAlert({ open: true, message: 'Entregador atribuído.', type: 'success' });
              } catch (err) {
                setAlert({ open: true, message: errMsg(err), type: 'error' });
              }
            }}
          >
            Atribuir
          </button>
        </div>
      </section>

      <section className="catalog-surface delivery-orders-surface">
        <div className="catalog-section-header">
          <div>
            <span className="catalog-section-kicker">Pedidos</span>
            <h2>Em andamento</h2>
          </div>
          <p>{orders.length} pedido(s)</p>
        </div>
        {orders.length === 0 ? (
          <div className="catalog-empty">Nenhum pedido delivery em aberto.</div>
        ) : (
          <div className="catalog-grid" aria-label="Pedidos delivery">
            {orders.map((o) => {
              const a = o.deliveryAssignment;
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
                    <span className="catalog-pill is-muted">
                      {a
                        ? `${ASSIGNMENT_LABEL[a.status] ?? a.status} — ${a.courier?.name ?? '—'}`
                        : 'Sem atribuição'}
                    </span>
                  </div>
                  <div className="catalog-card-actions">
                    {a?.status !== 'picked_up' && a?.status !== 'delivered' && (
                      <button
                        type="button"
                        className="catalog-card-button"
                        onClick={async () => {
                          await updateDeliveryAssignmentStatus(o.id, { status: 'picked_up' });
                          await load();
                        }}
                      >
                        Saiu para entrega
                      </button>
                    )}
                    {a?.status !== 'delivered' && (
                      <button
                        type="button"
                        className="catalog-card-button"
                        onClick={async () => {
                          await updateDeliveryAssignmentStatus(o.id, { status: 'delivered' });
                          await load();
                        }}
                      >
                        Marcar entregue
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <AlertModal
        isOpen={alert.open}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ open: false, message: '', type: 'success' })}
      />
    </CatalogPageLayout>
  );
};

// —— Entregadores e rotas ——
export const DeliveryMotoboysPage: React.FC = () => {
  const can = useDeliveryAccess();
  const [couriers, setCouriers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [updatingCourierId, setUpdatingCourierId] = useState<string | null>(null);
  const [courierForm, setCourierForm] = useState({ name: '', phone: '', vehicle: 'moto' });
  const [routeForm, setRouteForm] = useState({ name: '', zoneLabel: '', color: '#ea1d2c' });
  const [alert, setAlert] = useState<AlertState>({ open: false, message: '', type: 'success' });
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'courier' | 'route';
    id: string;
    label: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setCouriers(await fetchCouriers());
    setRoutes(await fetchRoutes());
  }, []);

  useEffect(() => {
    if (can) load();
  }, [can, load]);

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      if (confirmDelete.type === 'courier') {
        await deleteCourier(confirmDelete.id);
      } else {
        await deleteRoute(confirmDelete.id);
      }
      setConfirmDelete(null);
      setAlert({ open: true, message: confirmDelete.type === 'courier' ? 'Entregador excluído.' : 'Rota excluída.', type: 'success' });
      try { await load(); } catch { /* silent */ }
    } catch (err) {
      setConfirmDelete(null);
      setAlert({ open: true, message: errMsg(err), type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  if (!can) return <AccessDenied />;

  return (
    <CatalogPageLayout
      className="delivery-page"
      moduleLabel="Entregas"
      modulePath="/entregas/gerenciamento"
      title="Entregadores e rotas"
      description="Cadastre entregadores e zonas de entrega."
      actions={
        <button
          type="button"
          className="catalog-action-button is-secondary"
          onClick={() => void load()}
        >
          Atualizar
        </button>
      }
    >
      <section className="catalog-surface catalog-form-surface--premium">
        <div className="catalog-section-header">
          <div>
            <span className="catalog-section-kicker">Equipe</span>
            <h2>Novo entregador</h2>
          </div>
        </div>
        <form
          className="catalog-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const body: Record<string, string> = { name: courierForm.name.trim(), vehicle: courierForm.vehicle };
            if (courierForm.phone.trim()) body.phone = courierForm.phone.trim();
            try {
              await createCourier(body);
            } catch (err) {
              setAlert({ open: true, message: errMsg(err), type: 'error' });
              return;
            }
            setCourierForm({ name: '', phone: '', vehicle: 'moto' });
            setAlert({ open: true, message: 'Entregador cadastrado.', type: 'success' });
            try { await load(); } catch { /* silent */ }
          }}
        >
          <div className="catalog-form-grid">
            <div className="form-group">
              <label htmlFor="courier-name">Nome</label>
              <input
                id="courier-name"
                className="premium-text-input"
                value={courierForm.name}
                onChange={(e) => setCourierForm({ ...courierForm, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="courier-phone">Telefone</label>
              <input
                id="courier-phone"
                className="premium-text-input"
                value={courierForm.phone}
                onChange={(e) => setCourierForm({ ...courierForm, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <PremiumSelect
                label="Veículo"
                value={courierForm.vehicle}
                options={VEHICLE_OPTIONS}
                onChange={(v) => setCourierForm({ ...courierForm, vehicle: v })}
              />
            </div>
          </div>
          <div className="catalog-form-footer">
            <button
              type="submit"
              className="catalog-form-footer-btn catalog-form-footer-btn--primary"
            >
              Adicionar entregador
            </button>
          </div>
        </form>
      </section>

      <section className="catalog-surface">
        <div className="catalog-section-header">
          <div>
            <span className="catalog-section-kicker">Equipe</span>
            <h2>Entregadores cadastrados</h2>
          </div>
          <p>{couriers.length} registro(s)</p>
        </div>
        {couriers.length === 0 ? (
          <div className="catalog-empty">Nenhum entregador cadastrado.</div>
        ) : (
          <div className="delivery-table-wrap">
            <table className="delivery-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>Veículo</th>
                  <th>Status</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {couriers.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.phone ?? '—'}</td>
                    <td>{VEHICLE_OPTIONS.find((v) => v.value === c.vehicle)?.label ?? c.vehicle}</td>
                    <td>
                      <span className="catalog-pill is-muted">
                        {COURIER_STATUS_LABEL[c.status] ?? c.status}
                        {!c.active ? ' · inativo' : ''}
                      </span>
                    </td>
                    <td>
                      <div className="delivery-table-actions">
                        <label className="delivery-toggle" title={c.active ? 'Desativar entregador' : 'Ativar entregador'}>
                          <input
                            type="checkbox"
                            checked={Boolean(c.active)}
                            disabled={updatingCourierId === c.id}
                            onChange={async () => {
                              setUpdatingCourierId(c.id);
                              try {
                                await updateCourier(c.id, { active: !c.active });
                                await load();
                              } catch (err) {
                                setAlert({ open: true, message: errMsg(err), type: 'error' });
                              } finally {
                                setUpdatingCourierId(null);
                              }
                            }}
                          />
                          <span className="delivery-toggle__slider" aria-hidden />
                          <span className="delivery-toggle__label">{c.active ? 'Ativo' : 'Inativo'}</span>
                        </label>
                        <button
                          type="button"
                          className="catalog-action-button is-secondary"
                          onClick={() => setConfirmDelete({ type: 'courier', id: c.id, label: c.name })}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="catalog-surface catalog-form-surface--premium">
        <div className="catalog-section-header">
          <div>
            <span className="catalog-section-kicker">Rotas</span>
            <h2>Nova rota / zona</h2>
          </div>
        </div>
        <form
          className="catalog-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const body: Record<string, string> = { name: routeForm.name.trim(), color: routeForm.color };
            if (routeForm.zoneLabel.trim()) body.zoneLabel = routeForm.zoneLabel.trim();
            try {
              await createRoute(body);
            } catch (err) {
              setAlert({ open: true, message: errMsg(err), type: 'error' });
              return;
            }
            setRouteForm({ name: '', zoneLabel: '', color: '#ea1d2c' });
            setAlert({ open: true, message: 'Rota cadastrada.', type: 'success' });
            try { await load(); } catch { /* silent */ }
          }}
        >
          <div className="catalog-form-grid">
            <div className="form-group">
              <label htmlFor="route-name">Nome da rota</label>
              <input
                id="route-name"
                className="premium-text-input"
                value={routeForm.name}
                onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="route-zone">Bairro / zona</label>
              <input
                id="route-zone"
                className="premium-text-input"
                value={routeForm.zoneLabel}
                onChange={(e) => setRouteForm({ ...routeForm, zoneLabel: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="route-color">Cor no mapa</label>
              <input
                id="route-color"
                type="color"
                className="premium-text-input"
                value={routeForm.color}
                onChange={(e) => setRouteForm({ ...routeForm, color: e.target.value })}
                style={{ padding: 4, height: 48 }}
              />
            </div>
          </div>
          <div className="catalog-form-footer">
            <button
              type="submit"
              className="catalog-form-footer-btn catalog-form-footer-btn--primary"
            >
              Adicionar rota
            </button>
          </div>
        </form>
      </section>

      <section className="catalog-surface">
        <div className="catalog-section-header">
          <div>
            <span className="catalog-section-kicker">Rotas</span>
            <h2>Rotas cadastradas</h2>
          </div>
          <p>{routes.length} registro(s)</p>
        </div>
        {routes.length === 0 ? (
          <div className="catalog-empty">Nenhuma rota cadastrada.</div>
        ) : (
          <div className="delivery-table-wrap">
            <table className="delivery-table">
              <thead>
                <tr>
                  <th>Rota</th>
                  <th>Zona</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {routes.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span
                        className="delivery-route-swatch"
                        style={{ backgroundColor: r.color ?? '#ea1d2c' }}
                        aria-hidden
                      />
                      {r.name}
                    </td>
                    <td>{r.zoneLabel ?? '—'}</td>
                    <td>
                      <div className="delivery-table-actions">
                        <button
                          type="button"
                          className="catalog-action-button is-secondary"
                          onClick={() => setConfirmDelete({ type: 'route', id: r.id, label: r.name })}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmModal
        isOpen={Boolean(confirmDelete)}
        title={confirmDelete?.type === 'courier' ? 'Excluir entregador' : 'Excluir rota'}
        message={`Deseja excluir "${confirmDelete?.label ?? ''}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
        isLoading={deleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setConfirmDelete(null)}
      />
      <AlertModal
        isOpen={alert.open}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ open: false, message: '', type: 'success' })}
      />
    </CatalogPageLayout>
  );
};
