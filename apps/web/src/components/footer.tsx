import { LEGAL_DOCS, OPERATOR } from '@china-ru/shared';
import { Container } from '@china-ru/ui';
import { getTranslations } from 'next-intl/server';

import { SITE_NAME } from '@/lib/seo';

/**
 * Подвал. Правовые документы — на основном сайте оператора: Политика применяется
 * к сервисам, которые на неё ссылаются (п. 1.2), поэтому ссылка здесь обязательна.
 */
export async function Footer() {
  const t = await getTranslations('footer');
  const year = new Date().getFullYear();

  const links = [
    { href: LEGAL_DOCS.privacyPolicy, label: t('privacy') },
    { href: LEGAL_DOCS.pdConsent, label: t('consent') },
    { href: LEGAL_DOCS.cookiePolicy, label: t('cookies') },
    { href: LEGAL_DOCS.company, label: t('company') },
  ];

  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <Container className="flex flex-col gap-4 py-10 text-sm text-muted">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>{t('tagline')}</p>
          <p>
            © {year} {SITE_NAME}. {t('rights')}
          </p>
        </div>
        <nav aria-label={t('legal')} className="flex flex-wrap gap-x-5 gap-y-2">
          {links.map(link => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener"
              className="hover:text-brand"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <p className="text-xs">
          {t('operator')}: {OPERATOR.name}, {t('inn')} {OPERATOR.inn}, {t('ogrn')} {OPERATOR.ogrn}
        </p>
      </Container>
    </footer>
  );
}
