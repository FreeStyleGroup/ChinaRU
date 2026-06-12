import { Badge, Container } from '@china-ru/ui';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { ProductDto } from '@china-ru/shared';
import type { Metadata } from 'next';

import { OrderButton } from '@/components/order-button';
import { ApiError, catalogApi } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { breadcrumbJsonLd, buildMetadata, productJsonLd } from '@/lib/seo';

async function loadProduct(slug: string): Promise<ProductDto | null> {
  try {
    return await catalogApi.product(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return { title: 'Not found' };

  const description = product.descriptionRu ?? `${product.nameRu} — China-RU`;
  return buildMetadata({
    title: product.nameRu,
    description: description.slice(0, 200),
    path: `/${locale}/catalog/${product.slug}`,
    locale,
    images: product.images.map(i => i.url),
  });
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('product');

  const product = await loadProduct(slug);
  if (!product) notFound();

  const path = `/${locale}/catalog/${product.slug}`;
  const jsonLd = [
    productJsonLd(product, path),
    breadcrumbJsonLd([
      { name: 'China-RU', path: `/${locale}` },
      { name: 'Catalog', path: `/${locale}/catalog` },
      { name: product.nameRu, path },
    ]),
  ];
  const image = product.images[0];

  return (
    <Container className="py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-2xl border border-line bg-surface">
          {image ? (
            <img src={image.url} alt={product.nameRu} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl font-bold text-line">
              {product.nameRu.slice(0, 1)}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Badge>
              {t('sku')}: {product.sku}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-ink">{product.nameRu}</h1>
          </div>

          <p className="text-3xl font-bold text-brand">
            {formatPrice(product.price, product.currency, locale)}
          </p>

          <OrderButton productId={product.id} />

          {product.descriptionRu && (
            <div className="space-y-2 border-t border-line pt-6">
              <h2 className="text-lg font-semibold text-ink">{t('description')}</h2>
              <p className="whitespace-pre-line text-muted">{product.descriptionRu}</p>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
