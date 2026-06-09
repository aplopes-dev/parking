import React, { useCallback, useEffect, useMemo, useState } from 'react';
import RegistryFormModal, { registryModalFooterButtons } from '../../components/RegistryFormModal';
import PremiumSelect from '../../components/PremiumSelect';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  fetchAllParkingSpots,
  lookupPlateAccess,
  registerParkingEntry,
  type ParkingSession,
  type ParkingSpot,
  type PlateAccess,
} from '../../services/parkingApi';
import { ACCESS_TYPE_LABELS, vehicleTypeSelectOptions } from './parkingConstants';

const EMPTY_ENTRY_FORM = {
  plate: '',
  vehicleType: 'car',
  spotId: '',
  driverName: '',
};

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

export interface ParkingEntryFormModalProps {
  isOpen: boolean;
  facilityId: string;
  onClose: () => void;
  onSuccess: (session: ParkingSession) => void;
  onError: (message: string) => void;
}

const ParkingEntryFormModal: React.FC<ParkingEntryFormModalProps> = ({
  isOpen,
  facilityId,
  onClose,
  onSuccess,
  onError,
}) => {
  const [form, setForm] = useState(EMPTY_ENTRY_FORM);
  const [plateAccess, setPlateAccess] = useState<PlateAccess | null>(null);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !facilityId) return;
    setForm(EMPTY_ENTRY_FORM);
    setPlateAccess(null);
    fetchAllParkingSpots(facilityId)
      .then((list) => setSpots(list.filter((s) => s.status === 'available')))
      .catch(() => setSpots([]));
  }, [isOpen, facilityId]);

  const availableSpots = useMemo(
    () => spots.filter((s) => s.status === 'available'),
    [spots],
  );

  const lookupPlate = useCallback(
    async (plate: string) => {
      if (plate.trim().length < 5 || !facilityId) {
        setPlateAccess(null);
        return;
      }
      try {
        const result = await lookupPlateAccess(plate, facilityId);
        setPlateAccess(result);
        if (result.accessType !== 'rotativo' && result.customerName) {
          setForm((f) => (f.driverName ? f : { ...f, driverName: result.customerName ?? f.driverName }));
        }
      } catch {
        setPlateAccess(null);
      }
    },
    [facilityId],
  );

  const handleClose = () => {
    if (isSaving) return;
    setForm(EMPTY_ENTRY_FORM);
    setPlateAccess(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) return;
    setIsSaving(true);
    try {
      const created = await registerParkingEntry({
        facilityId,
        plate: form.plate,
        vehicleType: form.vehicleType,
        spotId: form.spotId || undefined,
        driverName: form.driverName || undefined,
      });
      setForm(EMPTY_ENTRY_FORM);
      setPlateAccess(null);
      onSuccess(created);
    } catch (err) {
      onError(getApiErrorMessage(err, 'Erro ao processar.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RegistryFormModal
      isOpen={isOpen}
      title="Registrar entrada"
      subtitle="Gere ticket de entrada para veículo rotativo ou autorizado."
      isSaving={isSaving}
      onClose={handleClose}
      onSubmit={handleSubmit}
      footer={registryModalFooterButtons({
        onClose: handleClose,
        isSaving,
        submitLabel: 'Registrar entrada',
      })}
    >
      <div className="catalog-form-grid">
        <div className="form-group">
          <label htmlFor="dashboard-entry-plate">Placa</label>
          <input
            id="dashboard-entry-plate"
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
          id="dashboard-entry-type"
          label="Tipo de veículo"
          value={form.vehicleType}
          options={vehicleTypeSelectOptions}
          wrapperClassName="form-group"
          onChange={(v) => setForm((f) => ({ ...f, vehicleType: v }))}
        />
        <PremiumSelect
          id="dashboard-entry-spot"
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
          <label htmlFor="dashboard-entry-driver">Motorista (opcional)</label>
          <input
            id="dashboard-entry-driver"
            className="premium-text-input"
            value={form.driverName}
            onChange={(e) => setForm((f) => ({ ...f, driverName: e.target.value }))}
          />
        </div>
      </div>
    </RegistryFormModal>
  );
};

export default ParkingEntryFormModal;
