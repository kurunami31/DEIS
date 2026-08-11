import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { request } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // The session lives in an httpOnly cookie; a hard refresh rehydrates it
    // from the backend so we never trust browser-stored identity.
    request({ url: '/auth/me' })
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (identifier, password) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = data?.error?.message || (data?.error?.details?.length ? data.error.details[0].message : `Login failed (${res.status})`);
      throw new Error(msg);
    }
    const payload = data?.data ?? data;
    const me = await request({ url: '/auth/me' });
    setUser(me);
    return payload.user ?? me;
  }, []);

  const logout = useCallback(async () => {
    try {
      await request({ method: 'post', url: '/auth/logout' });
    } catch {
      // Even if the server is unreachable, clear the local session state.
    }
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, setUser, login, logout, loading }), [user, login, logout, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}