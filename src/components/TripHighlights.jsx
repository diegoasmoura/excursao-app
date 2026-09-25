import { displayPlace, formatTripDate, formatTripDateLong } from '../lib/format';
import PlaceChip from './PlaceChip';

export default function TripHighlights({ origin, destination, tripDate, size = 'md' }) {
  const dateLabel = formatTripDate(tripDate);
  const dateTitle = formatTripDateLong(tripDate);
  const from = displayPlace(origin);
  const to = displayPlace(destination);

  return (
    <p
      className={`trip-route-compact trip-route-compact--${size}`}
      title={`${dateTitle} — ${from} para ${to}`}
      aria-label={`${dateLabel}, de ${from} para ${to}`}
    >
      <span className="trip-route-compact__date">{dateLabel}</span>
      <span className="trip-route-compact__sep" aria-hidden>
        ·
      </span>
      <PlaceChip name={origin} />
      <span className="trip-route-compact__arrow" aria-hidden>
        →
      </span>
      <PlaceChip name={destination} />
    </p>
  );
}
