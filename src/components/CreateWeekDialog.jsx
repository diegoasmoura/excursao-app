import { useEffect, useState } from 'react';
import DialogPortal from './DialogPortal';
import { api } from '../lib/api';
import {
  ROUTES,
  WEEKDAYS,
  displayPlace,
  formatTripDateLong,
  routeKey,
  routeLabel,
  tripDateKey,
  weekdayFromISO,
} from '../lib/format';

function todayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DEFAULT_TRIP = {
  origin: 'Uberlândia',
  destination: 'Pirapora',
  capacity: 45,
  trip_date: todayKey(),
};

export default function CreateWeekDialog({ trip, onClose, onCreated, onUpdated }) {
  const isEdit = Boolean(trip);
  const [draft, setDraft] = useState(DEFAULT_TRIP);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const minCapacity = Math.max(1, Number(trip?.passenger_count ?? trip?.passengers?.[0]?.count ?? 1));
  const weekday = weekdayFromISO(draft.trip_date);

  useEffect(() => {
    if (!trip) {
      setDraft({ ...DEFAULT_TRIP, trip_date: todayKey() });
      return;
    }
    setDraft({
      origin: displayPlace(trip.origin),
      destination: displayPlace(trip.destination),
      capacity: Number(trip.capacity) || 45,
      trip_date: tripDateKey(trip.trip_date),
    });
  }, [trip]);

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
    <DialogPortal>
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
            : 'Escolha a data e a rota. Cria só esta viagem; a ida e a volta são viagens separadas.'}
        </p>

        <div className="week-dialog__row">
          <div className="form-group week-dialog__date">
            <label className="form-label">Data</label>
            <input
              className="form-input"
              type="date"
              required
              value={draft.trip_date}
              onChange={(event) => setDraft({ ...draft, trip_date: event.target.value })}
            />
            <span className="week-dialog__weekday">
              {WEEKDAYS[weekday] || formatTripDateLong(draft.trip_date)}
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
                if (next) setDraft({ ...draft, origin: next.origin, destination: next.destination });
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

        {error && (
          <div className="feedback-warning">
            <strong>{error}</strong>
          </div>
        )}

        <div className="confirm-dialog__actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar viagem'}
          </button>
        </div>
      </form>
    </div>
    </DialogPortal>
  );
}
