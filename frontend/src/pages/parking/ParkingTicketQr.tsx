import React from 'react';

type ParkingTicketQrProps = {
  payload: string;
  size?: number;
  className?: string;
};

/** QR Code via serviço público — payload = ticketCode (PK-YYYYMMDD-XXXX). */
export const ParkingTicketQr: React.FC<ParkingTicketQrProps> = ({
  payload,
  size = 220,
  className,
}) => {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}`;
  return (
    <img
      src={src}
      alt={`QR Code ${payload}`}
      width={size}
      height={size}
      className={className}
    />
  );
};

type ParkingTicketReceiptProps = {
  ticketCode: string;
  qrPayload: string;
  plate: string;
  facilityName?: string | null;
  entryAt: string;
  onClose?: () => void;
  onPrint?: () => void;
};

export const ParkingTicketReceipt: React.FC<ParkingTicketReceiptProps> = ({
  ticketCode,
  qrPayload,
  plate,
  facilityName,
  entryAt,
  onClose,
  onPrint,
}) => (
  <div className="parking-ticket-receipt report-print-area">
    <h3>Ticket de entrada</h3>
    <p className="parking-hint">{facilityName ?? 'Estacionamento'}</p>
    <div className="parking-ticket-qr-wrap">
      <ParkingTicketQr payload={qrPayload} />
    </div>
    <p className="parking-ticket-code">{ticketCode}</p>
    <p>
      <strong>Placa:</strong> {plate}
    </p>
    <p>
      <strong>Entrada:</strong>{' '}
      {new Date(entryAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}
    </p>
    <p className="parking-hint">Apresente este QR Code ou informe o código na saída.</p>
    <div className="parking-form-actions">
      {onPrint ? (
        <button type="button" className="btn-primary" onClick={onPrint}>
          Imprimir ticket
        </button>
      ) : null}
      {onClose ? (
        <button type="button" className="catalog-action-button is-secondary" onClick={onClose}>
          Fechar
        </button>
      ) : null}
    </div>
  </div>
);
