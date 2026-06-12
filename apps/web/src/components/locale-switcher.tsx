'use client';

import { useLocale } from 'next-intl';

import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

const LABELS: Record<string, string> = { ru: 'RU', en: 'EN', zh: '中文' };

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {routing.locales.map(l => (
        <button
          key={l}
          type="button"
          onClick={() => {
            router.replace(pathname, { locale: l });
          }}
          className={l === locale ? 'font-semibold text-brand' : 'text-muted hover:text-ink'}
        >
          {LABELS[l] ?? l}
        </button>
      ))}
    </div>
  );
}
