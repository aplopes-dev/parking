import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import AlertModal from '../../components/AlertModal';
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
} from './parkingConstants';
import { ParkingTicketReceipt } from './ParkingTicketQr';
import './ParkingPages.css';

function errMsg(e: unknown): string {
  const ax = e as { response?: { data?: { message?: string | string[] } } };
  const msg = ax.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' ');
  if (typeof msg === 'string') return msg;
  return 'Erro ao processar.';
}

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
          <select
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
            aria-label="Unidade"
          >
            {data.facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
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
  const [form, setForm] = useState({
    name: '',
    systemType: 'garage',
    segment: 'commercial',
    address: '',
  });

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createParkingFacility({
        name: form.name,
        systemType: form.systemType,
        segment: form.segment,
        address: form.address || undefined,
      });
      setForm({ name: '', systemType: 'garage', segment: 'commercial', address: '' });
      await load();
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
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
    >
      <div className="parking-panel">
        <h3>Nova unidade</h3>
        <form onSubmit={(e) => void handleCreate(e)}>
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
            <div>
              <label htmlFor="fac-type">Tipo de sistema</label>
              <select
                id="fac-type"
                value={form.systemType}
                onChange={(e) => setForm((f) => ({ ...f, systemType: e.target.value }))}
              >
                {meta?.systemTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                )) ?? (
                  <>
                    <option value="garage">Estacionamentos e Garagens</option>
                    <option value="valet">Valet Parking</option>
                    <option value="public">Estacionamentos Públicos</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label htmlFor="fac-segment">Segmento</label>
              <select
                id="fac-segment"
                value={form.segment}
                onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value }))}
              >
                {meta?.segments.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
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
          <div className="parking-actions-row">
            <button type="submit" className="catalog-action-button">
              Cadastrar unidade
            </button>
          </div>
        </form>
      </div>

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
  const [bulk, setBulk] = useState({ prefix: 'A', count: 10, floor: 'Térreo', zone: 'Bloco A' });

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

  const handleBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) return;
    try {
      await bulkCreateParkingSpots({ facilityId, ...bulk });
      await load();
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
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
      {!facilities.length ? (
        <p className="parking-empty">
          Cadastre uma unidade em <Link to="/estacionamento/unidades">Unidades</Link>.
        </p>
      ) : (
        <>
          <div className="parking-panel">
            <h3>Gerar vagas em lote</h3>
            <form onSubmit={(e) => void handleBulk(e)}>
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
              <div className="parking-actions-row">
                <button type="submit" className="catalog-action-button">
                  Gerar vagas
                </button>
              </div>
            </form>
          </div>

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
  const [form, setForm] = useState({
    plate: '',
    vehicleType: 'car',
    spotId: '',
    driverName: '',
  });
  const [plateAccess, setPlateAccess] = useState<PlateAccess | null>(null);
  const [lastTicket, setLastTicket] = useState<ParkingSession | null>(null);

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

  const handleEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) return;
    try {
      const created = await registerParkingEntry({
        facilityId,
        plate: form.plate,
        vehicleType: form.vehicleType,
        spotId: form.spotId || undefined,
        driverName: form.driverName || undefined,
      });
      setLastTicket(created);
      setForm({ plate: '', vehicleType: 'car', spotId: '', driverName: '' });
      setPlateAccess(null);
      await load();
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
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
      <div className="parking-panel">
        <h3>Registrar entrada</h3>
        <form onSubmit={(e) => void handleEntry(e)}>
          <div className="parking-form-grid">
            <div>
              <label htmlFor="entry-plate">Placa</label>
              <input
                id="entry-plate"
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
            <div>
              <label htmlFor="entry-type">Tipo de veículo</label>
              <select
                id="entry-type"
                value={form.vehicleType}
                onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))}
              >
                {Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="entry-spot">Vaga (opcional)</label>
              <select
                id="entry-spot"
                value={form.spotId}
                onChange={(e) => setForm((f) => ({ ...f, spotId: e.target.value }))}
              >
                <option value="">Sem vaga definida</option>
                {availableSpots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} {s.zone ? `— ${s.zone}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="entry-driver">Motorista (opcional)</label>
              <input
                id="entry-driver"
                value={form.driverName}
                onChange={(e) => setForm((f) => ({ ...f, driverName: e.target.value }))}
              />
            </div>
          </div>
          <div className="parking-actions-row">
            <button type="submit" className="catalog-action-button">
              Registrar entrada
            </button>
          </div>
        </form>
      </div>

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
  const [plate, setPlate] = useState('');

  const load = useCallback(async () => {
    const facs = await fetchParkingFacilities();
    setFacilities(facs);
    setSessions(
      await fetchParkingSessions({
        facilityId: facilityId || facs[0]?.id,
        status: status || undefined,
        plate: plate || undefined,
      }),
    );
  }, [facilityId, status, plate]);

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
      actions={
        <div className="parking-actions-row" style={{ marginTop: 0 }}>
          {facilities.length ? (
            <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          ) : null}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="active">Ativas</option>
            <option value="closed">Encerradas</option>
          </select>
          <input
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            placeholder="Filtrar placa"
          />
        </div>
      }
    >
      <div className="parking-panel">
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) return;
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
      setForm({ ...EMPTY_TARIFF_FORM, billingType: tab });
      await load();
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
    }
  };

  const toggleActive = async (tariff: ParkingTariff) => {
    try {
      await updateParkingTariff(tariff.id, { active: !tariff.active });
      await load();
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
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
      setAlert({ open: true, message: errMsg(err) });
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
      </div>

      <div className="parking-panel">
        <h3>Nova tarifa — {TARIFF_BILLING_LABELS[tab]}</h3>
        <form onSubmit={(e) => void handleCreate(e)}>
          <div className="parking-form-grid">
            <div>
              <label htmlFor="tariff-name">Nome</label>
              <input
                id="tariff-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label htmlFor="tariff-price">{priceLabel}</label>
              <input
                id="tariff-price"
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                required
              />
            </div>
            {tab === 'monthly' && (
              <div>
                <label htmlFor="tariff-vehicle">Tipo de veículo</label>
                <select
                  id="tariff-vehicle"
                  value={form.vehicleType}
                  onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))}
                >
                  <option value="">Todos</option>
                  {Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {tab === 'hourly' && (
              <>
                <div>
                  <label htmlFor="tariff-grace">Tolerância (min)</label>
                  <input
                    id="tariff-grace"
                    type="number"
                    min={0}
                    value={form.graceMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, graceMinutes: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="tariff-block">Bloco (min)</label>
                  <input
                    id="tariff-block"
                    type="number"
                    min={1}
                    value={form.blockMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, blockMinutes: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="tariff-cap">Teto diário (R$)</label>
                  <input
                    id="tariff-cap"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.maxDailyPrice}
                    onChange={(e) => setForm((f) => ({ ...f, maxDailyPrice: e.target.value }))}
                  />
                </div>
              </>
            )}
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
            />
            Tarifa padrão deste tipo
          </label>
          <div className="parking-actions-row">
            <button type="submit" className="catalog-action-button">
              Salvar tarifa
            </button>
          </div>
        </form>
      </div>

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
              <div>
                <label htmlFor="quote-tariff">Tarifa</label>
                <select
                  id="quote-tariff"
                  value={quoteTariffId}
                  onChange={(e) => setQuoteTariffId(e.target.value)}
                >
                  {filtered.filter((t) => t.active).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
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
