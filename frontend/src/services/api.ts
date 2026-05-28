import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';

/**
 * Produção: proxy expõe `/api` → backend (ex.: https://food.aplopes.com/api).
 * Docker/local: backend direto em :3071, sem prefixo `/api`.
 */
const api: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3071',
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function isPublicAuthFailureRequest(config: InternalAxiosRequestConfig | undefined): boolean {
  const url = config?.url || '';
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/tenants/register')
  );
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Falha esperada no login/registro: não limpar sessão nem dar hard reload
      if (isPublicAuthFailureRequest(error.config)) {
        return Promise.reject(error);
      }

      const authHeader = error.config?.headers?.Authorization;
      const sentToken =
        typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
          ? authHeader.slice(7).trim()
          : null;
      const currentToken = localStorage.getItem('token');

      // Resposta 401 de um pedido antigo (ex.: /auth/me com token inválido) depois que
      // o login já gravou outro token — não apagar a sessão nova.
      if (sentToken && currentToken && sentToken !== currentToken) {
        return Promise.reject(error);
      }

      localStorage.removeItem('token');
      localStorage.removeItem('user');

      const path = window.location.pathname;
      const onPublicEntry =
        path === '/login' || path === '/criar-organizacao' || path.startsWith('/criar-organizacao');

      if (!onPublicEntry) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
