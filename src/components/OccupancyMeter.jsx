export default function OccupancyMeter({ count, capacity, label }) {
  const taken = Math.max(0, Number(count) || 0);
  const seats = Math.max(0, Number(capacity) || 0);
  const ratio = seats > 0 ? Math.min(1, taken / seats) : 0;
  const percent = Math.round(ratio * 100);
  const almostFull = ratio >= 0.9;

  return (
    <div
      className={`occupancy-meter ${almostFull ? 'is-warn' : ''}`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={seats}
      aria-valuenow={taken}
      aria-label={label || `${taken} de ${seats}`}
    >
      <span className="occupancy-meter__label">
        {taken} / {seats}
      </span>
      <span className="occupancy-meter__track" aria-hidden>
        <span className="occupancy-meter__fill" style={{ width: `${percent}%` }} />
      </span>
    </div>
  );
}
