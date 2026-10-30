import { getTranslations } from 'next-intl/server';

import type { Metadata } from 'next';

/** Заголовки страниц, на которые ведут ссылки из писем. */
export type TokenPageTitle = 'verifyTitle' | 'forgotTitle' | 'resetTitle';

/**
 * Метаданные страниц подтверждения адреса и сброса пароля: в поиск не
 * попадают, а одноразовый токен из адреса страницы не уходит сторонним
 * ресурсам в заголовке Referer.
 */
export async function tokenPageMetadata(
  params: Promise<{ locale: string }>,
  title: TokenPageTitle
): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return {
    title: t(title),
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}
