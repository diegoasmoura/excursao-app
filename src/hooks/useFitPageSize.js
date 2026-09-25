import { useEffect, useState } from 'react';
import { useLayout } from '../context/LayoutContext';

function bottomReserve(layout) {
  if (layout === 'desktop') return 16;
  return 72;
}

export function useFitPageSize(element, { min = 4, max = 40, rowHeight = 34, headerHeight = 36, barHeight = 52 } = {}) {
  const layout = useLayout();
  const fallback = layout === 'desktop' ? 20 : layout === 'tablet' ? 12 : 8;
  const [pageSize, setPageSize] = useState(fallback);

  useEffect(() => {
    if (!element) {
      setPageSize(fallback);
      return undefined;
    }

    const measure = () => {
      const top = element.getBoundingClientRect().top;
      const available = window.innerHeight - top - bottomReserve(document.documentElement.dataset.layout) - barHeight;
      const rows = Math.floor((available - headerHeight) / rowHeight);
      setPageSize(Math.min(max, Math.max(min, Number.isFinite(rows) ? rows : fallback)));
    };

    measure();
    const frame = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure, { passive: true });
    window.addEventListener('orientationchange', measure);
    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      observer.disconnect();
    };
  }, [element, min, max, rowHeight, headerHeight, barHeight, fallback]);

  return pageSize;
}
