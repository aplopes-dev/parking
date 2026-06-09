import React, { useCallback, useEffect, useState } from 'react';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import RegistryFormModal, { registryModalFooterButtons } from '../../components/RegistryFormModal';
import { getApiErrorMessage } from '../../utils/apiError';
import AlertModal from '../../components/AlertModal';
import PremiumSelect from '../../components/PremiumSelect';
import { useMobileRealtime } from '../integration/useMobileRealtime';
import {
  cancelValetTicket,
  completeValetParking,
  deliverValetVehicle,
  fetchAllParkingFacilities,
  fetchAllParkingSpots,
  fetchAllParkingTariffs,
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
  vehicleTypeSelectOptions,
} from './parkingConstants';
import './ParkingPages.css';

const EMPTY_VALET_RECEIVE_FORM = {
  plate: '',
  vehicleType: 'car',
  customerName: '',
  customerPhone: '',
  keyTag: '',
};

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
      onError(getApiErrorMessage(e, 'Erro ao processar.'));
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
          <PremiumSelect
            label="Manobrista"
            value={valetId}
            options={[
              { value: '', label: 'Manobrista' },
              ...valets.map((v) => ({ value: v.id, label: v.name })),
            ]}
            wrapperClassName="form-group"
            onChange={setValetId}
          />
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
          <PremiumSelect
            label="Vaga"
            value={spotId}
            options={[
              { value: '', label: 'Vaga cadastrada' },
              ...spots.map((s) => ({ value: s.id, label: s.code })),
            ]}
            wrapperClassName="form-group"
            onChange={setSpotId}
          />
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
          <PremiumSelect
            label="Manobrista"
            value={valetId}
            options={[
              { value: '', label: 'Manobrista' },
              ...valets.map((v) => ({ value: v.id, label: v.name })),
            ]}
            wrapperClassName="form-group"
            onChange={setValetId}
          />
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
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [isSavingReceive, setIsSavingReceive] = useState(false);
  const [form, setForm] = useState(EMPTY_VALET_RECEIVE_FORM);

  const load = useCallback(async () => {
    const facs = await fetchAllParkingFacilities();
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
        fetchAllParkingSpots(fid),
        fetchAllParkingTariffs({ facilityId: fid, billingType: 'hourly' }),
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

  useMobileRealtime({
    enabled: Boolean(localStorage.getItem('token') && facilityId),
    onValetUpdate: (payload) => {
      if (payload.facilityId && payload.facilityId !== facilityId) return;
      setSummary(payload.queue);
      const tickets = payload.tickets as ValetTicket[];
      setIntake(tickets.filter((t) => t.status === 'received' || t.status === 'parking'));
      setParked(tickets.filter((t) => t.status === 'parked'));
      setDelivery(
        tickets.filter((t) =>
          ['requested', 'retrieving', 'ready'].includes(t.status),
        ),
      );
    },
  });

  const closeReceiveModal = () => {
    if (isSavingReceive) return;
    setForm(EMPTY_VALET_RECEIVE_FORM);
    setReceiveModalOpen(false);
  };

  const openReceiveModal = () => {
    setForm(EMPTY_VALET_RECEIVE_FORM);
    setReceiveModalOpen(true);
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) return;
    setIsSavingReceive(true);
    try {
      await receiveValetVehicle({
        facilityId,
        plate: form.plate,
        vehicleType: form.vehicleType,
        customerName: form.customerName || undefined,
        customerPhone: form.customerPhone || undefined,
        keyTag: form.keyTag || undefined,
      });
      closeReceiveModal();
      await load();
    } catch (err) {
      setAlert({ open: true, message: getApiErrorMessage(err, 'Erro ao processar.') });
    } finally {
      setIsSavingReceive(false);
    }
  };

  const handleCardAction = async () => {
    try {
      await load();
    } catch (err) {
      setAlert({ open: true, message: getApiErrorMessage(err, 'Erro ao processar.') });
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
          <>
            <PremiumSelect
              label="Unidade"
              value={facilityId}
              options={facilities.map((f) => ({ value: f.id, label: f.name }))}
              wrapperClassName="form-group"
              onChange={setFacilityId}
            />
            <button type="button" className="catalog-action-button" onClick={openReceiveModal}>
              Receber veículo
            </button>
          </>
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

      <RegistryFormModal
        isOpen={receiveModalOpen}
        wide
        title="Receber veículo"
        subtitle="Gere ticket valet e encaminhe para a fila de manobristas."
        isSaving={isSavingReceive}
        onClose={closeReceiveModal}
        onSubmit={handleReceive}
        footer={registryModalFooterButtons({
          onClose: closeReceiveModal,
          isSaving: isSavingReceive,
          submitLabel: 'Gerar ticket valet',
        })}
      >
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
            <PremiumSelect
              id="valet-type"
              label="Tipo"
              value={form.vehicleType}
              options={vehicleTypeSelectOptions}
              onChange={(v) => setForm((f) => ({ ...f, vehicleType: v }))}
            />
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
        {defaultTariff ? (
          <p className="parking-hint" style={{ marginTop: 12 }}>
            Tarifa rotativa na entrega: {formatMoney(defaultTariff.price)}/h
          </p>
        ) : null}
      </RegistryFormModal>

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
