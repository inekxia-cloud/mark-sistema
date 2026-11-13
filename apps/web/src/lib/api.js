// Cliente HTTP para la API del backend.
// En Vercel Services usa /api-proxy, que reenvía por binding interno a api.
// En desarrollo local se puede configurar PUBLIC_API_URL (ver .env.example).

const BASE = (import.meta.env.PUBLIC_API_URL || '/api-proxy').replace(/\/$/, '');

export function getToken() {
  return typeof localStorage !== 'undefined' ? localStorage.getItem('sistemaia_token') : null;
}

export function setSession(token, user) {
  localStorage.setItem('sistemaia_token', token);
  localStorage.setItem('sistemaia_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('sistemaia_token');
  localStorage.removeItem('sistemaia_user');
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('sistemaia_user') || 'null');
  } catch {
    return null;
  }
}

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const authApi = {
  register: (payload) => api('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => api('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => api('/auth/me'),
};

export const gastronomyApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString();
    return api(`/gastronomy${qs ? `?${qs}` : ''}`, { auth: false });
  },
  listAll: () => api('/gastronomy/all'),
  create: (payload) => api('/gastronomy', { method: 'POST', body: payload }),
  update: (id, payload) => api(`/gastronomy/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => api(`/gastronomy/${id}`, { method: 'DELETE' }),
};

export const geofenceApi = {
  list: () => api('/geofences', { auth: false }),
  create: (payload) => api('/geofences', { method: 'POST', body: payload }),
  update: (id, payload) => api(`/geofences/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => api(`/geofences/${id}`, { method: 'DELETE' }),
};
