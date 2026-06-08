import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CatalogPageLayout from '../../components/CatalogPageLayout';
import RegistryFormModal, { registryModalFooterButtons } from '../../components/RegistryFormModal';
import AlertModal from '../../components/AlertModal';
import PremiumSelect from '../../components/PremiumSelect';
import { useDebouncedRegistrySearch } from '../../hooks/useDebouncedRegistrySearch';
import { getApiErrorMessage } from '../../utils/apiError';
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
  vehicleTypeSelectOptions,
} from './parkingConstants';
import './ParkingPages.css';

function normalizePlateInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export const ParkingVehiclesPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<ParkingVehicleRecord[]>([]);
  const {
    search,
    searchDebounced,
    handleSearchChange,
    applySearchNow,
    clearSearch,
  } = useDebouncedRegistrySearch();
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '' });
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
    const data = await fetchParkingVehicles({ search: searchDebounced || undefined });
    setVehicles(data);
  }, [searchDebounced]);

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

  const clearFormFields = () => {
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
    setSelected(null);
    setCustomerSearch('');
    setCustomerOptions([]);
  };

  const closeFormModal = () => {
    if (isSaving) return;
    clearFormFields();
    setFormModalOpen(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
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
      closeFormModal();
      await load();
      setAlert({ open: true, message: 'Veículo cadastrado.' });
    } catch (err) {
      setAlert({ open: true, message: getApiErrorMessage(err, 'Erro ao processar.') });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setIsSaving(true);
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
      closeFormModal();
      await load();
      setAlert({ open: true, message: 'Veículo atualizado.' });
    } catch (err) {
      setAlert({ open: true, message: getApiErrorMessage(err, 'Erro ao processar.') });
    } finally {
      setIsSaving(false);
    }
  };

  const openCreateModal = () => {
    clearFormFields();
    setFormModalOpen(true);
  };

  const openEdit = (v: ParkingVehicleRecord) => {
    setSelected(v);
    setFormModalOpen(true);
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
      setAlert({ open: true, message: getApiErrorMessage(err, 'Erro ao processar.') });
    }
  };

  return (
    <CatalogPageLayout
      moduleLabel="Cadastros"
      title="Veículos"
      description="Placas recorrentes, tags RFID e histórico unificado de acesso."
      actions={
        <button type="button" className="catalog-action-button" onClick={openCreateModal}>
          Novo veículo
        </button>
      }
    >
      <section className="catalog-surface">
        <div className="catalog-toolbar catalog-filter-toolbar">
          <div className="form-group catalog-search catalog-filter-toolbar__search catalog-filter-toolbar__search--wide">
            <label htmlFor="vehicles-search">Buscar</label>
            <input
              id="vehicles-search"
              className="premium-text-input"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applySearchNow();
              }}
              placeholder="Placa, titular ou RFID…"
            />
          </div>
          <button
            type="button"
            className="catalog-form-footer-btn catalog-form-footer-btn--primary catalog-filter-toolbar__action"
            onClick={applySearchNow}
          >
            Buscar
          </button>
          <button
            type="button"
            className="catalog-form-footer-btn catalog-form-footer-btn--ghost catalog-filter-toolbar__action"
            onClick={clearSearch}
          >
            Limpar
          </button>
        </div>
      </section>

      <RegistryFormModal
        isOpen={formModalOpen}
        wide
        title={selected ? `Editar ${selected.plate}` : 'Novo veículo'}
        subtitle={
          selected
            ? 'Atualize dados do veículo e vínculo com cliente.'
            : 'Cadastre placas recorrentes, tags RFID e titulares.'
        }
        isSaving={isSaving}
        onClose={closeFormModal}
        onSubmit={selected ? handleUpdate : handleCreate}
        footer={registryModalFooterButtons({
          onClose: closeFormModal,
          isSaving,
          submitLabel: selected ? 'Salvar alterações' : 'Cadastrar veículo',
        })}
      >
        <div className="parking-form-grid">
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
            <PremiumSelect
              label="Tipo"
              value={form.vehicleType}
              options={vehicleTypeSelectOptions}
              wrapperClassName="form-group"
              onChange={(v) => setForm({ ...form, vehicleType: v })}
            />
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
        </div>
      </RegistryFormModal>

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
