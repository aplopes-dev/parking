import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import AlertModal from '../../components/AlertModal';
import {
  addAgreementVehicle,
  addSubscriptionVehicle,
  createParkingAgreement,
  createParkingSubscription,
  fetchParkingAgreements,
  fetchParkingFacilities,
  fetchParkingSubscriptions,
  fetchParkingTariffs,
  searchCustomers,
  updateParkingAgreement,
  updateParkingSubscription,
  type CustomerOption,
  type ParkingAgreement,
  type ParkingFacility,
  type ParkingSubscription,
  type ParkingTariff,
} from '../../services/parkingApi';
import { formatMoney } from '../finance/financeShared';
import {
  ACCESS_TYPE_LABELS,
  CONTRACT_STATUS_LABELS,
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

function ContractStatusBadge({ status }: { status: string }) {
  return (
    <span className={`parking-badge parking-badge--${status === 'active' ? 'available' : 'occupied'}`}>
      {CONTRACT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function CustomerPicker({
  value,
  onChange,
}: {
  value: CustomerOption | null;
  onChange: (c: CustomerOption | null) => void;
}) {
  const [term, setTerm] = useState('');
  const [options, setOptions] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (term.trim().length < 2) {
      setOptions([]);
      return;
    }
    const timer = setTimeout(() => {
      setLoading(true);
      searchCustomers(term)
        .then(setOptions)
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [term]);

  return (
    <div className="parking-customer-picker">
      {value ? (
        <div className="parking-customer-selected">
          <strong>{value.name}</strong>
          {value.document ? <span>{value.document}</span> : null}
          <button type="button" className="catalog-action-button is-secondary" onClick={() => onChange(null)}>
            Trocar
          </button>
        </div>
      ) : (
        <>
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar cliente por nome, CPF ou telefone…"
          />
          {loading ? <p className="parking-hint">Buscando…</p> : null}
          {options.length > 0 && (
            <ul className="parking-customer-options">
              {options.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => onChange(c)}>
                    {c.name}
                    {c.document ? ` — ${c.document}` : ''}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="parking-hint">
            Cliente não cadastrado?{' '}
            <Link to="/cadastros/clientes" target="_blank" rel="noreferrer">
              Cadastrar cliente
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export const ParkingContractsPage: React.FC = () => {
  const [tab, setTab] = useState<'subscriptions' | 'agreements'>('subscriptions');
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [subscriptions, setSubscriptions] = useState<ParkingSubscription[]>([]);
  const [agreements, setAgreements] = useState<ParkingAgreement[]>([]);
  const [monthlyTariffs, setMonthlyTariffs] = useState<ParkingTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '' });
  const { facilityId, setFacilityId } = useFacilityFilter(facilities);
  const [search, setSearch] = useState('');

  const [subCustomer, setSubCustomer] = useState<CustomerOption | null>(null);
  const [subForm, setSubForm] = useState({
    code: '',
    startDate: todayIso(),
    endDate: '',
    monthlyPrice: '',
    tariffId: '',
    notes: '',
    plate: '',
    vehicleType: 'car',
    holderName: '',
  });

  const [agrCustomer, setAgrCustomer] = useState<CustomerOption | null>(null);
  const [agrForm, setAgrForm] = useState({
    name: '',
    code: '',
    discountPercent: '20',
    fixedMonthlyFee: '',
    vehicleLimit: '',
    startDate: todayIso(),
    endDate: '',
    notes: '',
    plate: '',
    vehicleType: 'car',
    driverName: '',
    department: '',
  });

  const [vehicleModal, setVehicleModal] = useState<{
    type: 'subscription' | 'agreement';
    id: string;
    label: string;
  } | null>(null);
  const [vehicleForm, setVehicleForm] = useState({
    plate: '',
    vehicleType: 'car',
    holderName: '',
    driverName: '',
    department: '',
  });

  const load = useCallback(async () => {
    const facs = await fetchParkingFacilities();
    setFacilities(facs);
    const fid = facilityId || facs[0]?.id;
    const [subs, agrs, tariffs] = await Promise.all([
      fetchParkingSubscriptions({ facilityId: fid, search: search || undefined }),
      fetchParkingAgreements({ facilityId: fid, search: search || undefined }),
      fetchParkingTariffs({ facilityId: fid, billingType: 'monthly' }),
    ]);
    setSubscriptions(subs);
    setAgreements(agrs);
    setMonthlyTariffs(tariffs.filter((t) => t.active));
  }, [facilityId, search]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setAlert({ open: true, message: 'Erro ao carregar contratos.' }))
      .finally(() => setLoading(false));
  }, [load]);

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId || !subCustomer) return;
    try {
      const created = await createParkingSubscription({
        customerId: subCustomer.id,
        facilityId,
        code: subForm.code || undefined,
        startDate: subForm.startDate,
        endDate: subForm.endDate || undefined,
        monthlyPrice: Number(subForm.monthlyPrice),
        tariffId: subForm.tariffId || undefined,
        notes: subForm.notes || undefined,
      });
      if (subForm.plate.trim()) {
        await addSubscriptionVehicle(created.id, {
          plate: subForm.plate,
          vehicleType: subForm.vehicleType,
          holderName: subForm.holderName || undefined,
        });
      }
      setSubCustomer(null);
      setSubForm({
        code: '',
        startDate: todayIso(),
        endDate: '',
        monthlyPrice: '',
        tariffId: '',
        notes: '',
        plate: '',
        vehicleType: 'car',
        holderName: '',
      });
      await load();
      setAlert({ open: true, message: 'Contrato de mensalista criado e sincronizado com o CRM.' });
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
    }
  };

  const handleCreateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agrCustomer) return;
    try {
      const created = await createParkingAgreement({
        customerId: agrCustomer.id,
        facilityId: facilityId || undefined,
        name: agrForm.name,
        code: agrForm.code || undefined,
        discountPercent: agrForm.discountPercent ? Number(agrForm.discountPercent) : undefined,
        fixedMonthlyFee: agrForm.fixedMonthlyFee ? Number(agrForm.fixedMonthlyFee) : undefined,
        vehicleLimit: agrForm.vehicleLimit ? Number(agrForm.vehicleLimit) : undefined,
        startDate: agrForm.startDate,
        endDate: agrForm.endDate || undefined,
        notes: agrForm.notes || undefined,
      });
      if (agrForm.plate.trim()) {
        await addAgreementVehicle(created.id, {
          plate: agrForm.plate,
          vehicleType: agrForm.vehicleType,
          driverName: agrForm.driverName || undefined,
          department: agrForm.department || undefined,
        });
      }
      setAgrCustomer(null);
      setAgrForm({
        name: '',
        code: '',
        discountPercent: '20',
        fixedMonthlyFee: '',
        vehicleLimit: '',
        startDate: todayIso(),
        endDate: '',
        notes: '',
        plate: '',
        vehicleType: 'car',
        driverName: '',
        department: '',
      });
      await load();
      setAlert({ open: true, message: 'Convênio corporativo criado e sincronizado com o CRM.' });
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleModal) return;
    try {
      if (vehicleModal.type === 'subscription') {
        await addSubscriptionVehicle(vehicleModal.id, {
          plate: vehicleForm.plate,
          vehicleType: vehicleForm.vehicleType,
          holderName: vehicleForm.holderName || undefined,
        });
      } else {
        await addAgreementVehicle(vehicleModal.id, {
          plate: vehicleForm.plate,
          vehicleType: vehicleForm.vehicleType,
          driverName: vehicleForm.driverName || undefined,
          department: vehicleForm.department || undefined,
        });
      }
      setVehicleModal(null);
      setVehicleForm({ plate: '', vehicleType: 'car', holderName: '', driverName: '', department: '' });
      await load();
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
    }
  };

  const suspendSubscription = async (sub: ParkingSubscription) => {
    try {
      await updateParkingSubscription(sub.id, {
        status: sub.status === 'active' ? 'suspended' : 'active',
      });
      await load();
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
    }
  };

  const suspendAgreement = async (agr: ParkingAgreement) => {
    try {
      await updateParkingAgreement(agr.id, {
        status: agr.status === 'active' ? 'suspended' : 'active',
      });
      await load();
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
    }
  };

  return (
    <CatalogPageLayout
      className="parking-page catalog-page--ifood"
      moduleLabel="Estacionamento"
      modulePath="/estacionamento/mensalistas"
      title="Mensalistas e convênios"
      description="Contratos de mensalidade e convênios corporativos com integração ao CRM."
      loading={loading && !facilities.length}
      loadingDescription="Carregando contratos…"
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
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente, código ou placa…"
          />
        </div>
      }
    >
      <div className="parking-tabs">
        <button
          type="button"
          className={tab === 'subscriptions' ? 'is-active' : ''}
          onClick={() => setTab('subscriptions')}
        >
          Mensalistas
        </button>
        <button
          type="button"
          className={tab === 'agreements' ? 'is-active' : ''}
          onClick={() => setTab('agreements')}
        >
          Convênios
        </button>
      </div>

      {tab === 'subscriptions' ? (
        <>
          <div className="parking-panel">
            <h3>Novo contrato de mensalista</h3>
            <form onSubmit={(e) => void handleCreateSubscription(e)}>
              <div className="parking-form-grid">
                <div className="parking-form-span-2">
                  <label>Cliente (CRM)</label>
                  <CustomerPicker value={subCustomer} onChange={setSubCustomer} />
                </div>
                <div>
                  <label htmlFor="sub-code">Código</label>
                  <input
                    id="sub-code"
                    value={subForm.code}
                    onChange={(e) => setSubForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="M-001"
                  />
                </div>
                <div>
                  <label htmlFor="sub-tariff">Plano tarifário</label>
                  <select
                    id="sub-tariff"
                    value={subForm.tariffId}
                    onChange={(e) => {
                      const tariff = monthlyTariffs.find((t) => t.id === e.target.value);
                      setSubForm((f) => ({
                        ...f,
                        tariffId: e.target.value,
                        monthlyPrice: tariff ? tariff.price : f.monthlyPrice,
                      }));
                    }}
                  >
                    <option value="">Valor manual</option>
                    {monthlyTariffs.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {formatMoney(t.price)}/mês
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="sub-price">Mensalidade (R$)</label>
                  <input
                    id="sub-price"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={subForm.monthlyPrice}
                    onChange={(e) => setSubForm((f) => ({ ...f, monthlyPrice: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="sub-start">Início</label>
                  <input
                    id="sub-start"
                    type="date"
                    required
                    value={subForm.startDate}
                    onChange={(e) => setSubForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="sub-end">Término (opcional)</label>
                  <input
                    id="sub-end"
                    type="date"
                    value={subForm.endDate}
                    onChange={(e) => setSubForm((f) => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="sub-plate">Placa inicial</label>
                  <input
                    id="sub-plate"
                    value={subForm.plate}
                    onChange={(e) => setSubForm((f) => ({ ...f, plate: e.target.value.toUpperCase() }))}
                    placeholder="ABC1D23"
                  />
                </div>
                <div>
                  <label htmlFor="sub-vehicle">Tipo veículo</label>
                  <select
                    id="sub-vehicle"
                    value={subForm.vehicleType}
                    onChange={(e) => setSubForm((f) => ({ ...f, vehicleType: e.target.value }))}
                  >
                    {Object.entries(VEHICLE_TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="parking-actions-row">
                <button type="submit" className="catalog-action-button" disabled={!subCustomer}>
                  Criar mensalista
                </button>
              </div>
            </form>
          </div>

          <div className="parking-panel">
            <h3>Contratos ativos ({subscriptions.length})</h3>
            {subscriptions.length === 0 ? (
              <p className="parking-empty">Nenhum mensalista cadastrado.</p>
            ) : (
              <div className="parking-table-wrap">
                <table className="parking-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Código</th>
                      <th>Mensalidade</th>
                      <th>Vigência</th>
                      <th>Veículos</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <strong>{s.customer?.name ?? '—'}</strong>
                          {s.customer?.phone ? <div className="parking-hint">{s.customer.phone}</div> : null}
                        </td>
                        <td>{s.code ?? '—'}</td>
                        <td>{formatMoney(s.monthlyPrice)}</td>
                        <td>
                          {s.startDate}
                          {s.endDate ? ` → ${s.endDate}` : ''}
                        </td>
                        <td>
                          {(s.vehicles ?? []).map((v) => (
                            <span key={v.id} className="parking-plate parking-plate-chip">
                              {v.plate}
                            </span>
                          ))}
                        </td>
                        <td>
                          <ContractStatusBadge status={s.status} />
                        </td>
                        <td>
                          <div className="parking-actions-row">
                            <button
                              type="button"
                              className="catalog-action-button is-secondary"
                              onClick={() =>
                                setVehicleModal({
                                  type: 'subscription',
                                  id: s.id,
                                  label: s.customer?.name ?? 'Mensalista',
                                })
                              }
                            >
                              + Placa
                            </button>
                            <button
                              type="button"
                              className="catalog-action-button is-secondary"
                              onClick={() => void suspendSubscription(s)}
                            >
                              {s.status === 'active' ? 'Suspender' : 'Reativar'}
                            </button>
                            {s.customerId ? (
                              <Link
                                to={`/crm/clientes?customerId=${s.customerId}`}
                                className="catalog-action-button is-secondary"
                              >
                                CRM
                              </Link>
                            ) : null}
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
      ) : (
        <>
          <div className="parking-panel">
            <h3>Novo convênio corporativo</h3>
            <form onSubmit={(e) => void handleCreateAgreement(e)}>
              <div className="parking-form-grid">
                <div className="parking-form-span-2">
                  <label>Empresa (cliente CRM)</label>
                  <CustomerPicker value={agrCustomer} onChange={setAgrCustomer} />
                </div>
                <div>
                  <label htmlFor="agr-name">Nome do convênio</label>
                  <input
                    id="agr-name"
                    required
                    value={agrForm.name}
                    onChange={(e) => setAgrForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Empresa XYZ — Funcionários"
                  />
                </div>
                <div>
                  <label htmlFor="agr-code">Código</label>
                  <input
                    id="agr-code"
                    value={agrForm.code}
                    onChange={(e) => setAgrForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="CV-001"
                  />
                </div>
                <div>
                  <label htmlFor="agr-discount">Desconto rotativo (%)</label>
                  <input
                    id="agr-discount"
                    type="number"
                    min="0"
                    max="100"
                    value={agrForm.discountPercent}
                    onChange={(e) => setAgrForm((f) => ({ ...f, discountPercent: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="agr-fee">Taxa fixa mensal (opcional)</label>
                  <input
                    id="agr-fee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={agrForm.fixedMonthlyFee}
                    onChange={(e) => setAgrForm((f) => ({ ...f, fixedMonthlyFee: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="agr-limit">Limite de veículos</label>
                  <input
                    id="agr-limit"
                    type="number"
                    min="1"
                    value={agrForm.vehicleLimit}
                    onChange={(e) => setAgrForm((f) => ({ ...f, vehicleLimit: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="agr-start">Início</label>
                  <input
                    id="agr-start"
                    type="date"
                    required
                    value={agrForm.startDate}
                    onChange={(e) => setAgrForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="agr-plate">Placa inicial</label>
                  <input
                    id="agr-plate"
                    value={agrForm.plate}
                    onChange={(e) => setAgrForm((f) => ({ ...f, plate: e.target.value.toUpperCase() }))}
                  />
                </div>
              </div>
              <div className="parking-actions-row">
                <button type="submit" className="catalog-action-button" disabled={!agrCustomer}>
                  Criar convênio
                </button>
              </div>
            </form>
          </div>

          <div className="parking-panel">
            <h3>Convênios ({agreements.length})</h3>
            {agreements.length === 0 ? (
              <p className="parking-empty">Nenhum convênio cadastrado.</p>
            ) : (
              <div className="parking-table-wrap">
                <table className="parking-table">
                  <thead>
                    <tr>
                      <th>Convênio</th>
                      <th>Empresa</th>
                      <th>Desconto</th>
                      <th>Veículos</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {agreements.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <strong>{a.name}</strong>
                          {a.code ? <div className="parking-hint">{a.code}</div> : null}
                        </td>
                        <td>{a.customer?.name ?? '—'}</td>
                        <td>
                          {a.discountPercent != null ? `${a.discountPercent}%` : '—'}
                          {a.fixedMonthlyFee ? (
                            <div className="parking-hint">
                              + {formatMoney(a.fixedMonthlyFee)}/mês
                            </div>
                          ) : null}
                        </td>
                        <td>
                          {(a.vehicles ?? []).map((v) => (
                            <span key={v.id} className="parking-plate parking-plate-chip">
                              {v.plate}
                            </span>
                          ))}
                        </td>
                        <td>
                          <ContractStatusBadge status={a.status} />
                        </td>
                        <td>
                          <div className="parking-actions-row">
                            <button
                              type="button"
                              className="catalog-action-button is-secondary"
                              onClick={() =>
                                setVehicleModal({
                                  type: 'agreement',
                                  id: a.id,
                                  label: a.name,
                                })
                              }
                            >
                              + Placa
                            </button>
                            <button
                              type="button"
                              className="catalog-action-button is-secondary"
                              onClick={() => void suspendAgreement(a)}
                            >
                              {a.status === 'active' ? 'Suspender' : 'Reativar'}
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

      {vehicleModal ? (
        <div className="parking-modal-backdrop" onClick={() => setVehicleModal(null)}>
          <div className="parking-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Adicionar veículo — {vehicleModal.label}</h3>
            <form onSubmit={(e) => void handleAddVehicle(e)}>
              <div className="parking-form-grid">
                <div>
                  <label htmlFor="veh-plate">Placa</label>
                  <input
                    id="veh-plate"
                    required
                    value={vehicleForm.plate}
                    onChange={(e) =>
                      setVehicleForm((f) => ({ ...f, plate: e.target.value.toUpperCase() }))
                    }
                  />
                </div>
                <div>
                  <label htmlFor="veh-type">Tipo</label>
                  <select
                    id="veh-type"
                    value={vehicleForm.vehicleType}
                    onChange={(e) => setVehicleForm((f) => ({ ...f, vehicleType: e.target.value }))}
                  >
                    {Object.entries(VEHICLE_TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="parking-actions-row">
                <button type="submit" className="catalog-action-button">
                  Salvar placa
                </button>
                <button
                  type="button"
                  className="catalog-action-button is-secondary"
                  onClick={() => setVehicleModal(null)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <AlertModal isOpen={alert.open} message={alert.message} onClose={() => setAlert({ open: false, message: '' })} />
    </CatalogPageLayout>
  );
};
