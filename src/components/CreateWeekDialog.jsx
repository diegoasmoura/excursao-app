import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  ROUTES,
  WEEKDAYS,
  displayPlace,
  formatTripDateLong,
  nextDateForWeekday,
  routeKey,
  routeLabel,
  tripDateKey,
  weekdayFromISO,
} from '../lib/format';

const DEFAULT_TRIP = {
  origin: 'Uberlândia',
  destination: 'Pirapora',
  capacity: 40,
  weekday: 2,
  trip_date: '',
};

function isSameTrip(trip, date, origin, destination) {
  return (
    tripDateKey(trip.trip_date) === date &&
    displayPlace(trip.origin) === displayPlace(origin) &&
    displayPlace(trip.destination) === displayPlace(destination)
  );
}

function nextFreeDate(weekday, origin, destination, trips, from = new Date()) {
  let cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const date = nextDateForWeekday(weekday, cursor);
    const taken = trips.some((trip) => isSameTrip(trip, date, origin, destination));
    if (!taken) return date;
    cursor = new Date(`${date}T12:00:00`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return nextDateForWeekday(weekday, cursor);
}

function typicalWeekday(origin, destination) {
  return routeKey(origin, destination) === routeKey('Uberlândia', 'Pirapora') ? 2 : 4;
}

function draftFrom(origin, destination, capacity, trips) {
  const weekday = typicalWeekday(origin, destination);
  return {
    origin,
    destination,
    capacity: Number(capacity) || 40,
    weekday,
    trip_date: nextFreeDate(weekday, origin, destination, trips),
  };
}

export default function CreateWeekDialog({ trip, onClose, onCreated, onUpdated }) {
  const isEdit = Boolean(trip);
  const [draft, setDraft] = useState(DEFAULT_TRIP);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const minCapacity = Math.max(1, Number(trip?.passenger_count ?? trip?.passengers?.[0]?.count ?? 1));

  useEffect(() => {
    if (trip) {
      setDraft({
        origin: displayPlace(trip.origin),
        destination: displayPlace(trip.destination),
        capacity: Number(trip.capacity) || 40,
        weekday: weekdayFromISO(trip.trip_date),
        trip_date: tripDateKey(trip.trip_date),
      });
      setLoading(false);
      return;
    }

    Promise.all([api.getSchedule(), api.getTrips()]).then(([schedule, tripList]) => {
      const existing = tripList.data ?? [];
      setTrips(existing);
      if (schedule.error) setError(schedule.error.message);
      const first = schedule.data?.[0];
      const origin = first ? displayPlace(first.origin) : DEFAULT_TRIP.origin;
      const destination = first ? displayPlace(first.destination) : DEFAULT_TRIP.destination;
      setDraft(draftFrom(origin === '—' ? DEFAULT_TRIP.origin : origin, destination === '—' ? DEFAULT_TRIP.destination : destination, first?.capacity, existing));
      setLoading(false);
    });
  }, [trip]);

  const setRoute = (origin, destination) => {
    if (isEdit) {
      setDraft({ ...draft, origin, destination });
      return;
    }
    setDraft(draftFrom(origin, destination, draft.capacity, trips));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      origin: draft.origin,
      destination: draft.destination,
      trip_date: draft.trip_date,
      capacity: draft.capacity,
    };
    const { data, error: saveError } = isEdit
      ? await api.updateTrip(trip.id, payload)
      : await api.createTrip(payload);
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    if (isEdit) onUpdated?.(data);
    else onCreated?.(Array.isArray(data) ? data : [data]);
  };

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <form
        className="confirm-dialog confirm-dialog--wide"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <h2>{isEdit ? 'Alterar viagem' : 'Nova viagem'}</h2>
        <p>
          {isEdit
            ? 'Só esta viagem muda. As outras continuam iguais.'
            : 'Cria só esta viagem. Depois você pode abrir de novo para a ida ou a volta.'}
        </p>

        {loading ? (
          <p>Carregando...</p>
        ) : (
          <div className="week-dialog__row">
            <div className="form-group week-dialog__date">
              <label className="form-label">Data</label>
              <input
                className="form-input"
                type="date"
                required
                value={draft.trip_date}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    trip_date: event.target.value,
                    weekday: weekdayFromISO(event.target.value),
                  })
                }
              />
              <span className="week-dialog__weekday">
                {WEEKDAYS[draft.weekday] || formatTripDateLong(draft.trip_date)}
              </span>
            </div>
            <div className="form-group week-dialog__route">
              <label className="form-label">Rota</label>
              <select
                className="form-input"
                required
                value={routeKey(draft.origin, draft.destination)}
                onChange={(event) => {
                  const next = ROUTES.find((route) => routeKey(route.origin, route.destination) === event.target.value);
                  if (next) setRoute(next.origin, next.destination);
                }}
              >
                {ROUTES.map((route) => (
                  <option key={routeKey(route.origin, route.destination)} value={routeKey(route.origin, route.destination)}>
                    {routeLabel(route.origin, route.destination)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Vagas</label>
              <input
                className="form-input"
                type="number"
                min={isEdit ? minCapacity : 1}
                value={draft.capacity}
                onChange={(event) => setDraft({ ...draft, capacity: Number(event.target.value) })}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="feedback-warning">
            <strong>{error}</strong>
          </div>
        )}

        <div className="confirm-dialog__actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || loading}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar viagem'}
          </button>
        </div>
      </form>
    </div>
  );
}
