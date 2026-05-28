import type { PaginatedResponse } from '../types/pagination';
import api from './api';

export type ParkingFacility = {
  id: string;
  name: string;
  systemType: string;
  segment: string;
  address: string | null;
  totalSpots: number;
  active: boolean;
  notes: string | null;
};

export type ParkingSpot = {
  id: string;
  facilityId: string;
  code: string;
  floor: string | null;
  zone: string | null;
  status: string;
  active: boolean;
  facility?: ParkingFacility;
};

export type ParkingSession = {
  id: string;
  facilityId: string;
  spotId: string | null;
  plate: string;
  vehicleType: string;
  ticketCode: string;
  driverName: string | null;
  status: string;
  entryAt: string;
  exitAt: string | null;
  notes: string | null;
  tariffId?: string | null;
  amountCharged?: string | null;
  durationMinutes?: number | null;
  facility?: ParkingFacility;
  spot?: ParkingSpot | null;
  tariff?: ParkingTariff | null;
  customer?: { id: string; name: string } | null;
  subscription?: ParkingSubscription | null;
  agreement?: ParkingAgreement | null;
  accessType?: string;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  financeTransactionId?: string | null;
  paidAt?: string | null;
};

export type ParkingTariff = {
  id: string;
  facilityId: string | null;
  name: string;
  billingType: 'hourly' | 'daily' | 'monthly';
  vehicleType: string | null;
  price: string;
  graceMinutes: number;
  blockMinutes: number;
  maxDailyPrice: string | null;
  description: string | null;
  active: boolean;
  isDefault: boolean;
  sortOrder: number;
  facility?: ParkingFacility | null;
};

export type TariffQuote = {
  tariff: ParkingTariff;
  billingType: string;
  durationMinutes: number;
  billableMinutes: number;
  blocks: number;
  amount: number;
  breakdown: string;
};

export type ParkingDashboard = {
  facilityId: string | null;
  facilities: ParkingFacility[];
  summary: {
    totalSpots: number;
    occupied: number;
    available: number;
    reserved: number;
    occupancyRate: number;
    activeSessions: number;
    entriesToday: number;
    exitsToday: number;
  };
  recentSessions: ParkingSession[];
};

export type ParkingMeta = {
  systemTypes: { value: string; label: string }[];
  segments: { value: string; label: string }[];
  vehicleTypes: { value: string; label: string }[];
  spotStatuses: { value: string; label: string }[];
  billingTypes: { value: string; label: string }[];
};

export async function fetchParkingMeta(): Promise<ParkingMeta> {
  const { data } = await api.get<ParkingMeta>('/parking/meta');
  return data;
}

export async function fetchParkingDashboard(facilityId?: string): Promise<ParkingDashboard> {
  const { data } = await api.get<ParkingDashboard>('/parking/dashboard', {
    params: facilityId ? { facilityId } : undefined,
  });
  return data;
}

export async function fetchParkingFacilities(): Promise<ParkingFacility[]> {
  const { data } = await api.get<ParkingFacility[]>('/parking/facilities');
  return data;
}

export async function createParkingFacility(body: {
  name: string;
  systemType: string;
  segment: string;
  address?: string;
  totalSpots?: number;
  notes?: string;
}) {
  const { data } = await api.post<ParkingFacility>('/parking/facilities', body);
  return data;
}

export async function updateParkingFacility(
  id: string,
  body: Partial<{
    name: string;
    systemType: string;
    segment: string;
    address: string;
    active: boolean;
    notes: string;
  }>,
) {
  const { data } = await api.patch<ParkingFacility>(`/parking/facilities/${id}`, body);
  return data;
}

export async function fetchParkingSpots(facilityId?: string): Promise<ParkingSpot[]> {
  const { data } = await api.get<ParkingSpot[]>('/parking/spots', {
    params: facilityId ? { facilityId } : undefined,
  });
  return data;
}

