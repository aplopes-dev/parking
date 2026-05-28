export const PARKING_SYSTEM_TYPE_LABELS: Record<string, string> = {
  valet: 'Valet Parking',
  garage: 'Estacionamentos e Garagens',
  public: 'Estacionamentos Públicos',
};

export const PARKING_SEGMENT_LABELS: Record<string, string> = {
  commercial: 'Estacionamentos comerciais',
  hotel: 'Hotéis',
  airport: 'Aeroportos',
  shopping: 'Shoppings',
  event: 'Eventos',
  automotive: 'Serviços automotivos',
  stadium: 'Estádio e arena',
  dealership: 'Concessionárias',
  hospital: 'Hospitais e clínicas',
  network: 'Redes',
};

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  car: 'Automóvel',
  motorcycle: 'Motocicleta',
  truck: 'Caminhão',
  bus: 'Ônibus',
  other: 'Outro',
};

export const SPOT_STATUS_LABELS: Record<string, string> = {
  available: 'Disponível',
  occupied: 'Ocupada',
  reserved: 'Reservada',
  maintenance: 'Manutenção',
};

export const SESSION_STATUS_LABELS: Record<string, string> = {
  active: 'Ativa',
  closed: 'Encerrada',
  canceled: 'Cancelada',
};

export const TARIFF_BILLING_LABELS: Record<string, string> = {
  hourly: 'Por hora (rotativo)',
  daily: 'Diária',
  monthly: 'Mensalista',
};

export const ACCESS_TYPE_LABELS: Record<string, string> = {
  rotativo: 'Rotativo',
  mensalista: 'Mensalista',
  convenio: 'Convênio',
};

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  suspended: 'Suspenso',
  canceled: 'Cancelado',
  expired: 'Expirado',
};

export const VALET_STATUS_LABELS: Record<string, string> = {
  received: 'Recebido',
  parking: 'Estacionando',
  parked: 'Estacionado',
  requested: 'Solicitado',
  retrieving: 'Buscando',
  ready: 'Pronto na saída',
  delivered: 'Entregue',
  canceled: 'Cancelado',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'PIX',
  credit: 'Cartão crédito',
  debit: 'Cartão débito',
};

export const DEVICE_TYPE_LABELS: Record<string, string> = {
  lpr_camera: 'Câmera LPR',
  barrier: 'Cancela',
  turnstile: 'Catraca',
  controller: 'Controlador I/O',
};

export const DEVICE_DIRECTION_LABELS: Record<string, string> = {
  entry: 'Entrada',
  exit: 'Saída',
  bidirectional: 'Entrada e saída',
};

export const ACCESS_EVENT_LABELS: Record<string, string> = {
  plate_read: 'Leitura de placa',
  entry_allowed: 'Entrada liberada',
  entry_denied: 'Entrada negada',
  exit_allowed: 'Saída liberada',
  exit_denied: 'Saída negada',
  gate_open: 'Cancela aberta',
  gate_close: 'Cancela fechada',
  heartbeat: 'Heartbeat',
  manual_override: 'Abertura manual',
};

export function formatDurationMinutes(entryAt: string, exitAt?: string | null): string {
  const start = new Date(entryAt).getTime();
  const end = exitAt ? new Date(exitAt).getTime() : Date.now();
  const mins = Math.max(0, Math.floor((end - start) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${m}min`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
