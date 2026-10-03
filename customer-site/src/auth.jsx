import { createContext, useContext, useEffect, useState } from 'react';
import { api, setAuthToken, clearAuthToken, hasAuthToken } from './api';
import { withMembershipFlag } from './sessionUser';

function adoptUser(data) {
  const raw = data?.user || data?.profile || data;
  return withMembershipFlag(raw) || raw || null;
}

const AuthContext = createContext({
  user: null,
  ready: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  setUser: () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasAuthToken()) {
      setReady(true);
      return;
    }
    api.me()
      .then((data) => {
        setUser(adoptUser(data));
      })
      .catch(() => {
        clearAuthToken();
        setUser(null);
      })
      .finally(() => {
        setReady(true);
      });
  }, []);

  const login = async ({ email, password }) => {
    const data = await api.login({ email, password });
    if (data.token) {
      setAuthToken(data.token);
    }
    const profile = adoptUser(data);
    setUser(profile);
    return profile;
  };

  const register = async (payload) => {
    const data = await api.register(payload);
    if (data.token) {
      setAuthToken(data.token);
    }
    const profile = adoptUser(data);
    setUser(profile);
    return profile;
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
