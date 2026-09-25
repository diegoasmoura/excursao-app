export default function SortableTh({ column, sort, onSort, children }) {
  const active = sort.key === column;
  return (
    <th
      className="is-sortable"
      onClick={() => onSort(column)}
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {children}
      <span className={`grid-table__sort ${active ? 'is-on' : ''}`} aria-hidden>
        {active && sort.dir === 'desc' ? '▼' : '▲'}
      </span>
    </th>
  );
}

export function nextSort(current, key) {
  if (current.key === key) {
    return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  }
  return { key, dir: 'asc' };
}

export function compareText(a, b, dir) {
  return String(a || '').localeCompare(String(b || ''), 'pt-BR', { sensitivity: 'base' }) * (dir === 'asc' ? 1 : -1);
}

export function compareNumber(a, b, dir) {
  return (Number(a) - Number(b)) * (dir === 'asc' ? 1 : -1);
}
