/** Утилита объединения CSS-классов (clsx-минимализм). React-компоненты добавятся в R4/R5. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter((p): p is string => Boolean(p)).join(' ');
}
