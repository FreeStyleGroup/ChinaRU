'use client';

import { createContext, useContext } from 'react';

import type { SellerProfileDto } from '@china-ru/shared';

export interface SellerContextValue {
  /** Профиль продавца текущего пользователя или null (заявки не было). */
  profile: SellerProfileDto | null;
  /** Загружается ли статус продавца. */
  loading: boolean;
  /** Обновить профиль в общем состоянии (после подачи заявки / смены никнейма). */
  setProfile: (profile: SellerProfileDto | null) => void;
}

export const SellerContext = createContext<SellerContextValue | null>(null);

export function useSellerProfile(): SellerContextValue {
  const ctx = useContext(SellerContext);
  if (!ctx) throw new Error('useSellerProfile must be used within cabinet layout');
  return ctx;
}

/** true, если магазин подтверждён модератором (показывать «Мой магазин», синюю галочку). */
export function isStoreVerified(profile: SellerProfileDto | null): boolean {
  return profile?.verifyStatus === 'verified';
}
