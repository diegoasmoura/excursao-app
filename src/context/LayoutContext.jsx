import { createContext, useContext, useEffect } from 'react';
import { syncLayoutDataset, useLayoutMode } from '../hooks/useLayoutMode';

const LayoutContext = createContext('mobile');

export function LayoutProvider({ children }) {
  const mode = useLayoutMode();

  useEffect(() => {
    syncLayoutDataset(mode);
  }, [mode]);

  return <LayoutContext.Provider value={mode}>{children}</LayoutContext.Provider>;
}

export function useLayout() {
  return useContext(LayoutContext);
}