export async function bulkCreateParkingSpots(body: {
  facilityId: string;
  prefix: string;
  count: number;
  floor?: string;
  zone?: string;
}) {
  const { data } = await api.post<{ created: number; spots: ParkingSpot[] }>(
    '/parking/spots/bulk',
    body,
  );
  return data;
}

export async function updateParkingSpotStatus(spotId: string, status: string) {
  const { data } = await api.patch<ParkingSpot>(`/parking/spots/${spotId}/status`, { status });
  return data;
}

export async function fetchParkingSessions(params?: {
  facilityId?: string;
  status?: string;
  plate?: string;
}): Promise<ParkingSession[]> {
  const { data } = await api.get<ParkingSession[]>('/parking/sessions', { params });
  return data;
}

export async function registerParkingEntry(body: {
  facilityId: string;
  plate: string;
  vehicleType?: string;
  spotId?: string;
  driverName?: string;
  notes?: string;
}) {
  const { data } = await api.post<ParkingSession>('/parking/sessions/entry', body);
  return data;
}

export async function registerParkingExit(
  sessionId: string,
  body?: { notes?: string; tariffId?: string },
) {
  const { data } = await api.patch<ParkingSession>(`/parking/sessions/${sessionId}/exit`, body ?? {});
  return data;
}

export async function fetchParkingTariffs(params?: {
  facilityId?: string;
  billingType?: string;
}): Promise<ParkingTariff[]> {
  const { data } = await api.get<ParkingTariff[]>('/parking/tariffs', { params });
  return data;
}

export async function createParkingTariff(body: {
  facilityId?: string;
  name: string;
  billingType: string;
  vehicleType?: string;
  price: number;
  graceMinutes?: number;
  blockMinutes?: number;
  maxDailyPrice?: number;
  description?: string;
  isDefault?: boolean;
  sortOrder?: number;
}) {
  const { data } = await api.post<ParkingTariff>('/parking/tariffs', body);
  return data;
}

export async function updateParkingTariff(
  id: string,
  body: Partial<{
    name: string;
    price: number;
    graceMinutes: number;
    blockMinutes: number;
    maxDailyPrice: number | null;
    description: string;
    active: boolean;
    isDefault: boolean;
    sortOrder: number;
  }>,
) {
  const { data } = await api.patch<ParkingTariff>(`/parking/tariffs/${id}`, body);
  return data;
}

export async function quoteParkingTariff(params: {
  tariffId: string;
  entryAt: string;
  exitAt?: string;
  vehicleType?: string;
}): Promise<TariffQuote> {
  const { data } = await api.get<TariffQuote>('/parking/tariffs/quote', { params });
  return data;
}

export type PlateAccess = {
  plate: string;
  accessType: string;
  customerId: string | null;
  customerName: string | null;
  subscriptionId: string | null;
  agreementId: string | null;
  label: string;
  discountPercent: number | null;
};

export type ContractVehicle = {
  id: string;
  plate: string;
  vehicleType: string;
  holderName?: string | null;
  driverName?: string | null;
  department?: string | null;
  rfidTag?: string | null;
  active: boolean;
};

export type ParkingSubscription = {
  id: string;
  customerId: string;
  facilityId: string;
  tariffId: string | null;
  code: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
  monthlyPrice: string;
  notes: string | null;
  customer?: { id: string; name: string; document?: string | null; phone?: string | null };
  facility?: ParkingFacility;
  tariff?: ParkingTariff | null;
  vehicles?: ContractVehicle[];
};

export type ParkingAgreement = {
  id: string;
  customerId: string;
  facilityId: string | null;
  name: string;
  code: string | null;
  status: string;
  discountPercent: string | null;
  fixedMonthlyFee: string | null;
  vehicleLimit: number | null;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  customer?: { id: string; name: string; document?: string | null };
  facility?: ParkingFacility | null;
  vehicles?: ContractVehicle[];
};

export type CustomerOption = {
  id: string;
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
};

