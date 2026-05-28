import React, { useCallback, useEffect, useMemo, useState } from 'react';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import AlertModal from '../../components/AlertModal';
import {
  createParkingDevice,
  fetchParkingAccessEvents,
  fetchParkingDevices,
  fetchParkingFacilities,
  openGateManually,
  regenerateDeviceApiKey,
  simulateHardwareLpr,
  updateParkingDevice,
  type HardwareLprResult,
  type ParkingAccessDevice,
  type ParkingAccessEvent,
  type ParkingFacility,
} from '../../services/parkingApi';
import {
  ACCESS_EVENT_LABELS,
  DEVICE_DIRECTION_LABELS,
  DEVICE_TYPE_LABELS,
  formatDateTime,
} from './parkingConstants';
import './ParkingPages.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3085';

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

type HardwarePageProps = {
  defaultTab?: 'devices' | 'events' | 'integracao' | 'simulador';
  title?: string;
  description?: string;
  modulePath?: string;
};

export const ParkingHardwarePage: React.FC<HardwarePageProps> = ({
  defaultTab = 'devices',
  title = 'LPR e catracas',
  description = 'Integração com câmeras LPR, cancelas e catracas.',
  modulePath = '/integracoes/lpr',
}) => {
  const [tab, setTab] = useState(defaultTab);
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [devices, setDevices] = useState<ParkingAccessDevice[]>([]);
  const [events, setEvents] = useState<ParkingAccessEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '' });
  const [newKey, setNewKey] = useState<string | null>(null);
  const { facilityId, setFacilityId } = useFacilityFilter(facilities);

  const [deviceForm, setDeviceForm] = useState({
    name: '',
    code: '',
    type: 'lpr_camera',
    direction: 'entry',
    vendor: '',
    ipAddress: '',
  });

  const [simDeviceId, setSimDeviceId] = useState('');
  const [simPlate, setSimPlate] = useState('');
  const [simResult, setSimResult] = useState<HardwareLprResult | null>(null);

  const load = useCallback(async () => {
    const facs = await fetchParkingFacilities();
    setFacilities(facs);
    const fid = facilityId || facs[0]?.id;
    if (!fid) return;
    const [devs, evs] = await Promise.all([
      fetchParkingDevices(fid),
      fetchParkingAccessEvents({ facilityId: fid }),
    ]);
    setDevices(devs);
    setEvents(evs);
    setSimDeviceId((prev) => prev || devs[0]?.id || '');
  }, [facilityId]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setAlert({ open: true, message: 'Erro ao carregar integrações.' }))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  const lprDevices = useMemo(
    () => devices.filter((d) => d.type === 'lpr_camera'),
    [devices],
  );
  const gateDevices = useMemo(
    () => devices.filter((d) => d.type === 'barrier' || d.type === 'turnstile'),
    [devices],
  );

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) return;
    try {
      const created = await createParkingDevice({
        facilityId,
        name: deviceForm.name,
        code: deviceForm.code || undefined,
        type: deviceForm.type,
        direction: deviceForm.direction,
        vendor: deviceForm.vendor || undefined,
        ipAddress: deviceForm.ipAddress || undefined,
      });
      setNewKey(created.apiKeyPlain ?? null);
      setDeviceForm({ name: '', code: '', type: 'lpr_camera', direction: 'entry', vendor: '', ipAddress: '' });
      await load();
      setAlert({ open: true, message: 'Dispositivo cadastrado. Copie a chave API abaixo.' });
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
    }
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simDeviceId || !simPlate) return;
    try {
      const result = await simulateHardwareLpr({
        deviceId: simDeviceId,
        plate: simPlate.toUpperCase(),
        confidence: 98,
      });
      setSimResult(result);
      await load();
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
    }
  };

  return (
    <CatalogPageLayout
      className="parking-page catalog-page--ifood"
      moduleLabel="Integrações"
      modulePath={modulePath}
      title={title}
      description={description}
      loading={loading && !facilities.length}
      loadingDescription="Carregando hardware…"
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
      <div className="parking-tabs">
        {(
          [
            ['devices', 'Dispositivos'],
            ['events', 'Eventos'],
            ['integracao', 'API / Hardware'],
            ['simulador', 'Simulador LPR'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? 'is-active' : ''}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {newKey ? (
        <div className="parking-panel parking-hardware-key-banner">
          <strong>Chave API (copie agora — não será exibida novamente):</strong>
          <code>{newKey}</code>
          <button type="button" className="catalog-action-button is-secondary" onClick={() => setNewKey(null)}>
            Fechar
          </button>
        </div>
      ) : null}

      {tab === 'devices' && (
        <>
          <div className="parking-panel">
            <h3>Novo dispositivo</h3>
            <form onSubmit={(e) => void handleCreateDevice(e)}>
              <div className="parking-form-grid">
                <div>
                  <label htmlFor="dev-name">Nome</label>
                  <input
                    id="dev-name"
                    required
                    value={deviceForm.name}
                    onChange={(e) => setDeviceForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="dev-code">Código</label>
                  <input
                    id="dev-code"
                    value={deviceForm.code}
                    onChange={(e) => setDeviceForm((f) => ({ ...f, code: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="dev-type">Tipo</label>
                  <select
                    id="dev-type"
                    value={deviceForm.type}
                    onChange={(e) => setDeviceForm((f) => ({ ...f, type: e.target.value }))}
                  >
                    {Object.entries(DEVICE_TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="dev-dir">Direção</label>
                  <select
                    id="dev-dir"
                    value={deviceForm.direction}
                    onChange={(e) => setDeviceForm((f) => ({ ...f, direction: e.target.value }))}
                  >
                    {Object.entries(DEVICE_DIRECTION_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="dev-vendor">Fabricante</label>
                  <input
                    id="dev-vendor"
                    value={deviceForm.vendor}
                    onChange={(e) => setDeviceForm((f) => ({ ...f, vendor: e.target.value }))}
                    placeholder="Hikvision, Intelbras…"
                  />
                </div>
                <div>
                  <label htmlFor="dev-ip">IP</label>
                  <input
                    id="dev-ip"
                    value={deviceForm.ipAddress}
                    onChange={(e) => setDeviceForm((f) => ({ ...f, ipAddress: e.target.value }))}
                  />
                </div>
              </div>
              <div className="parking-actions-row">
                <button type="submit" className="catalog-action-button">
                  Cadastrar dispositivo
                </button>
              </div>
            </form>
          </div>

          <div className="parking-panel">
            <h3>Dispositivos ({devices.length})</h3>
            {devices.length === 0 ? (
              <p className="parking-empty">Nenhum dispositivo cadastrado.</p>
            ) : (
              <div className="parking-table-wrap">
                <table className="parking-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Tipo</th>
                      <th>Direção</th>
                      <th>Status</th>
                      <th>Último contato</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <strong>{d.name}</strong>
                          {d.code ? <div className="parking-hint">{d.code}</div> : null}
                          {d.ipAddress ? <div className="parking-hint">{d.ipAddress}</div> : null}
                        </td>
                        <td>{DEVICE_TYPE_LABELS[d.type] ?? d.type}</td>
                        <td>{DEVICE_DIRECTION_LABELS[d.direction] ?? d.direction}</td>
                        <td>
                          <span className={`parking-badge parking-badge--${d.active ? 'available' : 'occupied'}`}>
                            {d.active ? 'Ativo' : 'Inativo'}
                          </span>
                          <div className="parking-hint">
                            {d.autoEntry ? 'Auto entrada' : 'Entrada manual'} ·{' '}
                            {d.autoExitWaived ? 'Auto saída isenta' : 'Saída manual'}
                          </div>
                        </td>
                        <td>{d.lastSeenAt ? formatDateTime(d.lastSeenAt) : '—'}</td>
                        <td>
                          <div className="parking-actions-row" style={{ marginTop: 0 }}>
                            <button
                              type="button"
                              className="catalog-action-button is-secondary"
                              onClick={() =>
                                void regenerateDeviceApiKey(d.id)
                                  .then((r) => {
                                    setNewKey(r.apiKeyPlain);
                                    setAlert({ open: true, message: 'Nova chave gerada.' });
                                  })
                                  .catch((err) => setAlert({ open: true, message: errMsg(err) }))
                              }
                            >
                              Nova chave
                            </button>
                            {(d.type === 'barrier' || d.type === 'turnstile') && (
                              <button
                                type="button"
                                className="catalog-action-button"
                                onClick={() =>
                                  void openGateManually(d.id, { reason: 'Teste manual' })
                                    .then(() => setAlert({ open: true, message: 'Comando de abertura enviado.' }))
                                    .catch((err) => setAlert({ open: true, message: errMsg(err) }))
                                }
                              >
                                Abrir
                              </button>
                            )}
                            <button
                              type="button"
                              className="catalog-action-button is-secondary"
                              onClick={() =>
                                void updateParkingDevice(d.id, { active: !d.active }).then(load)
                              }
                            >
                              {d.active ? 'Desativar' : 'Ativar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'events' && (
        <div className="parking-panel">
          <h3>Log de eventos ({events.length})</h3>
          {events.length === 0 ? (
            <p className="parking-empty">Nenhum evento registrado.</p>
          ) : (
            <div className="parking-table-wrap">
              <table className="parking-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Dispositivo</th>
                    <th>Evento</th>
                    <th>Placa</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id}>
                      <td>{formatDateTime(ev.createdAt)}</td>
                      <td>{ev.device?.name ?? '—'}</td>
                      <td>{ACCESS_EVENT_LABELS[ev.eventType] ?? ev.eventType}</td>
                      <td className="parking-plate">{ev.plate ?? '—'}</td>
                      <td>
                        <span
                          className={`parking-badge parking-badge--${ev.allowed ? 'available' : 'occupied'}`}
                        >
                          {ev.allowed ? 'Liberado' : 'Negado'}
                        </span>
                        {ev.message ? <div className="parking-hint">{ev.message}</div> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'integracao' && (
        <div className="parking-panel parking-hardware-docs">
          <h3>Integração com hardware</h3>
          <p>
            Configure câmeras LPR ou controladores de cancela/catraca para enviar leituras via HTTP.
            Autentique cada requisição com o header <code>X-Device-Key</code> (chave gerada no cadastro).
          </p>

          <h4>Endpoints do dispositivo</h4>
          <ul className="parking-hardware-endpoints">
            <li>
              <strong>POST</strong> <code>{API_BASE}/parking/hardware/device/lpr</code>
              <pre>{`{
  "plate": "ABC1D23",
  "confidence": 97.5,
  "raw": { "lane": 1 }
}`}</pre>
              Resposta: <code>{`{ "allowed": true, "action": "open_gate", "reason": "..." }`}</code>
            </li>
            <li>
              <strong>POST</strong> <code>{API_BASE}/parking/hardware/device/heartbeat</code>
            </li>
            <li>
              <strong>GET</strong> <code>{API_BASE}/parking/hardware/device/commands/poll</code>
              — cancelas que fazem polling recebem comando <code>open</code>
            </li>
            <li>
              <strong>POST</strong> <code>{API_BASE}/parking/hardware/device/commands/:id/ack</code>
            </li>
          </ul>

          <h4>Fluxo automático</h4>
          <ul>
            <li><strong>Entrada (LPR):</strong> registra sessão, identifica mensalista/convênio, enfileira abertura da cancela.</li>
            <li><strong>Saída:</strong> mensalista ou tolerância → libera; valor pendente → nega e orienta ao caixa.</li>
            <li><strong>Cancelas/catracas:</strong> fazem poll de comandos ou abrem conforme resposta HTTP do POST LPR.</li>
          </ul>

          <p className="parking-hint">
            Câmeras LPR cadastradas: {lprDevices.length} · Cancelas/catracas: {gateDevices.length}
          </p>
        </div>
      )}

      {tab === 'simulador' && (
        <div className="parking-panel">
          <h3>Simulador LPR</h3>
          <p className="parking-hint">
            Teste o fluxo sem hardware — equivalente ao POST <code>/parking/hardware/device/lpr</code>.
          </p>
          <form onSubmit={(e) => void handleSimulate(e)}>
            <div className="parking-form-grid">
              <div>
                <label htmlFor="sim-dev">Dispositivo</label>
                <select
                  id="sim-dev"
                  value={simDeviceId}
                  onChange={(e) => setSimDeviceId(e.target.value)}
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({DEVICE_DIRECTION_LABELS[d.direction]})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="sim-plate">Placa</label>
                <input
                  id="sim-plate"
                  required
                  value={simPlate}
                  onChange={(e) => setSimPlate(e.target.value.toUpperCase())}
                  placeholder="ABC1D23 ou DEMO1"
                />
              </div>
            </div>
            <div className="parking-actions-row">
              <button type="submit" className="catalog-action-button" disabled={!simDeviceId}>
                Simular leitura
              </button>
            </div>
          </form>
          {simResult ? (
            <div className={`parking-hardware-result parking-hardware-result--${simResult.allowed ? 'ok' : 'deny'}`}>
              <strong>{simResult.allowed ? 'Liberado' : 'Negado'}</strong>
              <span>{simResult.reason}</span>
              <span className="parking-hint">Ação: {simResult.action}</span>
            </div>
          ) : null}
        </div>
      )}

      <AlertModal isOpen={alert.open} message={alert.message} onClose={() => setAlert({ open: false, message: '' })} />
    </CatalogPageLayout>
  );
};

export const ParkingLprPage: React.FC = () => (
  <ParkingHardwarePage
    defaultTab="simulador"
    title="LPR / OCR de placas"
    description="Câmeras de reconhecimento automático na entrada e saída."
    modulePath="/integracoes/lpr"
  />
);

export const ParkingGatesPage: React.FC = () => (
  <ParkingHardwarePage
    defaultTab="devices"
    title="Catracas e cancelas"
    description="Controladores de acesso, cancelas e catracas."
    modulePath="/integracoes/catracas"
  />
);
