import api from './api';

export async function fetchProductionOverview() {
  const { data } = await api.get('/production/overview');
  return data;
}

export async function fetchProductionSettings() {
  const { data } = await api.get('/production/settings');
  return data;
}

export async function updateProductionSettings(body: Record<string, unknown>) {
  const { data } = await api.patch('/production/settings', body);
  return data;
}

export async function fetchProductionNotifications() {
  const { data } = await api.get('/production/notifications');
  return data;
}