export async function lookupPlateAccess(plate: string, facilityId?: string): Promise<PlateAccess> {
  const { data } = await api.get<PlateAccess>('/parking/access/lookup', {
    params: { plate, facilityId },
  });
  return data;
}

export async function fetchParkingSubscriptions(params?: {
  facilityId?: string;
  status?: string;
  search?: string;
}): Promise<ParkingSubscription[]> {
  const { data } = await api.get<ParkingSubscription[]>('/parking/subscriptions', { params });
  return data;
}

export async function createParkingSubscription(body: {
  customerId: string;
  facilityId: string;
  tariffId?: string;
  code?: string;
  startDate: string;
  endDate?: string;
  monthlyPrice: number;
  notes?: string;
}) {
  const { data } = await api.post<ParkingSubscription>('/parking/subscriptions', body);
  return data;
}

export async function updateParkingSubscription(
  id: string,
  body: Partial<{
    status: string;
    endDate: string | null;
    monthlyPrice: number;
    notes: string;
  }>,
) {
  const { data } = await api.patch<ParkingSubscription>(`/parking/subscriptions/${id}`, body);
  return data;
}

export async function addSubscriptionVehicle(
  subscriptionId: string,
  body: { plate: string; vehicleType?: string; holderName?: string },
) {
  const { data } = await api.post(`/parking/subscriptions/${subscriptionId}/vehicles`, body);
  return data;
}

export async function fetchParkingAgreements(params?: {
  facilityId?: string;
  status?: string;
  search?: string;
}): Promise<ParkingAgreement[]> {
  const { data } = await api.get<ParkingAgreement[]>('/parking/agreements', { params });
  return data;
}

export async function createParkingAgreement(body: {
  customerId: string;
  facilityId?: string;
  name: string;
  code?: string;
  discountPercent?: number;
  fixedMonthlyFee?: number;
  vehicleLimit?: number;
  startDate: string;
  endDate?: string;
  notes?: string;
}) {
  const { data } = await api.post<ParkingAgreement>('/parking/agreements', body);
  return data;
}

export async function updateParkingAgreement(
  id: string,
  body: Partial<{
    status: string;
    discountPercent: number | null;
    fixedMonthlyFee: number | null;
    endDate: string | null;
    notes: string;
  }>,
) {
  const { data } = await api.patch<ParkingAgreement>(`/parking/agreements/${id}`, body);
  return data;
}

export async function addAgreementVehicle(
  agreementId: string,
  body: { plate: string; vehicleType?: string; driverName?: string; department?: string },
) {
  const { data } = await api.post(`/parking/agreements/${agreementId}/vehicles`, body);
  return data;
}

export async function searchCustomers(search: string): Promise<CustomerOption[]> {
  const { data } = await api.get<PaginatedResponse<CustomerOption>>('/customers', {
    params: { search, limit: 20, page: 1 },
  });
  return data.data ?? [];
}

export type ValetUser = { id: string; name: string; email: string; role: string };

export type ValetQueueSummary = {
  facilityId: string | null;
  intake: number;
  parked: number;
  delivery: number;
  totalActive: number;
};

export type ValetTicket = {
  id: string;
  facilityId: string;
  sessionId: string | null;
  ticketCode: string;
  plate: string;
  vehicleType: string;
  customerName: string | null;
  customerPhone: string | null;
  keyTag: string | null;
  status: string;
  assignedValetId: string | null;
  parkedSpotId: string | null;
  parkedLocation: string | null;
  notes: string | null;
  receivedAt: string;
  parkedAt: string | null;
  requestedAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  facility?: ParkingFacility;
  session?: ParkingSession | null;
  assignedValet?: { id: string; name: string } | null;
  parkedSpot?: ParkingSpot | null;
};

export async function fetchValetValets(): Promise<ValetUser[]> {
  const { data } = await api.get<ValetUser[]>('/parking/valet/valets');
  return data;
}

