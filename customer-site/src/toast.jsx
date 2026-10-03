import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext({
  show: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((all) => all.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message, type = 'info', timeout = 3500) => {
    if (!message) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((all) => [...all.slice(-4), { id, message, type }]);
    if (timeout > 0) {
      window.setTimeout(() => dismiss(id), timeout);
    }
  }, [dismiss]);

  const success = useCallback((msg, timeout) => show(msg, 'success', timeout), [show]);
  const error = useCallback((msg, timeout) => show(msg, 'error', timeout), [show]);
  const info = useCallback((msg, timeout) => show(msg, 'info', timeout), [show]);

  const value = useMemo(() => ({ show, success, error, info, dismiss }), [show, success, error, info, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" role="region" aria-label="Notifications">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span>{t.message}</span>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
