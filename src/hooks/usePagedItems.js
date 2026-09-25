import { useEffect, useMemo, useState } from 'react';

export function usePagedItems(items, pageSize, resetKey = '') {
  const [page, setPage] = useState(0);
  const total = items.length;
  const size = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(total / size) || 1);

  useEffect(() => {
    setPage(0);
  }, [resetKey, size]);

  const current = Math.min(page, pageCount - 1);

  useEffect(() => {
    if (page !== current) setPage(current);
  }, [page, current]);

  const slice = useMemo(() => {
    const start = current * size;
    return items.slice(start, start + size);
  }, [items, current, size]);

  return {
    page: current,
    setPage,
    pageCount,
    pageSize: size,
    slice,
    total,
    from: total === 0 ? 0 : current * size + 1,
    to: current * size + slice.length,
  };
}
