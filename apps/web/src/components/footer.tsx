import { Container } from '@china-ru/ui';
import { getTranslations } from 'next-intl/server';

import { SITE_NAME } from '@/lib/seo';

export async function Footer() {
  const t = await getTranslations('footer');
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <Container className="flex flex-col gap-2 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>{t('tagline')}</p>
        <p>
          © {year} {SITE_NAME}. {t('rights')}
        </p>
      </Container>
    </footer>
  );
}
