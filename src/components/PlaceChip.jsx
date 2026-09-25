import { displayPlace, placeKey } from '../lib/format';

export function placeCellClass(name) {
  return `place-cell place-cell--${placeKey(name)}`;
}

export default function PlaceChip({ name }) {
  return <span className={`place-chip place-chip--${placeKey(name)}`}>{displayPlace(name)}</span>;
}
