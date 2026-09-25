import { useEffect, useState } from 'react';
import { useLayout } from '../context/LayoutContext';

function bottomReserve(layout) {
  if (layout === 'desktop') return 28;
  return 88;
}

export function useFitPageSize(element, { min = 4, max = 24, rowHeight = 40, headerHeight = 38, barHeight = 62 } = {}) {
  const layout = useLayout();
  const fallback = layout === 'desktop' ? 12 : layout === 'tablet' ? 8 : 6;
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
