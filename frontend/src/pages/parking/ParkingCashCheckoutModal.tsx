import React, { useState } from 'react';
import RegistryFormModal from '../../components/RegistryFormModal';
import type { ParkingSession } from '../../services/parkingApi';
import ParkingCashCheckoutPanel from './ParkingCashCheckoutPanel';

export type ParkingCashCheckoutModalProps = {
  isOpen: boolean;
  facilityId: string;
  session: ParkingSession | null;
  onClose: () => void;
  onSuccess: () => void;
  onNotify: (message: string, type: 'success' | 'error' | 'warning') => void;
};

const ParkingCashCheckoutModal: React.FC<ParkingCashCheckoutModalProps> = ({
  isOpen,
  facilityId,
  session,
  onClose,
  onSuccess,
  onNotify,
}) => {
  const [busy, setBusy] = useState(false);

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  if (!session) return null;

  return (
    <RegistryFormModal
      isOpen={isOpen}
      wide
      modalClassName="parking-cash-checkout-modal"
      title={`Caixa — ${session.plate}`}
      subtitle={`Ticket ${session.ticketCode} · cobrança e liberação de saída`}
      onClose={handleClose}
    >
      <ParkingCashCheckoutPanel
        facilityId={facilityId}
        session={session}
        onBusyChange={setBusy}
        onSuccess={(message) => {
          onNotify(message, 'success');
          onSuccess();
          onClose();
        }}
        onError={(message) => onNotify(message, 'error')}
      />
    </RegistryFormModal>
  );
};

export default ParkingCashCheckoutModal;
