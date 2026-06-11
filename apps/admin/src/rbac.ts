/**
 * @china-ru/admin — админ-панель (React 19 + Vite SPA, RBAC).
 * SPA и страницы реализуются в фазе R5. Сейчас — модель ролей и проверка доступа.
 */
export const ADMIN_ROLES = ['admin', 'moderator'] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export function canModerate(role: AdminRole): boolean {
  return role === 'admin' || role === 'moderator';
}
