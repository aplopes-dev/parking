import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import AlertModal from '../../components/AlertModal';
import {
  createParkingVehicle,
  fetchParkingVehicles,
  searchCustomers,
  updateParkingVehicle,
  type CustomerOption,
  type ParkingVehicleRecord,
} from '../../services/parkingApi';
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

function normalizePlateInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export const ParkingVehiclesPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<ParkingVehicleRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '' });
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<ParkingVehicleRecord | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [form, setForm] = useState({
    plate: '',
    vehicleType: 'car',
    holderName: '',
    brand: '',
    model: '',
    color: '',
    rfidTag: '',
    notes: '',
    customerId: '',
    customerName: '',
  });

  const load = useCallback(async () => {
    const data = await fetchParkingVehicles({ search: search || undefined });
    setVehicles(data);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setAlert({ open: true, message: 'Erro ao carregar veículos.' }))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (customerSearch.trim().length < 2) {
      setCustomerOptions([]);
      return;
    }
    const timer = setTimeout(() => {
      searchCustomers(customerSearch)
        .then(setCustomerOptions)
        .catch(() => setCustomerOptions([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const resetForm = () => {
    setForm({
      plate: '',
      vehicleType: 'car',
      holderName: '',
      brand: '',
      model: '',
      color: '',
      rfidTag: '',
      notes: '',
      customerId: '',
      customerName: '',
    });
    setShowForm(false);
    setSelected(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createParkingVehicle({
        plate: form.plate,
        vehicleType: form.vehicleType,
        holderName: form.holderName || undefined,
        brand: form.brand || undefined,
        model: form.model || undefined,
        color: form.color || undefined,
        rfidTag: form.rfidTag || undefined,
        notes: form.notes || undefined,
        customerId: form.customerId || undefined,
      });
      resetForm();
      await load();
      setAlert({ open: true, message: 'Veículo cadastrado.' });
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      await updateParkingVehicle(selected.id, {
        vehicleType: form.vehicleType,
        holderName: form.holderName || null,
        brand: form.brand || null,
        model: form.model || null,
        color: form.color || null,
        rfidTag: form.rfidTag || null,
        notes: form.notes || null,
        customerId: form.customerId || null,
        active: selected.active,
      });
      resetForm();
      await load();
      setAlert({ open: true, message: 'Veículo atualizado.' });
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
    }
  };

  const openEdit = (v: ParkingVehicleRecord) => {
    setSelected(v);
    setShowForm(true);
    setForm({
      plate: v.plate,
      vehicleType: v.vehicleType,
      holderName: v.holderName ?? '',
      brand: v.brand ?? '',
      model: v.model ?? '',
      color: v.color ?? '',
      rfidTag: v.rfidTag ?? '',
      notes: v.notes ?? '',
      customerId: v.customerId ?? '',
      customerName: v.customer?.name ?? '',
    });
  };

  const toggleActive = async (v: ParkingVehicleRecord) => {
    try {
      await updateParkingVehicle(v.id, { active: !v.active });
      await load();
    } catch (err) {
      setAlert({ open: true, message: errMsg(err) });
    }
  };

  return (
    <CatalogPageLayout
      moduleLabel="Cadastros"
      title="Veículos"
      description="Placas recorrentes, tags RFID e histórico unificado de acesso."
    >
      <div className="parking-toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar placa, titular ou RFID…"
        />
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Novo veículo
        </button>
      </div>

      {showForm ? (
        <section className="parking-panel">
          <h3>{selected ? `Editar ${selected.plate}` : 'Cadastrar veículo'}</h3>
          <form className="parking-form-grid" onSubmit={selected ? handleUpdate : handleCreate}>
            <div className="form-group">
              <label>Placa</label>
              <input
                value={form.plate}
                onChange={(e) => setForm({ ...form, plate: normalizePlateInput(e.target.value) })}
                required
                disabled={Boolean(selected)}
                maxLength={8}
              />
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <select
                value={form.vehicleType}
                onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
              >
                {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Titular</label>
              <input
                value={form.holderName}
                onChange={(e) => setForm({ ...form, holderName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Marca</label>
              <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Modelo</label>
              <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Cor</label>
              <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Tag RFID</label>
              <input value={form.rfidTag} onChange={(e) => setForm({ ...form, rfidTag: e.target.value })} />
            </div>
            <div className="form-group parking-form-span-2">
              <label>Cliente vinculado</label>
              {form.customerId ? (
                <div className="parking-customer-selected">
                  <strong>{form.customerName}</strong>
                  <button
                    type="button"
                    className="catalog-action-button is-secondary"
                    onClick={() => setForm({ ...form, customerId: '', customerName: '' })}
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <>
                  <input
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Buscar cliente…"
                  />
                  {customerOptions.length > 0 ? (
                    <ul className="parking-customer-options">
                      {customerOptions.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setForm({ ...form, customerId: c.id, customerName: c.name });
                              setCustomerSearch('');
                              setCustomerOptions([]);
                            }}
                          >
                            {c.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}
            </div>
            <div className="form-group parking-form-span-2">
              <label>Observações</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="parking-form-actions">
              <button type="submit" className="btn-primary">
                {selected ? 'Salvar' : 'Cadastrar'}
              </button>
              <button type="button" className="catalog-action-button is-secondary" onClick={resetForm}>
                Cancelar
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="parking-panel">
        <h3>Veículos cadastrados ({vehicles.length})</h3>
        {loading ? (
          <p className="parking-empty">Carregando…</p>
        ) : vehicles.length === 0 ? (
          <p className="parking-empty">
            Nenhum veículo cadastrado. Veículos de mensalistas e convênios são sincronizados automaticamente.
          </p>
        ) : (
          <div className="parking-table-wrap">
            <table className="parking-table">
              <thead>
                <tr>
                  <th>Placa</th>
                  <th>Tipo</th>
                  <th>Titular / Cliente</th>
                  <th>Acesso</th>
                  <th>RFID</th>
                  <th>Visitas</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <span className="parking-plate">{v.plate}</span>
                    </td>
                    <td>{VEHICLE_TYPE_LABELS[v.vehicleType] ?? v.vehicleType}</td>
                    <td>
                      {v.holderName ?? v.customer?.name ?? '—'}
                      {v.brand || v.model ? (
                        <div className="parking-hint">
                          {[v.brand, v.model, v.color].filter(Boolean).join(' · ')}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {v.contracts.length > 0 ? (
                        v.contracts.map((c) => (
                          <div key={c.id} className="parking-hint">
                            {c.type === 'mensalista' ? 'Mensalista' : 'Convênio'}: {c.label}
                            {' — '}
                            {CONTRACT_STATUS_LABELS[c.status] ?? c.status}
                          </div>
                        ))
                      ) : (
                        ACCESS_TYPE_LABELS.rotativo
                      )}
                    </td>
                    <td>{v.rfidTag ?? '—'}</td>
                    <td>{v.sessionCount}</td>
                    <td>
                      <span className={`parking-badge parking-badge--${v.active ? 'available' : 'occupied'}`}>
                        {v.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <div className="parking-actions-row">
                        <button
                          type="button"
                          className="catalog-action-button is-secondary"
                          onClick={() => openEdit(v)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="catalog-action-button is-secondary"
                          onClick={() => void toggleActive(v)}
                        >
                          {v.active ? 'Desativar' : 'Ativar'}
                        </button>
                        <Link to="/operacao/sessoes" className="catalog-action-button is-secondary">
                          Sessões
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AlertModal isOpen={alert.open} message={alert.message} onClose={() => setAlert({ open: false, message: '' })} />
    </CatalogPageLayout>
  );
};