export async function fetchValetQueueSummary(facilityId?: string): Promise<ValetQueueSummary> {
  const { data } = await api.get<ValetQueueSummary>('/parking/valet/queue', {
    params: { facilityId },
  });
  return data;
}

export async function fetchValetTickets(params?: {
  facilityId?: string;
  queue?: string;
  status?: string;
  plate?: string;
}): Promise<ValetTicket[]> {
  const { data } = await api.get<ValetTicket[]>('/parking/valet/tickets', { params });
  return data;
}

export async function receiveValetVehicle(body: {
  facilityId: string;
  plate: string;
  vehicleType?: string;
  customerName?: string;
  customerPhone?: string;
  keyTag?: string;
  notes?: string;
}) {
  const { data } = await api.post<ValetTicket>('/parking/valet/tickets', body);
  return data;
}

export async function startValetParking(ticketId: string, assignedValetId?: string) {
  const { data } = await api.post<ValetTicket>(`/parking/valet/tickets/${ticketId}/park/start`, {
    assignedValetId,
  });
  return data;
}

export async function completeValetParking(
  ticketId: string,
  body: { parkedLocation?: string; parkedSpotId?: string; assignedValetId?: string },
) {
  const { data } = await api.post<ValetTicket>(
    `/parking/valet/tickets/${ticketId}/park/complete`,
    body,
  );
  return data;
}

export async function requestValetRetrieval(ticketId: string) {
  const { data } = await api.post<ValetTicket>(`/parking/valet/tickets/${ticketId}/request`);
  return data;
}

export async function startValetRetrieval(ticketId: string, assignedValetId?: string) {
  const { data } = await api.post<ValetTicket>(
    `/parking/valet/tickets/${ticketId}/retrieve/start`,
    { assignedValetId },
  );
  return data;
}

export async function markValetReady(ticketId: string) {
  const { data } = await api.post<ValetTicket>(`/parking/valet/tickets/${ticketId}/ready`);
  return data;
}

export async function deliverValetVehicle(ticketId: string, body?: { tariffId?: string; notes?: string }) {
  const { data } = await api.post<ValetTicket>(
    `/parking/valet/tickets/${ticketId}/deliver`,
    body ?? {},
  );
  return data;
}

export async function cancelValetTicket(ticketId: string) {
  const { data } = await api.post<ValetTicket>(`/parking/valet/tickets/${ticketId}/cancel`);
  return data;
}

export type SessionExitQuote = {
  amount: number;
  durationMinutes: number;
  tariffId: string | null;
  tariffName: string | null;
  breakdown: string;
  accessType: string;
  waived: boolean;
  discountNote: string | null;
};

export type ParkingCashSummary = {
  facilityId: string | null;
  queueCount: number;
  checkoutsToday: number;
  revenueToday: number;
};

export type ParkingCashQuote = {
  session: ParkingSession;
  quote: SessionExitQuote;
};

export async function fetchParkingCashQueue(facilityId?: string): Promise<ParkingSession[]> {
  const { data } = await api.get<ParkingSession[]>('/parking/cash/queue', {
    params: { facilityId },
  });
  return data;
}

export async function fetchParkingCashSummary(facilityId?: string): Promise<ParkingCashSummary> {
  const { data } = await api.get<ParkingCashSummary>('/parking/cash/summary', {
    params: { facilityId },
  });
  return data;
}

export async function fetchParkingCashQuote(
  sessionId: string,
  tariffId?: string,
): Promise<ParkingCashQuote> {
  const { data } = await api.get<ParkingCashQuote>(`/parking/cash/quote/${sessionId}`, {
    params: { tariffId },
  });
  return data;
}

export async function checkoutParkingSession(
  sessionId: string,
  body: {
    tariffId?: string;
    paymentMethod?: string;
    accountId?: string;
    categoryId?: string;
    sourceId?: string;
    notes?: string;
  },
) {
  const { data } = await api.post<ParkingSession>(`/parking/cash/checkout/${sessionId}`, body);
  return data;
}

