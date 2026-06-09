import api from './api';
import { DEFAULT_PAGE_SIZE, type PaginatedMeta, type PaginatedResponse } from '../types/pagination';
import { normalizePaginatedResponse } from '../utils/paginatedResponse';

export type DeliveryListParams = { page?: number; limit?: number };
export type DeliveryListResult<T> = { items: T[]; meta: PaginatedMeta };

async function fetchDeliveryList<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<DeliveryListResult<T>> {
  const page = Number(params?.page ?? 1);
  const limit = Number(params?.limit ?? DEFAULT_PAGE_SIZE);
  const { data } = await api.get<PaginatedResponse<T> | T[]>(url, { params });
  const normalized = normalizePaginatedResponse(data, { page, limit });
  return { items: normalized.items, meta: normalized.meta };
}

export async function fetchDeliveryOverview() {
  const { data } = await api.get('/delivery/overview');
  return data;
}

export async function fetchDeliveryOrders(params?: { openOnly?: boolean; assignmentStatus?: string }) {
  const { data } = await api.get('/delivery/orders', { params });
  return data;
}

export async function assignDeliveryOrder(orderId: string, body: { courierId: string; routeId?: string; notes?: string }) {
  const { data } = await api.post(`/delivery/orders/${orderId}/assign`, body);
  return data;
}

export async function updateDeliveryAssignmentStatus(
  orderId: string,
  body: { status: string; notes?: string },
) {
  const { data } = await api.patch(`/delivery/orders/${orderId}/status`, body);
  return data;
}

export async function fetchCouriers(params?: DeliveryListParams) {
  return fetchDeliveryList<any>('/delivery/couriers', params);
}

export async function fetchAllCouriers() {
  const { items } = await fetchCouriers({ page: 1, limit: 100 });
  return items;
}

export async function createCourier(body: Record<string, unknown>) {
  const { data } = await api.post('/delivery/couriers', body);
  return data;
}

export async function updateCourier(id: string, body: Record<string, unknown>) {
  const { data } = await api.patch(`/delivery/couriers/${id}`, body);
  return data;
}

export async function deleteCourier(id: string) {
  await api.delete(`/delivery/couriers/${id}`);
}

export async function fetchRoutes(params?: DeliveryListParams) {
  return fetchDeliveryList<any>('/delivery/routes', params);
}

export async function fetchAllRoutes() {
  const { items } = await fetchRoutes({ page: 1, limit: 100 });
  return items;
}

export async function createRoute(body: Record<string, unknown>) {
  const { data } = await api.post('/delivery/routes', body);
  return data;
}

export async function updateRoute(id: string, body: Record<string, unknown>) {
  const { data } = await api.patch(`/delivery/routes/${id}`, body);
  return data;
}

export async function deleteRoute(id: string) {
  await api.delete(`/delivery/routes/${id}`);
}
