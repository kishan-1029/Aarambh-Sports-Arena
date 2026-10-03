import { createContext, useContext, useState } from 'react';
import AuthModal from './components/AuthModal.jsx';

const AuthDialogContext = createContext({
  openAuth: () => {},
  closeAuth: () => {},
});

export function AuthDialogProvider({ children }) {
  const [config, setConfig] = useState(null);

  const openAuth = (options = {}) => {
    setConfig({
      mode: options.mode || 'login',
      next: options.next || null,
      onSuccess: options.onSuccess || null,
    });
  };

  const closeAuth = () => {
    setConfig(null);
  };

  return (
    <AuthDialogContext.Provider value={{ openAuth, closeAuth }}>
      {children}
      {config && (
        <AuthModal
          mode={config.mode}
          next={config.next}
          onSuccess={config.onSuccess}
          onClose={closeAuth}
        />
      )}
    </AuthDialogContext.Provider>
  );
}

export function useAuthDialog() {
  return useContext(AuthDialogContext);
}
