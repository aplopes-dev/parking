import React, { useCallback, useEffect, useState } from 'react';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import AlertModal from '../../components/AlertModal';
import {
  cancelValetTicket,
  completeValetParking,
  deliverValetVehicle,
  fetchParkingFacilities,
  fetchParkingSpots,
  fetchParkingTariffs,
  fetchValetQueueSummary,
  fetchValetTickets,
  fetchValetValets,
  markValetReady,
  receiveValetVehicle,
  requestValetRetrieval,
  startValetParking,
  startValetRetrieval,
  type ParkingFacility,
  type ParkingSpot,
  type ParkingTariff,
  type ValetTicket,
  type ValetUser,
} from '../../services/parkingApi';
import { formatMoney } from '../finance/financeShared';
import {
  formatDateTime,
  formatDurationMinutes,
  VALET_STATUS_LABELS,
  VEHICLE_TYPE_LABELS,
} from './parkingConstants';
import './ParkingPages.css';

function errMsg(e: unknown): string {
  const ax = e as { response?: { data?: { message?: string | string[] } } };
  const msg = ax.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' ');
  if (typeof msg === 'string') return msg;
  return 'Erro ao processar.';
}

function useFacilityFilter(facilities: ParkingFacility[]) {
  const [facilityId, setFacilityId] = useState('');
  useEffect(() => {
    if (!facilityId && facilities[0]?.id) setFacilityId(facilities[0].id);
  }, [facilities, facilityId]);
  return { facilityId, setFacilityId };
}

