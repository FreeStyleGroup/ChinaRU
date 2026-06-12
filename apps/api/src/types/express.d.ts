import type { UserDto, UserRole } from '@china-ru/shared';

declare global {
  namespace Express {
    interface Request {
      /** Минимальный принципал из access-токена (ставится в requireAuth). */
      auth?: { userId: string; role: UserRole };
      /** Полная карточка пользователя (ставится в requireAuth/optionalAuth). */
      user?: UserDto;
    }
  }
}

export {};
