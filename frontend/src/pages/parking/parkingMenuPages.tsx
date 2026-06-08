import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import RegistryFormModal, {
  registryModalFooterButtons,
} from '../../components/RegistryFormModal';
import { useDebouncedRegistrySearch } from '../../hooks/useDebouncedRegistrySearch';
import { getApiErrorMessage } from '../../utils/apiError';
import AlertModal from '../../components/AlertModal';
import PremiumSelect from '../../components/PremiumSelect';
import {
  bulkCreateParkingSpots,
  createParkingFacility,
  createParkingTariff,
  fetchParkingDashboard,
  fetchParkingFacilities,
  fetchParkingMeta,
  fetchParkingSessions,
  fetchParkingSpots,
  fetchParkingTariffs,
  lookupPlateAccess,
  quoteParkingTariff,
  registerParkingEntry,
  updateParkingTariff,
  type ParkingDashboard,
  type ParkingFacility,
  type ParkingMeta,
  type ParkingSession,
  type ParkingSpot,
  type ParkingTariff,
  type PlateAccess,
  type TariffQuote,
} from '../../services/parkingApi';
import { formatMoney } from '../finance/financeShared';
import {
  formatDateTime,
  formatDurationMinutes,
  PARKING_SEGMENT_LABELS,
  PARKING_SYSTEM_TYPE_LABELS,
  SESSION_STATUS_LABELS,
  SPOT_STATUS_LABELS,
  TARIFF_BILLING_LABELS,
  ACCESS_TYPE_LABELS,
  VEHICLE_TYPE_LABELS,
  vehicleTypeSelectOptions,
} from './parkingConstants';
import { ParkingTicketReceipt } from './ParkingTicketQr';
import './ParkingPages.css';

const EMPTY_FACILITY_FORM = {
  name: '',
  systemType: 'garage',
  segment: 'commercial',
  address: '',
};

const EMPTY_BULK_FORM = { prefix: 'A', count: 10, floor: 'Térreo', zone: 'Bloco A' };

const EMPTY_ENTRY_FORM = {
  plate: '',
  vehicleType: 'car',
  spotId: '',
  driverName: '',
};