export type ParkingTicketInfo = {
  session: ParkingSession;
  ticketCode: string;
  qrPayload: string;
  isActive: boolean;
};

export type OperatorCashSession = {
  open: boolean;
  session: {
    id: string;
    accountId: string;
    openingBalance: string | number;
    openedAt: string;
    account?: { id: string; name: string };
  } | null;
  summary: {
    transactionCount: number;
    parkingIncome: number;
    totalIncome: number;
  } | null;
};

export async function fetchParkingTicket(sessionId: string): Promise<ParkingTicketInfo> {
  const { data } = await api.get<ParkingTicketInfo>(`/parking/cash/ticket/${sessionId}`);
  return data;
}

export async function fetchParkingTicketByCode(ticketCode: string): Promise<ParkingTicketInfo> {
  const { data } = await api.get<ParkingTicketInfo>(
    `/parking/cash/ticket-by-code/${encodeURIComponent(ticketCode)}`,
  );
  return data;
}

export async function fetchParkingCashQuoteByTicket(
  ticketCode: string,
  tariffId?: string,
): Promise<ParkingCashQuote> {
  const { data } = await api.get<ParkingCashQuote>(
    `/parking/cash/quote-by-ticket/${encodeURIComponent(ticketCode)}`,
    { params: { tariffId } },
  );
  return data;
}

export async function checkoutParkingByTicket(body: {
  ticketCode: string;
  tariffId?: string;
  paymentMethod?: string;
  accountId?: string;
  notes?: string;
}) {
  const { data } = await api.post<ParkingSession>('/parking/cash/checkout-by-ticket', body);
  return data;
}

export async function fetchMyParkingCashSession(): Promise<OperatorCashSession> {
  const { data } = await api.get<OperatorCashSession>('/parking/cash/my-session');
  return data;
}

export async function openMyParkingCashSession(body: {
  accountId: string;
  openingBalance?: number;
  facilityId?: string;
  notes?: string;
}) {
  const { data } = await api.post('/parking/cash/my-session/open', body);
  return data;
}

export async function closeMyParkingCashSession(
  sessionId: string,
  body: { countedBalance: number; notes?: string },
) {
  const { data } = await api.post(`/parking/cash/my-session/${sessionId}/close`, body);
  return data;
}

export type ParkingAccessDevice = {
  id: string;
  facilityId: string;
  name: string;
  code: string | null;
  type: string;
  direction: string;
  vendor: string | null;
  ipAddress: string | null;
  autoEntry: boolean;
  autoExitWaived: boolean;
  active: boolean;
  lastSeenAt: string | null;
  facility?: ParkingFacility;
  apiKeyPlain?: string;
};

export type ParkingAccessEvent = {
  id: string;
  deviceId: string;
  facilityId: string;
  eventType: string;
  plate: string | null;
  confidence: string | null;
  allowed: boolean;
  message: string | null;
  sessionId: string | null;
  gateAction: string | null;
  createdAt: string;
  device?: ParkingAccessDevice;
  facility?: ParkingFacility;
};

export type HardwareLprResult = {
  allowed: boolean;
  action: string;
  reason: string;
  eventId: string;
  sessionId: string | null;
  accessType: string | null;
  amountDue: number | null;
  gateCommandId: string | null;
};

export async function fetchParkingDevices(facilityId?: string): Promise<ParkingAccessDevice[]> {
  const { data } = await api.get<ParkingAccessDevice[]>('/parking/hardware/devices', {
    params: { facilityId },
  });
  return data;
}

export async function createParkingDevice(body: {
  facilityId: string;
  name: string;
  code?: string;
  type: string;
  direction: string;
  vendor?: string;
  ipAddress?: string;
  autoEntry?: boolean;
  autoExitWaived?: boolean;
}) {
  const { data } = await api.post<ParkingAccessDevice>('/parking/hardware/devices', body);
  return data;
}

