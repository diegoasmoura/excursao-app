import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    const message = typeof options === 'string' ? options : options?.message;
    const extra = typeof options === 'string' ? {} : options ?? {};
    return new Promise((resolve) => {
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setDialog({
        title: extra.title || 'Confirmar',
        message,
        confirmLabel: extra.confirmLabel || 'Confirmar',
        cancelLabel: extra.cancelLabel || 'Cancelar',
        danger: extra.danger !== false,
      });
    });
  }, []);

  const close = useCallback((ok) => {
    resolverRef.current?.(ok);
    resolverRef.current = null;
    setDialog(null);
  }, []);

  useEffect(() => {
    if (!dialog) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="confirm-overlay" onClick={() => close(false)}>
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="confirm-title">{dialog.title}</h2>
            <p id="confirm-message">{dialog.message}</p>
            <div className="confirm-dialog__actions">
              <button type="button" className="btn btn-secondary" onClick={() => close(false)}>
                {dialog.cancelLabel}
              </button>
              <button
                type="button"
                className={`btn ${dialog.danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => close(true)}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error('useConfirm precisa do ConfirmProvider');
  }
  return confirm;
}
