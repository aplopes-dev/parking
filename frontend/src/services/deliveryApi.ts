import api from './api';

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

export async function fetchCouriers() {
  const { data } = await api.get('/delivery/couriers');
  return data;
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

export async function fetchRoutes() {
  const { data } = await api.get('/delivery/routes');
  return data;
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
