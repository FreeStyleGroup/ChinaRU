'use client';

import { useLocale } from 'next-intl';

import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

/**
 * Короткая подпись — на кнопке, полное название — в подсказке и для экранных
 * читалок. Вид — как переключатель основного сайта china-ru.ru: серая «пилюля»,
 * выбранный язык на белой подложке.
 */
const LANGS: Record<string, { short: string; full: string }> = {
  ru: { short: 'RU', full: 'Русский' },
  en: { short: 'EN', full: 'English' },
  zh: { short: '中', full: '中文' },
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      role="group"
      aria-label="Язык / Language / 语言"
      className="flex items-center rounded-full bg-line p-0.5"
    >
      {routing.locales.map(l => {
        const lang = LANGS[l] ?? { short: l.toUpperCase(), full: l };
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            lang={l}
            title={lang.full}
            aria-label={lang.full}
            aria-pressed={active}
            onClick={() => {
              if (!active) router.replace(pathname, { locale: l });
            }}
            className={
              'h-7 min-w-9 rounded-full px-2.5 text-xs font-bold transition-colors ' +
              (active
                ? 'cursor-default bg-white text-brand shadow-sm'
                : 'text-muted hover:text-ink')
            }
          >
            {lang.short}
          </button>
        );
      })}
    </div>
  );
}
