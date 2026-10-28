import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { routing } from '@/i18n/routing';
import { AuthProvider } from '@/lib/auth-context';
import { SITE_NAME, SITE_URL } from '@/lib/seo';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import '../globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: 'China.ru — маркетплейс промышленного оборудования из Китая.',
};

/**
 * Страницы собираются на каждый запрос, а не при сборке образа, поэтому
 * generateStaticParams для языков здесь нет.
 *
 * При `docker build` API недоступен: страницы, собранные заранее (главная,
 * разделы без параметров), запекались пустыми — «Популярные товары» на главной
 * оставались пустыми и после появления товаров. Повторные запросы к API при этом
 * не дорожают: ответы кешируются на уровне fetch (`revalidate` в lib/api.ts).
 */
export const dynamic = 'force-dynamic';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col bg-white text-ink antialiased">
        <NextIntlClientProvider>
          <AuthProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
