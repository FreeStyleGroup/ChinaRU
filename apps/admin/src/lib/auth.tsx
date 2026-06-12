import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api } from './api';

import type { LoginInput, UserDto } from '@china-ru/shared';

interface AuthContextValue {
  user: UserDto | null;
  isAdmin: boolean;
  isHydrated: boolean;
  login: (input: LoginInput) => Promise<UserDto>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api
      .me()
      .then(me => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        // не залогинен
      })
      .finally(() => {
        if (!cancelled) setIsHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAdmin: user?.role === 'admin',
      isHydrated,
      login: async input => {
        const session = await api.login(input);
        setUser(session.user);
        return session.user;
      },
      logout: async () => {
        try {
          await api.logout();
        } finally {
          setUser(null);
        }
      },
    }),
    [user, isHydrated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
