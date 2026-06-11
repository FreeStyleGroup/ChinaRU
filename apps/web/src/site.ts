/**
 * @china-ru/web — витрина (Next.js 15 App Router, SSR/ISR, SEO/JSON-LD).
 * Next-приложение разворачивается в фазе R4. Сейчас — общие константы витрины.
 */
import { DEFAULT_LOCALE } from '@china-ru/shared';

import type { Locale } from '@china-ru/shared';

export const SITE_NAME = 'China-RU';

export function resolveLocale(
  input: string | undefined,
  fallback: Locale = DEFAULT_LOCALE
): Locale {
  return input === 'en' || input === 'zh' || input === 'ru' ? input : fallback;
}