function SpotBadge({ status }: { status: string }) {
  return (
    <span className={`parking-badge parking-badge--${status}`}>
      {SPOT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function SessionBadge({ status }: { status: string }) {
  return (
    <span className={`parking-badge parking-badge--${status === 'active' ? 'active' : 'closed'}`}>
      {SESSION_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function AccessBadge({ accessType }: { accessType?: string }) {
  if (!accessType || accessType === 'rotativo') {
    return <span className="parking-badge parking-badge--rotativo">Rotativo</span>;
  }
  return (
    <span className={`parking-badge parking-badge--${accessType}`}>
      {ACCESS_TYPE_LABELS[accessType] ?? accessType}
    </span>
  );
}

function useFacilityFilter(facilities: ParkingFacility[]) {
  const [facilityId, setFacilityId] = useState('');
  useEffect(() => {
    if (!facilityId && facilities[0]?.id) setFacilityId(facilities[0].id);
  }, [facilities, facilityId]);
  return { facilityId, setFacilityId };
}

export const ParkingDashboardPage: React.FC = () => {
  const [data, setData] = useState<ParkingDashboard | null>(null);
  const [meta, setMeta] = useState<ParkingMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '' });
  const { facilityId, setFacilityId } = useFacilityFilter(data?.facilities ?? []);

  const load = useCallback(async () => {
    const [dash, metaData] = await Promise.all([
      fetchParkingDashboard(facilityId || undefined),
      fetchParkingMeta(),
    ]);
    setData(dash);
    setMeta(metaData);
  }, [facilityId]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setAlert({ open: true, message: 'Erro ao carregar painel.' }))
      .finally(() => setLoading(false));
  }, [load]);

  const summary = data?.summary;

  return (
    <CatalogPageLayout
      className="parking-page catalog-page--ifood"
      moduleLabel="Início"
      modulePath="/"
      title="Painel do estacionamento"
      description="Ocupação, movimentação e sessões recentes em tempo real."
      loading={loading && !data}
      loadingDescription="Carregando painel…"
      actions={
        data?.facilities.length ? (
          <PremiumSelect
            label="Unidade"
            value={facilityId}
            options={data.facilities.map((f) => ({ value: f.id, label: f.name }))}
            wrapperClassName="form-group"
            onChange={setFacilityId}
          />
        ) : undefined
      }
    >
      {!data?.facilities.length ? (
        <div className="parking-panel">
          <p className="parking-empty">
            Nenhuma unidade cadastrada.{' '}
            <Link to="/estacionamento/unidades">Cadastre a primeira unidade</Link>.
          </p>
        </div>
      ) : (
        <>
          <div className="parking-stat-grid">
            <div className="parking-stat-card parking-stat-card--accent">
              <strong>{summary?.occupancyRate ?? 0}%</strong>
              <span>Ocupação</span>
            </div>
            <div className="parking-stat-card">
              <strong>{summary?.occupied ?? 0}</strong>
              <span>Vagas ocupadas</span>
            </div>
            <div className="parking-stat-card">
              <strong>{summary?.available ?? 0}</strong>
              <span>Vagas livres</span>
            </div>
            <div className="parking-stat-card">
              <strong>{summary?.activeSessions ?? 0}</strong>
              <span>Veículos no pátio</span>
            </div>
            <div className="parking-stat-card">
              <strong>{summary?.entriesToday ?? 0}</strong>
              <span>Entradas hoje</span>
            </div>
            <div className="parking-stat-card">
              <strong>{summary?.exitsToday ?? 0}</strong>
              <span>Saídas hoje</span>
            </div>
          </div>

          <div className="parking-actions-row">
            <Link to="/operacao/entrada-saida" className="catalog-action-button">
              Registrar entrada
            </Link>
            <Link to="/operacao/sessoes" className="catalog-action-button is-secondary">
              Ver sessões
            </Link>
            <Link to="/estacionamento/vagas" className="catalog-action-button is-secondary">
              Mapa de vagas
            </Link>
          </div>

          <div className="parking-panel">
            <h3>Sessões recentes</h3>
            {data.recentSessions.length === 0 ? (
              <p className="parking-empty">Nenhuma movimentação registrada.</p>
            ) : (
              <div className="parking-table-wrap">
                <table className="parking-table">
                  <thead>
                    <tr>
                      <th>Ticket</th>
                      <th>Placa</th>
                      <th>Vaga</th>
                      <th>Entrada</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentSessions.map((s) => (
                      <tr key={s.id}>
                        <td>{s.ticketCode}</td>
                        <td className="parking-plate">{s.plate}</td>
                        <td>{s.spot?.code ?? '—'}</td>
                        <td>{formatDateTime(s.entryAt)}</td>
                        <td>
                          <SessionBadge status={s.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {meta && (
            <div className="parking-panel">
              <h3>Segmentos atendidos</h3>
              <div className="parking-segment-grid">
                {meta.segments.map((s) => (
                  <div key={s.value} className="parking-segment-chip">
                    {s.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <AlertModal isOpen={alert.open} message={alert.message} onClose={() => setAlert({ open: false, message: '' })} />
    </CatalogPageLayout>
  );
};

export const ParkingFacilitiesPage: React.FC = () => {
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [meta, setMeta] = useState<ParkingMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '' });
  const [facilityModalOpen, setFacilityModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FACILITY_FORM);

  const load = useCallback(async () => {
    const [list, metaData] = await Promise.all([fetchParkingFacilities(), fetchParkingMeta()]);
    setFacilities(list);
    setMeta(metaData);
  }, []);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setAlert({ open: true, message: 'Erro ao carregar unidades.' }))
      .finally(() => setLoading(false));
  }, [load]);

  const closeFacilityModal = () => {
    if (isSaving) return;
    setForm(EMPTY_FACILITY_FORM);
    setFacilityModalOpen(false);
  };

  const openFacilityModal = () => {
    setForm(EMPTY_FACILITY_FORM);
    setFacilityModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await createParkingFacility({
        name: form.name,
        systemType: form.systemType,
        segment: form.segment,
        address: form.address || undefined,
      });
      closeFacilityModal();
      await load();
    } catch (err) {
      setAlert({ open: true, message: getApiErrorMessage(err, 'Erro ao processar.') });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <CatalogPageLayout
      className="parking-page catalog-page--ifood"
      moduleLabel="Estacionamento"
      modulePath="/estacionamento/unidades"
      title="Unidades e configuração"
      description="Cadastre garagens, valet ou estacionamentos públicos por segmento de mercado."
      loading={loading && !facilities.length}
      loadingDescription="Carregando unidades…"
      actions={
        <button type="button" className="catalog-action-button" onClick={openFacilityModal}>
          Nova unidade
        </button>
      }
    >
      <RegistryFormModal
        isOpen={facilityModalOpen}
        title="Nova unidade"
        subtitle="Cadastre garagens, valet ou estacionamentos públicos."
        isSaving={isSaving}
        onClose={closeFacilityModal}
        onSubmit={handleCreate}
        footer={registryModalFooterButtons({
          onClose: closeFacilityModal,
          isSaving,
          submitLabel: 'Cadastrar unidade',
        })}
      >
        <div className="parking-form-grid">
            <div>
              <label htmlFor="fac-name">Nome</label>
              <input
                id="fac-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex.: Garagem Shopping Centro"
                required
              />
            </div>
            <PremiumSelect
              id="fac-type"
              label="Tipo de sistema"
              value={form.systemType}
              options={
                meta?.systemTypes.map((t) => ({ value: t.value, label: t.label })) ?? [
                  { value: 'garage', label: 'Estacionamentos e Garagens' },
                  { value: 'valet', label: 'Valet Parking' },
                  { value: 'public', label: 'Estacionamentos Públicos' },
                ]
              }
              onChange={(v) => setForm((f) => ({ ...f, systemType: v }))}
            />
            <PremiumSelect
              id="fac-segment"
              label="Segmento"
              value={form.segment}
              options={meta?.segments.map((s) => ({ value: s.value, label: s.label })) ?? []}
              onChange={(v) => setForm((f) => ({ ...f, segment: v }))}
            />
            <div>
              <label htmlFor="fac-address">Endereço</label>
              <input
                id="fac-address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
        </div>
      </RegistryFormModal>

      <div className="parking-panel">
        <h3>Unidades cadastradas</h3>
        {facilities.length === 0 ? (
          <p className="parking-empty">Nenhuma unidade cadastrada.</p>
        ) : (
          <div className="parking-table-wrap">
            <table className="parking-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Sistema</th>
                  <th>Segmento</th>
                  <th>Vagas</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((f) => (
                  <tr key={f.id}>
                    <td>{f.name}</td>
                    <td>{PARKING_SYSTEM_TYPE_LABELS[f.systemType] ?? f.systemType}</td>
                    <td>{PARKING_SEGMENT_LABELS[f.segment] ?? f.segment}</td>
                    <td>{f.totalSpots}</td>
                    <td>{f.active ? 'Ativa' : 'Inativa'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertModal isOpen={alert.open} message={alert.message} onClose={() => setAlert({ open: false, message: '' })} />
    </CatalogPageLayout>
  );
};

export const ParkingSpotsPage: React.FC = () => {
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '' });
  const { facilityId, setFacilityId } = useFacilityFilter(facilities);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [bulk, setBulk] = useState(EMPTY_BULK_FORM);

  const load = useCallback(async () => {
    const facs = await fetchParkingFacilities();
    setFacilities(facs);
    const fid = facilityId || facs[0]?.id;
    if (fid) {
      setSpots(await fetchParkingSpots(fid));
    } else {
      setSpots([]);
    }
  }, [facilityId]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setAlert({ open: true, message: 'Erro ao carregar vagas.' }))
      .finally(() => setLoading(false));
  }, [load]);

  const closeBulkModal = () => {
    if (isSavingBulk) return;
    setBulk(EMPTY_BULK_FORM);
    setBulkModalOpen(false);
  };

  const openBulkModal = () => {
    setBulk(EMPTY_BULK_FORM);
    setBulkModalOpen(true);
  };

  const handleBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) return;
    setIsSavingBulk(true);
    try {
      await bulkCreateParkingSpots({ facilityId, ...bulk });
      closeBulkModal();
      await load();
    } catch (err) {
      setAlert({ open: true, message: getApiErrorMessage(err, 'Erro ao processar.') });
    } finally {
      setIsSavingBulk(false);
    }
  };

  return (
    <CatalogPageLayout
      className="parking-page catalog-page--ifood"
      moduleLabel="Estacionamento"
      modulePath="/estacionamento/vagas"
      title="Vagas"
      description="Cadastro em lote e visualização do status de cada vaga."
      loading={loading && !spots.length}
      loadingDescription="Carregando vagas…"
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
            <button type="button" className="catalog-action-button" onClick={openBulkModal}>
              Gerar vagas
            </button>
          </>
        ) : undefined
      }
    >
      {!facilities.length ? (
        <p className="parking-empty">
          Cadastre uma unidade em <Link to="/estacionamento/unidades">Unidades</Link>.
        </p>
      ) : (
        <>
          <RegistryFormModal
            isOpen={bulkModalOpen}
            title="Gerar vagas em lote"
            subtitle="Crie várias vagas com prefixo sequencial."
            isSaving={isSavingBulk}
            onClose={closeBulkModal}
            onSubmit={handleBulk}
            footer={registryModalFooterButtons({
              onClose: closeBulkModal,
              isSaving: isSavingBulk,
              submitLabel: 'Gerar vagas',
            })}
          >
            <div className="parking-form-grid">
              <div>
                <label htmlFor="bulk-prefix">Prefixo</label>
                <input
                  id="bulk-prefix"
                  value={bulk.prefix}
                  onChange={(e) => setBulk((b) => ({ ...b, prefix: e.target.value }))}
                  maxLength={8}
                  required
                />
              </div>
              <div>
                <label htmlFor="bulk-count">Quantidade</label>
                <input
                  id="bulk-count"
                  type="number"
                  min={1}
                  max={500}
                  value={bulk.count}
                  onChange={(e) => setBulk((b) => ({ ...b, count: Number(e.target.value) }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="bulk-floor">Andar</label>
                <input
                  id="bulk-floor"
                  value={bulk.floor}
                  onChange={(e) => setBulk((b) => ({ ...b, floor: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="bulk-zone">Setor</label>
                <input
                  id="bulk-zone"
                  value={bulk.zone}
                  onChange={(e) => setBulk((b) => ({ ...b, zone: e.target.value }))}
                />
              </div>
            </div>
          </RegistryFormModal>

          <div className="parking-panel">
            <h3>Mapa de vagas ({spots.length})</h3>
            <div className="parking-table-wrap">
              <table className="parking-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Andar</th>
                    <th>Setor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {spots.map((s) => (
                    <tr key={s.id}>
                      <td>{s.code}</td>
                      <td>{s.floor ?? '—'}</td>
                      <td>{s.zone ?? '—'}</td>
                      <td>
                        <SpotBadge status={s.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <AlertModal isOpen={alert.open} message={alert.message} onClose={() => setAlert({ open: false, message: '' })} />
    </CatalogPageLayout>
  );
};

export const ParkingEntryPage: React.FC = () => {
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [activeSessions, setActiveSessions] = useState<ParkingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '' });
  const { facilityId, setFacilityId } = useFacilityFilter(facilities);
  const [form, setForm] = useState(EMPTY_ENTRY_FORM);
  const [plateAccess, setPlateAccess] = useState<PlateAccess | null>(null);
  const [lastTicket, setLastTicket] = useState<ParkingSession | null>(null);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [isSavingEntry, setIsSavingEntry] = useState(false);

  const lookupPlate = useCallback(
    async (plate: string) => {
      if (plate.trim().length < 5 || !facilityId) {
        setPlateAccess(null);
        return;
      }
      try {
        const result = await lookupPlateAccess(plate, facilityId);
        setPlateAccess(result);
        if (result.accessType !== 'rotativo' && result.customerName && !form.driverName) {
          setForm((f) => ({ ...f, driverName: result.customerName ?? f.driverName }));
        }
      } catch {
        setPlateAccess(null);
      }
    },
    [facilityId, form.driverName],
  );

  const load = useCallback(async () => {
    const facs = await fetchParkingFacilities();
    setFacilities(facs);
    const fid = facilityId || facs[0]?.id;
    if (!fid) return;
    const [spotList, sessions] = await Promise.all([
      fetchParkingSpots(fid),
      fetchParkingSessions({ facilityId: fid, status: 'active' }),
    ]);
    setSpots(spotList.filter((s) => s.status === 'available'));
    setActiveSessions(sessions);
  }, [facilityId]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setAlert({ open: true, message: 'Erro ao carregar operação.' }))
      .finally(() => setLoading(false));
  }, [load]);

  const availableSpots = useMemo(
    () => spots.filter((s) => s.status === 'available'),
    [spots],
  );

  const closeEntryModal = () => {
    if (isSavingEntry) return;
    setForm(EMPTY_ENTRY_FORM);
    setPlateAccess(null);
    setEntryModalOpen(false);
  };

  const openEntryModal = () => {
    setForm(EMPTY_ENTRY_FORM);
    setPlateAccess(null);
    setEntryModalOpen(true);
  };

  const handleEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) return;
    setIsSavingEntry(true);
    try {
      const created = await registerParkingEntry({
        facilityId,
        plate: form.plate,
        vehicleType: form.vehicleType,
        spotId: form.spotId || undefined,
        driverName: form.driverName || undefined,
      });
      setLastTicket(created);
      closeEntryModal();
      await load();
    } catch (err) {
      setAlert({ open: true, message: getApiErrorMessage(err, 'Erro ao processar.') });
    } finally {
      setIsSavingEntry(false);
    }
  };

  return (
    <CatalogPageLayout
      className="parking-page catalog-page--ifood"
      moduleLabel="Operação"
      modulePath="/operacao/entrada-saida"
      title="Entrada e saída"
      description="Registre entradas. Cobrança e liberação de saídas pelo Caixa."
      loading={loading && !facilities.length}
      loadingDescription="Carregando operação…"
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
            <button type="button" className="catalog-action-button" onClick={openEntryModal}>
              Registrar entrada
            </button>
          </>
        ) : undefined
      }
    >
      <RegistryFormModal
        isOpen={entryModalOpen}
        title="Registrar entrada"
        subtitle="Gere ticket de entrada para veículo rotativo ou autorizado."
        isSaving={isSavingEntry}
        onClose={closeEntryModal}
        onSubmit={handleEntry}
        footer={registryModalFooterButtons({
          onClose: closeEntryModal,
          isSaving: isSavingEntry,
          submitLabel: 'Registrar entrada',
        })}
      >
        <div className="catalog-form-grid">
          <div className="form-group">
            <label htmlFor="entry-plate">Placa</label>
            <input
              id="entry-plate"
              className="premium-text-input"
              value={form.plate}
              onChange={(e) => {
                const plate = e.target.value.toUpperCase();
                setForm((f) => ({ ...f, plate }));
                if (plate.length < 5) setPlateAccess(null);
              }}
              onBlur={() => void lookupPlate(form.plate)}
              placeholder="ABC1D23"
              required
            />
            {plateAccess && plateAccess.accessType !== 'rotativo' ? (
              <p className="parking-access-hint">
                <AccessBadge accessType={plateAccess.accessType} />
                {' — '}
                {plateAccess.label}
                {plateAccess.accessType === 'convenio' && plateAccess.discountPercent != null
                  ? ` (${plateAccess.discountPercent}% na saída)`
                  : plateAccess.accessType === 'mensalista'
                    ? ' — isento na saída'
                    : ''}
              </p>
            ) : null}
          </div>
          <PremiumSelect
            id="entry-type"
            label="Tipo de veículo"
            value={form.vehicleType}
            options={vehicleTypeSelectOptions}
            wrapperClassName="form-group"
            onChange={(v) => setForm((f) => ({ ...f, vehicleType: v }))}
          />
          <PremiumSelect
            id="entry-spot"
            label="Vaga (opcional)"
            value={form.spotId}
            options={[
              { value: '', label: 'Sem vaga definida' },
              ...availableSpots.map((s) => ({
                value: s.id,
                label: `${s.code}${s.zone ? ` — ${s.zone}` : ''}`,
              })),
            ]}
            wrapperClassName="form-group"
            onChange={(v) => setForm((f) => ({ ...f, spotId: v }))}
          />
          <div className="form-group">
            <label htmlFor="entry-driver">Motorista (opcional)</label>
            <input
              id="entry-driver"
              className="premium-text-input"
              value={form.driverName}
              onChange={(e) => setForm((f) => ({ ...f, driverName: e.target.value }))}
            />
          </div>
        </div>
      </RegistryFormModal>

      {lastTicket ? (
        <div className="parking-panel parking-ticket-panel">
          <ParkingTicketReceipt
            ticketCode={lastTicket.ticketCode}
            qrPayload={lastTicket.ticketCode}
            plate={lastTicket.plate}
            facilityName={lastTicket.facility?.name}
            entryAt={lastTicket.entryAt}
            onPrint={() => window.print()}
            onClose={() => setLastTicket(null)}
          />
        </div>
      ) : null}

      <div className="parking-panel">
        <h3>Veículos no pátio ({activeSessions.length})</h3>
        <p className="parking-hint" style={{ marginBottom: 12 }}>
          Cobrança e liberação de saída em{' '}
          <Link to="/operacao/caixa">Operação → Caixa</Link>.
        </p>
        {activeSessions.length === 0 ? (
          <p className="parking-empty">Nenhum veículo no pátio.</p>
        ) : (
          <div className="parking-table-wrap">
            <table className="parking-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Placa</th>
                  <th>Acesso</th>
                  <th>Vaga</th>
                  <th>Entrada</th>
                  <th>Permanência</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {activeSessions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.ticketCode}</td>
                    <td className="parking-plate">{s.plate}</td>
                    <td>
                      <AccessBadge accessType={s.accessType} />
                      {s.customer?.name ? (
                        <div className="parking-hint">{s.customer.name}</div>
                      ) : null}
                    </td>
                    <td>{s.spot?.code ?? '—'}</td>
                    <td>{formatDateTime(s.entryAt)}</td>
                    <td>{formatDurationMinutes(s.entryAt)}</td>
                    <td>
                      <Link
                        to="/operacao/caixa"
                        className="catalog-action-button is-secondary"
                      >
                        Caixa
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertModal isOpen={alert.open} message={alert.message} onClose={() => setAlert({ open: false, message: '' })} />
    </CatalogPageLayout>
  );
};

export const ParkingSessionsPage: React.FC = () => {
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [sessions, setSessions] = useState<ParkingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '' });
  const { facilityId, setFacilityId } = useFacilityFilter(facilities);
  const [status, setStatus] = useState('');
  const {
    search: plate,
    searchDebounced: plateDebounced,
    handleSearchChange: handlePlateChange,
    applySearchNow: applyPlateSearch,
    clearSearch: clearPlateSearch,
  } = useDebouncedRegistrySearch();

  const handleClearFilters = () => {
    setStatus('');
    clearPlateSearch();
  };

  const load = useCallback(async () => {
    const facs = await fetchParkingFacilities();
    setFacilities(facs);
    setSessions(
      await fetchParkingSessions({
        facilityId: facilityId || facs[0]?.id,
        status: status || undefined,
        plate: plateDebounced || undefined,
      }),
    );
  }, [facilityId, status, plateDebounced]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setAlert({ open: true, message: 'Erro ao carregar sessões.' }))
      .finally(() => setLoading(false));
  }, [load]);

  return (
    <CatalogPageLayout
      className="parking-page catalog-page--ifood"
      moduleLabel="Operação"
      modulePath="/operacao/sessoes"
      title="Histórico de sessões"
      description="Consulte entradas, saídas e permanência dos veículos."
      loading={loading && !sessions.length}
      loadingDescription="Carregando sessões…"
    >
      <section className="catalog-surface">
        <div className="catalog-toolbar catalog-filter-toolbar">
          {facilities.length > 0 ? (
            <PremiumSelect
              label="Unidade"
              value={facilityId}
              options={facilities.map((f) => ({ value: f.id, label: f.name }))}
              wrapperClassName="form-group catalog-filter-toolbar__field"
              onChange={setFacilityId}
            />
          ) : null}
          <PremiumSelect
            label="Status"
            value={status}
            options={[
              { value: '', label: 'Todos' },
              { value: 'active', label: SESSION_STATUS_LABELS.active ?? 'Ativas' },
              { value: 'closed', label: SESSION_STATUS_LABELS.closed ?? 'Encerradas' },
            ]}
            wrapperClassName="form-group catalog-filter-toolbar__field"
            onChange={setStatus}
          />
          <div className="form-group catalog-search catalog-filter-toolbar__search">
            <label htmlFor="sessions-plate">Placa</label>
            <input
              id="sessions-plate"
              className="premium-text-input"
              value={plate}
              onChange={(e) => handlePlateChange(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyPlateSearch();
              }}
              placeholder="Filtrar por placa…"
            />
          </div>
          <button
            type="button"
            className="catalog-form-footer-btn catalog-form-footer-btn--primary catalog-filter-toolbar__action"
            onClick={applyPlateSearch}
          >
            Buscar
          </button>
          <button
            type="button"
            className="catalog-form-footer-btn catalog-form-footer-btn--ghost catalog-filter-toolbar__action"
            onClick={handleClearFilters}
          >
            Limpar
          </button>
        </div>
      </section>

      <div className="parking-panel">
        <h3>
          Sessões
          {!loading ? (
            <span className="parking-hint" style={{ fontWeight: 400, marginLeft: 8 }}>
              {sessions.length} registro(s)
              {plateDebounced ? ` · placa "${plateDebounced}"` : ''}
              {status ? ` · ${SESSION_STATUS_LABELS[status] ?? status}` : ''}
            </span>
          ) : null}
        </h3>
        {sessions.length === 0 ? (
          <p className="parking-empty">Nenhuma sessão encontrada.</p>
        ) : (
          <div className="parking-table-wrap">
            <table className="parking-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Placa</th>
                  <th>Acesso</th>
                  <th>Entrada</th>
                  <th>Saída</th>
                  <th>Permanência</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.ticketCode}</td>
                    <td className="parking-plate">{s.plate}</td>
                    <td>
                      <AccessBadge accessType={s.accessType} />
                      {s.customer?.name ? (
                        <div className="parking-hint">{s.customer.name}</div>
                      ) : null}
                    </td>
                    <td>{formatDateTime(s.entryAt)}</td>
                    <td>{s.exitAt ? formatDateTime(s.exitAt) : '—'}</td>
                    <td>{formatDurationMinutes(s.entryAt, s.exitAt)}</td>
                    <td>
                      {s.amountCharged != null ? formatMoney(s.amountCharged) : '—'}
                    </td>
                    <td>
                      <SessionBadge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertModal isOpen={alert.open} message={alert.message} onClose={() => setAlert({ open: false, message: '' })} />
    </CatalogPageLayout>
  );
};

const EMPTY_TARIFF_FORM = {
  name: '',
  billingType: 'hourly' as 'hourly' | 'daily' | 'monthly',
  vehicleType: '',
  price: '',
  graceMinutes: '15',
  blockMinutes: '60',
  maxDailyPrice: '',
  description: '',
  isDefault: false,
};

export const ParkingTariffsPage: React.FC = () => {
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [tariffs, setTariffs] = useState<ParkingTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '' });
  const { facilityId, setFacilityId } = useFacilityFilter(facilities);
  const [tab, setTab] = useState<'hourly' | 'daily' | 'monthly'>('hourly');
  const [tariffModalOpen, setTariffModalOpen] = useState(false);
  const [isSavingTariff, setIsSavingTariff] = useState(false);
  const [form, setForm] = useState(EMPTY_TARIFF_FORM);
  const [quoteTariffId, setQuoteTariffId] = useState('');
  const [quoteEntry, setQuoteEntry] = useState('');
  const [quoteExit, setQuoteExit] = useState('');
  const [quoteResult, setQuoteResult] = useState<TariffQuote | null>(null);

  const load = useCallback(async () => {
    const facs = await fetchParkingFacilities();
    setFacilities(facs);
    const fid = facilityId || facs[0]?.id;
    const list = await fetchParkingTariffs(fid ? { facilityId: fid } : undefined);
    setTariffs(list);
    const tabList = list.filter((t) => t.billingType === tab && t.active);
    setQuoteTariffId(tabList[0]?.id ?? '');
  }, [facilityId, tab]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setAlert({ open: true, message: 'Erro ao carregar tarifas.' }))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    setForm((f) => ({ ...f, billingType: tab }));
  }, [tab]);

  const filtered = tariffs.filter((t) => t.billingType === tab);

  const closeTariffModal = () => {
    if (isSavingTariff) return;
    setForm({ ...EMPTY_TARIFF_FORM, billingType: tab });
    setTariffModalOpen(false);
  };

  const openTariffModal = () => {
    setForm({ ...EMPTY_TARIFF_FORM, billingType: tab });
    setTariffModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) return;
    setIsSavingTariff(true);
    try {
      await createParkingTariff({
        facilityId,
        name: form.name,
        billingType: form.billingType,
        vehicleType: form.vehicleType || undefined,
        price: Number(form.price),
        graceMinutes: form.billingType === 'hourly' ? Number(form.graceMinutes) : 0,
        blockMinutes: form.billingType === 'hourly' ? Number(form.blockMinutes) : 60,
        maxDailyPrice:
          form.billingType === 'hourly' && form.maxDailyPrice
            ? Number(form.maxDailyPrice)
            : undefined,
        description: form.description || undefined,
        isDefault: form.isDefault,
      });
      closeTariffModal();
      await load();
    } catch (err) {
      setAlert({ open: true, message: getApiErrorMessage(err, 'Erro ao processar.') });
    } finally {
      setIsSavingTariff(false);
    }
  };

  const toggleActive = async (tariff: ParkingTariff) => {
    try {
      await updateParkingTariff(tariff.id, { active: !tariff.active });
      await load();
    } catch (err) {
      setAlert({ open: true, message: getApiErrorMessage(err, 'Erro ao processar.') });
    }
  };

  const handleQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteTariffId || !quoteEntry) return;
    try {
      const result = await quoteParkingTariff({
        tariffId: quoteTariffId,
        entryAt: new Date(quoteEntry).toISOString(),
        exitAt: quoteExit ? new Date(quoteExit).toISOString() : undefined,
      });
      setQuoteResult(result);
    } catch (err) {
      setAlert({ open: true, message: getApiErrorMessage(err, 'Erro ao processar.') });
    }
  };

  const priceLabel =
    tab === 'hourly' ? 'Valor por hora (R$)' : tab === 'daily' ? 'Valor da diária (R$)' : 'Mensalidade (R$)';

  return (
    <CatalogPageLayout
      className="parking-page catalog-page--ifood"
      moduleLabel="Estacionamento"
      modulePath="/estacionamento/tarifas"
      title="Tarifas e tabelas"
      description="Configure rotativo por hora, diária e planos mensalistas."
      loading={loading && !tariffs.length}
      loadingDescription="Carregando tarifas…"
      actions={
        facilities.length ? (
          <PremiumSelect
            label="Unidade"
            value={facilityId}
            options={facilities.map((f) => ({ value: f.id, label: f.name }))}
            wrapperClassName="form-group"
            onChange={setFacilityId}
          />
        ) : undefined
      }
    >
      <div className="parking-actions-row" style={{ marginBottom: 16 }}>
        {(['hourly', 'daily', 'monthly'] as const).map((type) => (
          <button
            key={type}
            type="button"
            className={`catalog-action-button${tab === type ? '' : ' is-secondary'}`}
            onClick={() => setTab(type)}
          >
            {TARIFF_BILLING_LABELS[type]}
          </button>
        ))}
        <button type="button" className="catalog-action-button" onClick={openTariffModal}>
          Nova tarifa
        </button>
      </div>

      <RegistryFormModal
        isOpen={tariffModalOpen}
        title={`Nova tarifa — ${TARIFF_BILLING_LABELS[tab]}`}
        subtitle="Configure valores de cobrança para a unidade selecionada."
        isSaving={isSavingTariff}
        onClose={closeTariffModal}
        onSubmit={handleCreate}
        footer={registryModalFooterButtons({
          onClose: closeTariffModal,
          isSaving: isSavingTariff,
          submitLabel: 'Salvar tarifa',
        })}
      >
        <div className="catalog-form-grid">
          <div className="form-group">
            <label htmlFor="tariff-name">Nome</label>
            <input
              id="tariff-name"
              className="premium-text-input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="tariff-price">{priceLabel}</label>
            <input
              id="tariff-price"
              type="number"
              min={0}
              step="0.01"
              className="premium-text-input"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              required
            />
          </div>
          {tab === 'monthly' ? (
            <PremiumSelect
              id="tariff-vehicle"
              label="Tipo de veículo"
              value={form.vehicleType}
              options={[{ value: '', label: 'Todos' }, ...vehicleTypeSelectOptions]}
              wrapperClassName="form-group"
              onChange={(v) => setForm((f) => ({ ...f, vehicleType: v }))}
            />
          ) : null}
          {tab === 'hourly' ? (
            <>
              <div className="form-group">
                <label htmlFor="tariff-grace">Tolerância (min)</label>
                <input
                  id="tariff-grace"
                  type="number"
                  min={0}
                  className="premium-text-input"
                  value={form.graceMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, graceMinutes: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="tariff-block">Bloco (min)</label>
                <input
                  id="tariff-block"
                  type="number"
                  min={1}
                  className="premium-text-input"
                  value={form.blockMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, blockMinutes: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="tariff-cap">Teto diário (R$)</label>
                <input
                  id="tariff-cap"
                  type="number"
                  min={0}
                  step="0.01"
                  className="premium-text-input"
                  value={form.maxDailyPrice}
                  onChange={(e) => setForm((f) => ({ ...f, maxDailyPrice: e.target.value }))}
                />
              </div>
            </>
          ) : null}
          <label className="form-group">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
            />
            Tarifa padrão deste tipo
          </label>
        </div>
      </RegistryFormModal>

      <div className="parking-panel">
        <h3>Tabelas cadastradas</h3>
        {filtered.length === 0 ? (
          <p className="parking-empty">Nenhuma tarifa nesta categoria.</p>
        ) : (
          <div className="parking-table-wrap">
            <table className="parking-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Valor</th>
                  {tab === 'hourly' && <th>Tolerância</th>}
                  {tab === 'hourly' && <th>Teto/dia</th>}
                  {tab === 'monthly' && <th>Veículo</th>}
                  <th>Padrão</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td>{formatMoney(t.price)}</td>
                    {tab === 'hourly' && <td>{t.graceMinutes} min</td>}
                    {tab === 'hourly' && (
                      <td>{t.maxDailyPrice ? formatMoney(t.maxDailyPrice) : '—'}</td>
                    )}
                    {tab === 'monthly' && (
                      <td>
                        {t.vehicleType
                          ? (VEHICLE_TYPE_LABELS[t.vehicleType] ?? t.vehicleType)
                          : 'Todos'}
                      </td>
                    )}
                    <td>{t.isDefault ? 'Sim' : '—'}</td>
                    <td>{t.active ? 'Ativa' : 'Inativa'}</td>
                    <td>
                      <button
                        type="button"
                        className="catalog-action-button is-secondary"
                        onClick={() => void toggleActive(t)}
                      >
                        {t.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(tab === 'hourly' || tab === 'daily') && filtered.length > 0 && (
        <div className="parking-panel">
          <h3>Simulador de cobrança</h3>
          <form onSubmit={(e) => void handleQuote(e)}>
            <div className="parking-form-grid">
              <PremiumSelect
                id="quote-tariff"
                label="Tarifa"
                value={quoteTariffId}
                options={filtered.filter((t) => t.active).map((t) => ({ value: t.id, label: t.name }))}
                onChange={setQuoteTariffId}
              />
              <div>
                <label htmlFor="quote-entry">Entrada</label>
                <input
                  id="quote-entry"
                  type="datetime-local"
                  value={quoteEntry}
                  onChange={(e) => setQuoteEntry(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="quote-exit">Saída</label>
                <input
                  id="quote-exit"
                  type="datetime-local"
                  value={quoteExit}
                  onChange={(e) => setQuoteExit(e.target.value)}
                />
              </div>
            </div>
            <div className="parking-actions-row">
              <button type="submit" className="catalog-action-button is-secondary">
                Calcular
              </button>
            </div>
          </form>
          {quoteResult && (
            <p style={{ marginTop: 12 }}>
              <strong>{formatMoney(quoteResult.amount)}</strong> — {quoteResult.breakdown} (
              {quoteResult.durationMinutes} min no pátio)
            </p>
          )}
        </div>
      )}

      <AlertModal isOpen={alert.open} message={alert.message} onClose={() => setAlert({ open: false, message: '' })} />
    </CatalogPageLayout>
  );
};
