/** SQLSTATE нарушения уникальности в PostgreSQL. */
const UNIQUE_VIOLATION = '23505';

/**
 * Ошибка — нарушение уникального индекса (при `constraint` — именно этого).
 *
 * Drizzle заворачивает ошибку драйвера в `cause`, а поля у драйверов разные:
 * postgres.js (прод) отдаёт `code` и `constraint_name`, PGlite (тесты) — `code`
 * и `constraint`. Поэтому проходим по цепочке `cause` и смотрим оба поля.
 */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth++) {
    const e = current as {
      code?: unknown;
      constraint?: unknown;
      constraint_name?: unknown;
      cause?: unknown;
    };
    if (e.code === UNIQUE_VIOLATION) {
      if (!constraint) return true;
      return e.constraint === constraint || e.constraint_name === constraint;
    }
    current = e.cause;
  }
  return false;
}
