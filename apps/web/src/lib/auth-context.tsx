'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { authClient } from './api-client';

import type { LoginInput, RegisterInput, UserDto } from '@china-ru/shared';

interface AuthContextValue {
  user: UserDto | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  /** Обновить пользователя локально после правок профиля/меню. */
  setUser: (user: UserDto) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void authClient
      .me()
      .then(me => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        // Гость — это не ошибка.
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
      isAuthenticated: user !== null,
      isHydrated,
      login: async input => {
        const session = await authClient.login(input);
        setUser(session.user);
      },
      register: async input => {
        const session = await authClient.register(input);
        setUser(session.user);
      },
      logout: async () => {
        try {
          await authClient.logout();
        } finally {
          setUser(null);
        }
      },
      setUser: (next: UserDto) => {
        setUser(next);
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
