import { DEFAULT_LOCALE, LOCALES } from '@china-ru/shared';
import { defineRouting } from 'next-intl/routing';

/** Маршрутизация локалей. Источник списка локалей — @china-ru/shared. */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
});
