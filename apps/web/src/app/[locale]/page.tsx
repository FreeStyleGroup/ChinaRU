import { Button, buttonVariants, Container } from '@china-ru/ui';
import { getTranslations, setRequestLocale } from 'next-intl/server';


import { ProductCard } from '@/components/product-card';
import { Link } from '@/i18n/navigation';
import { catalogApi } from '@/lib/api';
import { buildMetadata, organizationJsonLd } from '@/lib/seo';

import type { ProductDto } from '@china-ru/shared';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });
  return buildMetadata({
    title: t('heroTitle'),
    description: t('heroSubtitle'),
    path: `/${locale}`,
    locale,
  });
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  let products: ProductDto[] = [];
  try {
    const res = await catalogApi.products({ pageSize: 8, sort: 'newest', status: 'active' });
    products = res.items;
  } catch {
    products = [];
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <section className="border-b border-line bg-gradient-to-b from-surface to-white">
        <Container className="grid gap-8 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div className="space-y-6">
            <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              {t('heroTitle')}
            </h1>
            <p className="max-w-xl text-lg text-muted">{t('heroSubtitle')}</p>
            <div className="flex gap-3">
              <Link href="/catalog" className={buttonVariants({ size: 'lg' })}>
                {t('heroCta')}
              </Link>
            </div>
          </div>
          <div className="hidden aspect-[4/3] rounded-2xl bg-gradient-to-br from-brand/10 via-surface to-accent/10 lg:block" />
        </Container>
      </section>

      <Container className="py-16">
        <h2 className="mb-8 text-2xl font-semibold text-ink">{t('featured')}</h2>
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {products.map(p => (
              <ProductCard key={p.id} product={p} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line p-12 text-center text-muted">
            <p>{t('heroSubtitle')}</p>
            <Link href="/catalog" className="mt-4 inline-block">
              <Button variant="outline">{t('heroCta')}</Button>
            </Link>
          </div>
        )}
      </Container>
    </>
  );
}
