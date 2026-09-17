const BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('srs_token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const timeout = options.timeout || 12000;
  const controller = timeout > 0 ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;
  const res = await fetch(`${BASE}${path}`, { ...options, headers, signal: controller?.signal }).finally(() => clearTimeout(timer));
  if (res.status === 401) {
    localStorage.removeItem('srs_token');
    localStorage.removeItem('srs_user');
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Sesión expirada');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),
  summary: () => request('/dashboard/summary'),
  fatigue: (hours = 24) => request(`/dashboard/fatigue?hours=${hours}`),
  recentAlerts: () => request('/dashboard/recent-alerts'),
  heatmap: () => request('/dashboard/heatmap'),

  vehicles: () => request('/vehicles'),
  vehicle: (id) => request(`/vehicles/${id}`),
  patchVehicle: (id, body) => request(`/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  drivers: () => request('/drivers'),
  driver: (id) => request(`/drivers/${id}`),

  events: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString();
    return request(`/events${qs ? `?${qs}` : ''}`);
  },
  ackEvent: (id, atendidoPor) => request(`/events/${id}/ack`, { method: 'POST', body: JSON.stringify({ atendido_por: atendidoPor }) }),

  alerts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/alerts${qs ? `?${qs}` : ''}`);
  },
  activeAlerts: () => request('/alerts/active'),
  alertAction: (id, accion, meta) =>
    request(`/alerts/${id}/actions`, { method: 'POST', body: JSON.stringify({ accion, meta }) }),

  safeZonesNear: (lat, lng) => request(`/safe-zones/near/${lat}/${lng}`),

  config: () => request('/config'),
  updateConfig: (body) => request('/config', { method: 'PUT', body: JSON.stringify(body) }),

  testDrowsiness: (nivel, descripcion) =>
    request('/telemetry/drowsiness-test', { method: 'POST', body: JSON.stringify({ nivel, descripcion }) })
};

export function sseUrl() {
  return `${BASE}/live/stream`;
}