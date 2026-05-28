export enum ParkingSystemType {
  VALET = 'valet',
  GARAGE = 'garage',
  PUBLIC = 'public',
}

export enum ParkingSegment {
  COMMERCIAL = 'commercial',
  HOTEL = 'hotel',
  AIRPORT = 'airport',
  SHOPPING = 'shopping',
  EVENT = 'event',
  AUTOMOTIVE = 'automotive',
  STADIUM = 'stadium',
  DEALERSHIP = 'dealership',
  HOSPITAL = 'hospital',
  NETWORK = 'network',
}

export enum ParkingSpotStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  MAINTENANCE = 'maintenance',
}

export enum ParkingSessionStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  CANCELED = 'canceled',
}

export enum VehicleType {
  CAR = 'car',
  MOTORCYCLE = 'motorcycle',
  TRUCK = 'truck',
  BUS = 'bus',
  OTHER = 'other',
}

export enum TariffBillingType {
  HOURLY = 'hourly',
  DAILY = 'daily',
  MONTHLY = 'monthly',
}

export enum ContractStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
}

export enum ParkingAccessType {
  ROTATIVO = 'rotativo',
  MENSALISTA = 'mensalista',
  CONVENIO = 'convenio',
}

export enum ValetTicketStatus {
  RECEIVED = 'received',
  PARKING = 'parking',
  PARKED = 'parked',
  REQUESTED = 'requested',
  RETRIEVING = 'retrieving',
  READY = 'ready',
  DELIVERED = 'delivered',
  CANCELED = 'canceled',
}

export enum ParkingPaymentMethod {
  CASH = 'cash',
  PIX = 'pix',
  CREDIT = 'credit',
  DEBIT = 'debit',
}

export enum ParkingPaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  WAIVED = 'waived',
}

export enum ParkingDeviceType {
  LPR_CAMERA = 'lpr_camera',
  BARRIER = 'barrier',
  TURNSTILE = 'turnstile',
  CONTROLLER = 'controller',
}

export enum ParkingDeviceDirection {
  ENTRY = 'entry',
  EXIT = 'exit',
  BIDIRECTIONAL = 'bidirectional',
}

export enum ParkingAccessEventType {
  PLATE_READ = 'plate_read',
  ENTRY_ALLOWED = 'entry_allowed',
  ENTRY_DENIED = 'entry_denied',
  EXIT_ALLOWED = 'exit_allowed',
  EXIT_DENIED = 'exit_denied',
  GATE_OPEN = 'gate_open',
  GATE_CLOSE = 'gate_close',
  HEARTBEAT = 'heartbeat',
  MANUAL_OVERRIDE = 'manual_override',
}

export enum ParkingGateCommandStatus {
  PENDING = 'pending',
  SENT = 'sent',
  ACKED = 'acked',
  FAILED = 'failed',
}

export enum SubscriptionBillStatus {
  PENDING = 'pending',
  BILLED = 'billed',
  PAID = 'paid',
  CANCELED = 'canceled',
}

export enum SubscriptionBillPaymentMethod {
  PIX = 'pix',
  BOLETO = 'boleto',
}

/** null = todos os tipos de veículo */
export type TariffVehicleScope = VehicleType | null;
