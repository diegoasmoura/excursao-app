import { getToken } from './auth';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function request(path, options = {}) {
  try {
    const token = getToken();
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    });
    const data = await res.json().catch(() => null);
    if (res.status === 401 && path !== '/api/login' && path !== '/api/logout') {
      window.dispatchEvent(new Event('auth:expired'));
    }
    if (!res.ok) {
      return { data: null, error: { message: data?.error || res.statusText, status: res.status } };
    }
    return { data, error: null };
  } catch {
    return { data: null, error: { message: 'Não foi possível conectar ao servidor.' } };
  }
}

export const api = {
  login: ({ username, password, remember }) =>
    request('/api/login', { method: 'POST', body: JSON.stringify({ username, password, remember }) }),
  logout: () => request('/api/logout', { method: 'POST', body: '{}' }),
  me: () => request('/api/me'),
  getTrips: () => request('/api/trips'),
  createTrip: (trip) => request('/api/trips', { method: 'POST', body: JSON.stringify(trip) }),
  updateTrip: (id, trip) => request(`/api/trips/${id}`, { method: 'PUT', body: JSON.stringify(trip) }),
  deleteTrip: (id) => request(`/api/trips/${id}`, { method: 'DELETE' }),
  generateWeek: () => request('/api/trips/generate-week', { method: 'POST', body: '{}' }),
  getSchedule: () => request('/api/schedule'),
  saveSchedule: (rules) =>
    request('/api/schedule', { method: 'PUT', body: JSON.stringify({ rules }) }),
  getPeople: () => request('/api/people'),
  getPerson: (id) => request(`/api/people/${id}`),
  createPerson: (person) => request('/api/people', { method: 'POST', body: JSON.stringify(person) }),
  updatePerson: (id, person) =>
    request(`/api/people/${id}`, { method: 'PUT', body: JSON.stringify(person) }),
  deletePerson: (id) => request(`/api/people/${id}`, { method: 'DELETE' }),
  getPassengers: (tripId) => request(`/api/trips/${tripId}/passengers`),
  addPassenger: (tripId, payload) =>
    request(`/api/trips/${tripId}/passengers`, { method: 'POST', body: JSON.stringify(payload) }),
  setPassengerPayment: (id, isPaid) =>
    request(`/api/passengers/${id}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ is_paid: isPaid }),
    }),
  deletePassenger: (id) => request(`/api/passengers/${id}`, { method: 'DELETE' }),
  getWhatsapp: () => request('/api/settings/whatsapp'),
  saveWhatsapp: (phone) =>
    request('/api/settings/whatsapp', { method: 'PUT', body: JSON.stringify({ phone }) }),
};
