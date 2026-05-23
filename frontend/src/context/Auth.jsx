import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AuthApi } from '../api/endpoints.js';
import { getToken, setToken, setUnauthorizedHandler } from '../api/client.js';

const AuthCtx = createContext(null);

/**
 * Session state for the desktop app. Loads /api/auth/me on mount if a
 * token is present; otherwise renders the login screen. Provides
 * {@code login}, {@code logout} and {@code refresh} so any page can
 * trigger a session change.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await AuthApi.me();
      setUser(me);
    } catch (err) {
      setUser(null);
      // If the token was rejected the api layer already cleared it; we
      // only surface the message when there *was* a token to begin with.
      if (getToken()) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // On startup: bounce-handler clears token, refresh me when token exists.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    if (getToken()) {
      loadMe();
    } else {
      setLoading(false);
    }
  }, [loadMe]);

  const login = useCallback(async (username, password) => {
    const response = await AuthApi.login({ username, password });
    setToken(response.token);
    setUser(response.user);
    setError(null);
    return response.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    refresh: loadMe,
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth() outside <AuthProvider>');
  return ctx;
}
