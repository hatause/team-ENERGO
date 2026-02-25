import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loginRequest, logoutRequest, meRequest, registerRequest } from '../api/auth-api';
import { setStoredTokens } from './auth-storage';
import type { AuthUser } from '../types';

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    fullName: string;
    locale?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reloadUser = useCallback(async () => {
    try {
      const me = await meRequest();
      setUser(me);
    } catch {
      setUser(null);
      setStoredTokens(null);
    }
  }, []);

  useEffect(() => {
    // Always try restoring session: access token may expire but refresh cookie can re-auth.
    reloadUser().finally(() => setIsLoading(false));
  }, [reloadUser]);

  const login = useCallback(async (email: string, password: string) => {
    await loginRequest({ email, password });
    await reloadUser();
  }, [reloadUser]);

  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      fullName: string;
      locale?: string;
    }) => {
      await registerRequest(payload);
      await reloadUser();
    },
    [reloadUser]
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setStoredTokens(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      register,
      logout
    }),
    [user, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
