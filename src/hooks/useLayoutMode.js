import { useEffect, useState } from 'react';

export const LAYOUT_BREAKPOINTS = {
  tablet: 600,
  desktop: 900,
};

function getLayoutMode(width = typeof window !== 'undefined' ? window.innerWidth : 0) {
  if (width >= LAYOUT_BREAKPOINTS.desktop) return 'desktop';
  if (width >= LAYOUT_BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

export function useLayoutMode() {
  const [mode, setMode] = useState(() => getLayoutMode());

  useEffect(() => {
    const update = () => setMode(getLayoutMode(window.innerWidth));

    update();
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return mode;
}

export function syncLayoutDataset(mode) {
  document.documentElement.dataset.layout = mode;
}
