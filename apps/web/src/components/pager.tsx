import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

/** Постраничная навигация ссылками (SSR, без JS): «Назад · Страница N из M · Вперёд». */
export function Pager({
  page,
  totalPages,
  href,
}: {
  page: number;
  totalPages: number;
  href: (page: number) => string;
}) {
  const t = useTranslations('catalog');
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-10 flex items-center justify-center gap-4 text-sm">
      {page > 1 && (
        <Link
          href={href(page - 1)}
          rel="prev"
          className="rounded-lg border border-line px-4 py-2 text-ink hover:bg-surface"
        >
          {t('prev')}
        </Link>
      )}
      <span className="text-muted">{t('page', { page, total: totalPages })}</span>
      {page < totalPages && (
        <Link
          href={href(page + 1)}
          rel="next"
          className="rounded-lg border border-line px-4 py-2 text-ink hover:bg-surface"
        >
          {t('next')}
        </Link>
      )}
    </nav>
  );
}