export async function updateParkingDevice(
  id: string,
  body: Partial<{
    name: string;
    code: string;
    type: string;
    direction: string;
    vendor: string;
    ipAddress: string;
    autoEntry: boolean;
    autoExitWaived: boolean;
    active: boolean;
  }>,
) {
  const { data } = await api.patch<ParkingAccessDevice>(`/parking/hardware/devices/${id}`, body);
  return data;
}

export async function regenerateDeviceApiKey(id: string) {
  const { data } = await api.post<ParkingAccessDevice & { apiKeyPlain: string }>(
    `/parking/hardware/devices/${id}/regenerate-key`,
  );
  return data;
}

export async function openGateManually(id: string, body?: { reason?: string; durationMs?: number }) {
  const { data } = await api.post(`/parking/hardware/devices/${id}/open-gate`, body ?? {});
  return data;
}

export async function fetchParkingAccessEvents(params?: {
  facilityId?: string;
  deviceId?: string;
  plate?: string;
}): Promise<ParkingAccessEvent[]> {
  const { data } = await api.get<ParkingAccessEvent[]>('/parking/hardware/events', { params });
  return data;
}

export async function simulateHardwareLpr(body: {
  deviceId: string;
  plate: string;
  confidence?: number;
}): Promise<HardwareLprResult> {
  const { data } = await api.post<HardwareLprResult>('/parking/hardware/simulate/lpr', body);
  return data;
}

// —— Relatórios ——

export type ParkingReportOverview = {
  period: { from: string; to: string; facilityId: string | null };
  summary: {
    entries: number;
    exits: number;
    activeSessions: number;
    paidCheckouts: number;
    waivedCheckouts: number;
    totalRevenue: number;
    rotativoRevenue: number;
    convenioRevenue: number;
    financeRevenue: number;
    avgDurationMinutes: number;
    avgTicket: number;
    occupancyRate: number;
    activeSubscriptions: number;
  };
  byAccessType: { rotativo: number; mensalista: number; convenio: number };
  byPaymentMethod: { method: string; amount: number }[];
};

export type ParkingReportDaily = {
  period: { from: string; to: string; facilityId: string | null };
  daily: { day: string; entries: number; exits: number; revenue: number }[];
};

export type ParkingReportTopPlates = {
  period: { from: string; to: string; facilityId: string | null };
  plates: { plate: string; visits: number; totalMinutes: number; revenue: number }[];
};

export async function fetchParkingReportOverview(params: {
  from: string;
  to: string;
  facilityId?: string;
}): Promise<ParkingReportOverview> {
  const { data } = await api.get<ParkingReportOverview>('/parking/reports/overview', { params });
  return data;
}

export async function fetchParkingReportDaily(params: {
  from: string;
  to: string;
  facilityId?: string;
}): Promise<ParkingReportDaily> {
  const { data } = await api.get<ParkingReportDaily>('/parking/reports/daily', { params });
  return data;
}

export async function fetchParkingReportTopPlates(params: {
  from: string;
  to: string;
  facilityId?: string;
}): Promise<ParkingReportTopPlates> {
  const { data } = await api.get<ParkingReportTopPlates>('/parking/reports/top-plates', { params });
  return data;
}

// —— Veículos ——

export type ParkingVehicleRecord = {
  id: string;
  plate: string;
  vehicleType: string;
  customerId: string | null;
  holderName: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  rfidTag: string | null;
  notes: string | null;
  active: boolean;
  customer?: { id: string; name: string; document?: string | null } | null;
  contracts: Array<{
    type: 'mensalista' | 'convenio';
    id: string;
    label: string;
    status: string;
    facilityName: string | null;
  }>;
  sessionCount: number;
  accessLabel: string;
  recentSessions?: ParkingSession[];
};