function ValetStatusBadge({ status }: { status: string }) {
  return (
    <span className={`parking-badge parking-badge--valet-${status}`}>
      {VALET_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function ValetTicketCard({
  ticket,
  valets,
  spots,
  onAction,
  onError,
  defaultTariffId,
  mode,
}: {
  ticket: ValetTicket;
  valets: ValetUser[];
  spots: ParkingSpot[];
  onAction: () => void;
  onError: (msg: string) => void;
  defaultTariffId?: string;
  mode: 'intake' | 'parked' | 'delivery';
}) {
  const [valetId, setValetId] = useState(ticket.assignedValetId ?? '');
  const [location, setLocation] = useState(ticket.parkedLocation ?? '');
  const [spotId, setSpotId] = useState(ticket.parkedSpotId ?? '');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      onAction();
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="parking-valet-card">
      <header>
        <span className="parking-plate">{ticket.plate}</span>
        <ValetStatusBadge status={ticket.status} />
      </header>
      <div className="parking-valet-card-meta">
        <div>
          <strong>{ticket.ticketCode}</strong>
          {ticket.keyTag ? <span> · Chave {ticket.keyTag}</span> : null}
        </div>
        {ticket.customerName ? <div>{ticket.customerName}</div> : null}
        {ticket.customerPhone ? <div className="parking-hint">{ticket.customerPhone}</div> : null}
        <div className="parking-hint">
          Recebido {formatDateTime(ticket.receivedAt)} ·{' '}
          {formatDurationMinutes(ticket.receivedAt)}
        </div>
        {ticket.parkedLocation ? (
          <div>
            Local: <strong>{ticket.parkedLocation}</strong>
          </div>
        ) : null}
        {ticket.assignedValet?.name ? (
          <div className="parking-hint">Manobrista: {ticket.assignedValet.name}</div>
        ) : null}
      </div>

      {mode === 'intake' && (
        <div className="parking-valet-card-actions">
          <select value={valetId} onChange={(e) => setValetId(e.target.value)}>
            <option value="">Manobrista</option>
            {valets.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          {ticket.status === 'received' ? (
            <button
              type="button"
              className="catalog-action-button is-secondary"
              disabled={busy}
              onClick={() =>
                void run(() => startValetParking(ticket.id, valetId || undefined))
              }
            >
              Iniciar manobra
            </button>
          ) : null}
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Local (ex: P1 vaga 12)"
          />
          <select value={spotId} onChange={(e) => setSpotId(e.target.value)}>
            <option value="">Vaga cadastrada</option>
            {spots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="catalog-action-button"
            disabled={busy}
            onClick={() =>
              void run(() =>
                completeValetParking(ticket.id, {
                  parkedLocation: location || undefined,
                  parkedSpotId: spotId || undefined,
                  assignedValetId: valetId || undefined,
                }),
              )
            }
          >
            Estacionado
          </button>
        </div>
      )}

      {mode === 'parked' && (
        <div className="parking-valet-card-actions">
          <button
            type="button"
            className="catalog-action-button"
            disabled={busy}
            onClick={() => void run(() => requestValetRetrieval(ticket.id))}
          >
            Cliente solicitou veículo
          </button>
        </div>
      )}

      {mode === 'delivery' && (
        <div className="parking-valet-card-actions">
          <select value={valetId} onChange={(e) => setValetId(e.target.value)}>
            <option value="">Manobrista</option>
            {valets.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          {ticket.status === 'requested' ? (
            <button
              type="button"
              className="catalog-action-button is-secondary"
              disabled={busy}
              onClick={() =>
                void run(() => startValetRetrieval(ticket.id, valetId || undefined))
              }
            >
              Buscar veículo
            </button>
          ) : null}
          {(ticket.status === 'requested' || ticket.status === 'retrieving') && (
            <button
              type="button"
              className="catalog-action-button"
              disabled={busy}
              onClick={() => void run(() => markValetReady(ticket.id))}
            >
              Pronto na saída
            </button>
          )}
          {ticket.status === 'ready' ? (
            <button
              type="button"
              className="catalog-action-button"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  deliverValetVehicle(ticket.id, { tariffId: defaultTariffId }),
                )
              }
            >
              Entregar ao cliente
            </button>
          ) : null}
        </div>
      )}

      <div className="parking-valet-card-footer">
        <button
          type="button"
          className="parking-link-button"
          disabled={busy}
          onClick={() => void run(() => cancelValetTicket(ticket.id))}
        >
          Cancelar
        </button>
      </div>
    </article>
  );
}

export const ParkingValetPage: React.FC = () => {
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [intake, setIntake] = useState<ValetTicket[]>([]);
  const [parked, setParked] = useState<ValetTicket[]>([]);
  const [delivery, setDelivery] = useState<ValetTicket[]>([]);
  const [summary, setSummary] = useState({ intake: 0, parked: 0, delivery: 0, totalActive: 0 });
  const [valets, setValets] = useState<ValetUser[]>([]);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [tariffs, setTariffs] = useState<ParkingTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '' });
  const { facilityId, setFacilityId } = useFacilityFilter(facilities);
  const [form, setForm] = useState({
    plate: '',
    vehicleType: 'car',
    customerName: '',
    customerPhone: '',
    keyTag: '',
  });

  const load = useCallback(async () => {
    const facs = await fetchParkingFacilities();
    setFacilities(facs);
    const fid = facilityId || facs[0]?.id;
    if (!fid) return;

    const [queueSummary, intakeList, parkedList, deliveryList, valetList, spotList, tariffList] =
      await Promise.all([
        fetchValetQueueSummary(fid),
        fetchValetTickets({ facilityId: fid, queue: 'intake' }),
        fetchValetTickets({ facilityId: fid, queue: 'parked' }),
        fetchValetTickets({ facilityId: fid, queue: 'delivery' }),
        fetchValetValets(),
        fetchParkingSpots(fid),
        fetchParkingTariffs({ facilityId: fid, billingType: 'hourly' }),
      ]);

    setSummary(queueSummary);
    setIntake(intakeList);
    setParked(parkedList);
    setDelivery(deliveryList);
    setValets(valetList);
    setSpots(spotList);
    setTariffs(tariffList.filter((t) => t.active));
  }, [facilityId]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setAlert({ open: true, message: 'Erro ao carregar fila valet.' }))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => {
      load().catch(() => undefined);
    }, 30000);
    return () => clearInterval(timer);
  }, [load]);

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) return;
    try {
      await receiveValetVehicle({
        facilityId,
        plate: form.plate,
        vehicleType: form.vehicleType,
        customerName: form.customerName || undefined,
        customerPhone: form.customerPhone || undefined,
        keyTag: form.keyTag || undefined,
      });
      setForm({ plate: '', vehicleType: 'car', customerName: '', customerPhone: '', keyTag: '' });
      await load();
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
    }
  };

  const handleCardAction = async () => {
    try {
      await load();
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
    }
  };

  const defaultTariff = tariffs.find((t) => t.isDefault) ?? tariffs[0];

  return (
    <CatalogPageLayout
      className="parking-page catalog-page--ifood"
      moduleLabel="Estacionamento"
      modulePath="/estacionamento/valet"
      title="Valet Parking"
      description="Fila de manobristas, estacionamento e entrega de veículos."
      loading={loading && !facilities.length}
      loadingDescription="Carregando valet…"
      actions={
        facilities.length ? (
          <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        ) : undefined
      }
    >
      <div className="parking-stat-grid">
        <div className="parking-stat-card parking-stat-card--accent">
          <strong>{summary.intake}</strong>
          <span>Aguardando estacionar</span>
        </div>
        <div className="parking-stat-card">
          <strong>{summary.parked}</strong>
          <span>Veículos guardados</span>
        </div>
        <div className="parking-stat-card parking-stat-card--accent">
          <strong>{summary.delivery}</strong>
          <span>Fila de entrega</span>
        </div>
        <div className="parking-stat-card">
          <strong>{summary.totalActive}</strong>
          <span>Tickets ativos</span>
        </div>
      </div>

      <div className="parking-panel">
        <h3>Receber veículo</h3>
        <form onSubmit={(e) => void handleReceive(e)}>
          <div className="parking-form-grid">
            <div>
              <label htmlFor="valet-plate">Placa</label>
              <input
                id="valet-plate"
                required
                value={form.plate}
                onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value.toUpperCase() }))}
                placeholder="ABC1D23"
              />
            </div>
            <div>
              <label htmlFor="valet-type">Tipo</label>
              <select
                id="valet-type"
                value={form.vehicleType}
                onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))}
              >
                {Object.entries(VEHICLE_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="valet-customer">Cliente</label>
              <input
                id="valet-customer"
                value={form.customerName}
                onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="valet-phone">Telefone</label>
              <input
                id="valet-phone"
                value={form.customerPhone}
                onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="valet-key">Etiqueta / chave</label>
              <input
                id="valet-key"
                value={form.keyTag}
                onChange={(e) => setForm((f) => ({ ...f, keyTag: e.target.value }))}
                placeholder="001"
              />
            </div>
          </div>
          <div className="parking-actions-row">
            <button type="submit" className="catalog-action-button">
              Gerar ticket valet
            </button>
            {defaultTariff ? (
              <span className="parking-hint">
                Tarifa rotativa na entrega: {formatMoney(defaultTariff.price)}/h
              </span>
            ) : null}
          </div>
        </form>
      </div>

      <div className="parking-valet-columns">
        <section className="parking-panel">
          <h3>Fila de recebimento ({intake.length})</h3>
          {intake.length === 0 ? (
            <p className="parking-empty">Nenhum veículo aguardando manobra.</p>
          ) : (
            <div className="parking-valet-list">
              {intake.map((t) => (
                <ValetTicketCard
                  key={t.id}
                  ticket={t}
                  valets={valets}
                  spots={spots}
                  mode="intake"
                  onAction={() => void handleCardAction()}
                  onError={(msg) => setAlert({ open: true, message: msg })}
                  defaultTariffId={defaultTariff?.id}
                />
              ))}
            </div>
          )}
        </section>

        <section className="parking-panel">
          <h3>Estacionados ({parked.length})</h3>
          {parked.length === 0 ? (
            <p className="parking-empty">Nenhum veículo guardado.</p>
          ) : (
            <div className="parking-valet-list">
              {parked.map((t) => (
                <ValetTicketCard
                  key={t.id}
                  ticket={t}
                  valets={valets}
                  spots={spots}
                  mode="parked"
                  onAction={() => void handleCardAction()}
                  onError={(msg) => setAlert({ open: true, message: msg })}
                  defaultTariffId={defaultTariff?.id}
                />
              ))}
            </div>
          )}
        </section>

        <section className="parking-panel">
          <h3>Fila de entrega ({delivery.length})</h3>
          {delivery.length === 0 ? (
            <p className="parking-empty">Nenhuma solicitação de retorno.</p>
          ) : (
            <div className="parking-valet-list">
              {delivery.map((t) => (
                <ValetTicketCard
                  key={t.id}
                  ticket={t}
                  valets={valets}
                  spots={spots}
                  mode="delivery"
                  onAction={() => void handleCardAction()}
                  onError={(msg) => setAlert({ open: true, message: msg })}
                  defaultTariffId={defaultTariff?.id}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <AlertModal isOpen={alert.open} message={alert.message} onClose={() => setAlert({ open: false, message: '' })} />
    </CatalogPageLayout>
  );
};
