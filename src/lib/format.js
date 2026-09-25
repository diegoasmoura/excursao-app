const PLACE_LABELS = {
  uberlandia: 'Uberlândia',
  pirapora: 'Pirapora',
};

export function trimText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function foldText(value) {
  return (value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function placeKey(name) {
  if (!name) return 'other';
  const key = foldText(name);
  if (key === 'uberlandia' || key === 'pirapora') return key;
  return 'other';
}

export function displayPlace(name) {
  if (!name) return '—';
  const trimmed = name.trim();
  return PLACE_LABELS[placeKey(trimmed)] ?? trimmed;
}

export const ROUTES = [
  { origin: 'Uberlândia', destination: 'Pirapora' },
  { origin: 'Pirapora', destination: 'Uberlândia' },
];

export function routeKey(origin, destination) {
  return `${placeKey(origin)}-${placeKey(destination)}`;
}

export function routeLabel(origin, destination) {
  return `${displayPlace(origin)} → ${displayPlace(destination)}`;
}

function parseTripDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatTripDate(dateStr) {
  const date = parseTripDate(dateStr);
  if (!date) return '—';
  return date.toLocaleDateString('pt-BR');
}

/** Data por extenso, mais fácil de ler (ex.: Quinta-feira, 25 de setembro de 2026). */
export function formatTripDateLong(dateStr) {
  const date = parseTripDate(dateStr);
  if (!date) return '—';
  const text = date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function tripDateKey(dateStr) {
  return dateStr?.split('T')[0] ?? '';
}

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function formatWeekdayShort(dateStr) {
  const index = weekdayFromISO(dateStr);
  return WEEKDAYS_SHORT[index] || '—';
}

export function weekdayFromISO(dateStr) {
  const [y, m, d] = tripDateKey(dateStr).split('-').map(Number);
  if (!y || !m || !d) return 0;
  return new Date(y, m - 1, d).getDay();
}

export function nextDateForWeekday(weekday, from = new Date()) {
  const date = new Date(from);
  date.setHours(0, 0, 0, 0);
  const delta = (Number(weekday) - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + delta);
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

export function isUpcomingTrip(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = tripDateKey(dateStr).split('-').map(Number);
  const tripDay = new Date(y, m - 1, d);
  return tripDay >= today;
}