export async function fetchParkingVehicles(params?: {
  search?: string;
  active?: boolean;
  customerId?: string;
}): Promise<ParkingVehicleRecord[]> {
  const { data } = await api.get<ParkingVehicleRecord[]>('/parking/vehicles', { params });
  return data;
}

export async function fetchParkingVehicleByPlate(plate: string): Promise<ParkingVehicleRecord> {
  const { data } = await api.get<ParkingVehicleRecord>(`/parking/vehicles/plate/${encodeURIComponent(plate)}`);
  return data;
}

export async function createParkingVehicle(body: {
  plate: string;
  vehicleType?: string;
  customerId?: string;
  holderName?: string;
  brand?: string;
  model?: string;
  color?: string;
  rfidTag?: string;
  notes?: string;
}) {
  const { data } = await api.post<ParkingVehicleRecord>('/parking/vehicles', body);
  return data;
}

export async function updateParkingVehicle(
  id: string,
  body: Partial<{
    vehicleType: string;
    customerId: string | null;
    holderName: string | null;
    brand: string | null;
    model: string | null;
    color: string | null;
    rfidTag: string | null;
    notes: string | null;
    active: boolean;
  }>,
) {
  const { data } = await api.patch<ParkingVehicleRecord>(`/parking/vehicles/${id}`, body);
  return data;
}

// —— Cobrança mensal ——

export type BillingPreview = {
  referenceMonth: string;
  referenceMonthLabel: string;
  summary: {
    eligible: number;
    alreadyBilled: number;
    pending: number;
    totalPending: number;
  };
  items: Array<{
    subscriptionId: string;
    code: string | null;
    customerName: string;
    facilityName: string;
    monthlyPrice: number;
    alreadyBilled: boolean;
    billStatus: string | null;
    financeBillId: string | null;
    billId: string | null;
  }>;
};

export type SubscriptionBill = {
  id: string;
  subscriptionId: string;
  referenceMonth: string;
  referenceMonthLabel: string;
  amount: number;
  dueDate: string;
  status: string;
  financeBillId: string | null;
  financeBillStatus: string | null;
  openAmount: number;
  subscription: {
    id: string;
    code: string | null;
    customerName: string | null;
    facilityName: string | null;
  } | null;
  createdAt: string;
  paymentMethod?: string | null;
  pixCopyPaste?: string | null;
  pixQrCode?: string | null;
  boletoPdfUrl?: string | null;
  boletoBarcode?: string | null;
  pagbankTransactionId?: string | null;
  autoChargeError?: string | null;
  chargedAt?: string | null;
};

export async function fetchBillingPreview(params: {
  referenceMonth: string;
  facilityId?: string;
}): Promise<BillingPreview> {
  const { data } = await api.get<BillingPreview>('/parking/subscriptions/billing/preview', { params });
  return data;
}

export async function generateSubscriptionBilling(body: {
  referenceMonth: string;
  dueDate?: string;
  facilityId?: string;
  subscriptionIds?: string[];
  autoCharge?: boolean;
  paymentMethod?: 'pix' | 'boleto';
}) {
  const { data } = await api.post('/parking/subscriptions/billing/generate', body);
  return data;
}

export async function chargeSubscriptionBill(
  billId: string,
  body: { paymentMethod: 'pix' | 'boleto' },
) {
  const { data } = await api.post<SubscriptionBill>(
    `/parking/subscriptions/billing/${billId}/charge`,
    body,
  );
  return data;
}

export async function fetchSubscriptionBills(params?: {
  referenceMonth?: string;
  subscriptionId?: string;
  facilityId?: string;
  status?: string;
}): Promise<SubscriptionBill[]> {
  const { data } = await api.get<SubscriptionBill[]>('/parking/subscriptions/billing', { params });
  return data;
}

export async function settleSubscriptionBills(body: {
  billIds: string[];
  paymentDate: string;
  accountId: string;
}) {
  const { data } = await api.post('/parking/subscriptions/billing/settle', body);
  return data;
}
