import React, { useCallback, useEffect, useMemo, useState } from 'react';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import RegistryFormModal, { registryModalFooterButtons } from '../../components/RegistryFormModal';
import SectionTabBar from '../../components/SectionTabBar';
import AlertModal from '../../components/AlertModal';
import PremiumSelect from '../../components/PremiumSelect';
import CatalogPagination from '../../components/catalog/CatalogPagination';
import CatalogActiveToggle from '../../components/catalog/CatalogActiveToggle';
import {
  createParkingDevice,
  fetchAllParkingFacilities,
  fetchParkingAccessEvents,
  fetchParkingDevices,
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
  deviceDirectionSelectOptions,
  deviceTypeSelectOptions,
  formatDateTime,
} from './parkingConstants';
import './ParkingPages.css';
import { getApiErrorMessage } from '../../utils/apiError';
import type { PaginatedMeta } from '../../types/pagination';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3085';

const EMPTY_DEVICE_FORM = {
  name: '',
  code: '',
  type: 'lpr_camera',
  direction: 'entry',
  vendor: '',
  ipAddress: '',
};

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
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [isSavingDevice, setIsSavingDevice] = useState(false);
  const { facilityId, setFacilityId } = useFacilityFilter(facilities);

  const [deviceForm, setDeviceForm] = useState(EMPTY_DEVICE_FORM);

  const closeDeviceModal = () => {
    if (isSavingDevice) return;
    setDeviceForm(EMPTY_DEVICE_FORM);
    setDeviceModalOpen(false);
  };

  const openDeviceModal = () => {
    setDeviceForm(EMPTY_DEVICE_FORM);
    setDeviceModalOpen(true);
  };

  const [simDeviceId, setSimDeviceId] = useState('');
  const [simPlate, setSimPlate] = useState('');
  const [simResult, setSimResult] = useState<HardwareLprResult | null>(null);
  const [togglingDeviceId, setTogglingDeviceId] = useState<string | null>(null);
  const [devicesPage, setDevicesPage] = useState(1);
  const [devicesLimit, setDevicesLimit] = useState(10);
  const [devicesMeta, setDevicesMeta] = useState<PaginatedMeta | null>(null);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsLimit, setEventsLimit] = useState(10);
  const [eventsMeta, setEventsMeta] = useState<PaginatedMeta | null>(null);

  const load = useCallback(async () => {
    const facs = await fetchAllParkingFacilities();
    setFacilities(facs);
    const fid = facilityId || facs[0]?.id;
    if (!fid) return;
    const [devsResult, evsResult] = await Promise.all([
      fetchParkingDevices({ facilityId: fid, page: devicesPage, limit: devicesLimit }),
      fetchParkingAccessEvents({ facilityId: fid, page: eventsPage, limit: eventsLimit }),
    ]);
    setDevices(devsResult.items);
    setDevicesMeta(devsResult.meta);
    setEvents(evsResult.items);
    setEventsMeta(evsResult.meta);
    setSimDeviceId((prev) => prev || devsResult.items[0]?.id || '');
  }, [facilityId, devicesPage, devicesLimit, eventsPage, eventsLimit]);

  useEffect(() => {
    setDevicesPage(1);
    setEventsPage(1);
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
    setIsSavingDevice(true);
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
      closeDeviceModal();
      await load();
      setAlert({ open: true, message: 'Dispositivo cadastrado. Copie a chave API abaixo.' });
    } catch (err) {
      setAlert({ open: true, message: getApiErrorMessage(err, 'Erro ao processar.') });
    } finally {
      setIsSavingDevice(false);
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
      setAlert({ open: true, message: getApiErrorMessage(err, 'Erro ao processar.') });
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
      <SectionTabBar
        tabs={[
          { id: 'devices', label: 'Dispositivos' },
          { id: 'events', label: 'Eventos' },
          { id: 'integracao', label: 'API / Hardware' },
          { id: 'simulador', label: 'Simulador LPR' },
        ]}
        activeTab={tab}
        onTabChange={(id) =>
          setTab(id as 'devices' | 'events' | 'integracao' | 'simulador')
        }
        ariaLabel="Seções de hardware"
      />

      {newKey ? (
        <div className="parking-panel parking-hardware-key-banner">
          <strong>Chave API (copie agora — não será exibida novamente):</strong>
          <code>{newKey}</code>
          <button type="button" className="catalog-action-button is-secondary" onClick={() => setNewKey(null)}>
            Fechar
          </button>
        </div>
      ) : null}

      <RegistryFormModal
        isOpen={deviceModalOpen}
        wide
        title="Novo dispositivo"
        subtitle="Cadastre câmeras LPR, cancelas ou catracas vinculadas à unidade."
        isSaving={isSavingDevice}
        onClose={closeDeviceModal}
        onSubmit={handleCreateDevice}
        footer={registryModalFooterButtons({
          onClose: closeDeviceModal,
          isSaving: isSavingDevice,
          submitLabel: 'Cadastrar dispositivo',
        })}
      >
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
                <PremiumSelect
                  id="dev-type"
                  label="Tipo"
                  value={deviceForm.type}
                  options={deviceTypeSelectOptions}
                  onChange={(v) => setDeviceForm((f) => ({ ...f, type: v }))}
                />
                <PremiumSelect
                  id="dev-dir"
                  label="Direção"
                  value={deviceForm.direction}
                  options={deviceDirectionSelectOptions}
                  onChange={(v) => setDeviceForm((f) => ({ ...f, direction: v }))}
                />
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
      </RegistryFormModal>

      {tab === 'devices' && (
        <>
          <div className="parking-panel">
            <div className="parking-actions-row parking-actions-row--panel-header">
              <h3 style={{ margin: 0 }}>Dispositivos ({devicesMeta?.total ?? devices.length})</h3>
              <button
                type="button"
                className="catalog-action-button"
                onClick={openDeviceModal}
                disabled={!facilityId}
              >
                Novo dispositivo
              </button>
            </div>
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
                          <div className="parking-actions-row parking-actions-row--compact">
                            <button
                              type="button"
                              className="catalog-action-button is-secondary"
                              onClick={() =>
                                void regenerateDeviceApiKey(d.id)
                                  .then((r) => {
                                    setNewKey(r.apiKeyPlain);
                                    setAlert({ open: true, message: 'Nova chave gerada.' });
                                  })
                                  .catch((err) => setAlert({ open: true, message: getApiErrorMessage(err, 'Erro ao processar.') }))
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
                                    .catch((err) => setAlert({ open: true, message: getApiErrorMessage(err, 'Erro ao processar.') }))
                                }
                              >
                                Abrir
                              </button>
                            )}
                            <CatalogActiveToggle
                              checked={Boolean(d.active)}
                              disabled={togglingDeviceId === d.id}
                              label={d.active ? 'Ativo' : 'Inativo'}
                              onChange={(active) => {
                                setTogglingDeviceId(d.id);
                                void updateParkingDevice(d.id, { active })
                                  .then(load)
                                  .catch((err) =>
                                    setAlert({ open: true, message: getApiErrorMessage(err, 'Erro ao processar.') }),
                                  )
                                  .finally(() => setTogglingDeviceId(null));
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {devicesMeta && devicesMeta.total > 0 ? (
              <CatalogPagination
                page={devicesMeta.page}
                totalPages={devicesMeta.totalPages}
                total={devicesMeta.total}
                limit={devicesLimit}
                disabled={loading}
                onPageChange={setDevicesPage}
                onLimitChange={(next) => {
                  setDevicesLimit(next);
                  setDevicesPage(1);
                }}
              />
            ) : null}
          </div>
        </>
      )}

      {tab === 'events' && (
        <div className="parking-panel">
          <h3>Log de eventos ({eventsMeta?.total ?? events.length})</h3>
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
          {eventsMeta && eventsMeta.total > 0 ? (
            <CatalogPagination
              page={eventsMeta.page}
              totalPages={eventsMeta.totalPages}
              total={eventsMeta.total}
              limit={eventsLimit}
              disabled={loading}
              onPageChange={setEventsPage}
              onLimitChange={(next) => {
                setEventsLimit(next);
                setEventsPage(1);
              }}
            />
          ) : null}
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
              <PremiumSelect
                id="sim-dev"
                label="Dispositivo"
                value={simDeviceId}
                options={devices.map((d) => ({
                  value: d.id,
                  label: `${d.name} (${deviceDirectionSelectOptions.find((o) => o.value === d.direction)?.label ?? d.direction})`,
                }))}
                onChange={setSimDeviceId}
              />
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
