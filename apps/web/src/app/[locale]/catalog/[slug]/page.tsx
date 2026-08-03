import { Badge, Container } from '@china-ru/ui';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';


import { AddToCart } from '@/components/add-to-cart';
import { OrderButton } from '@/components/order-button';
import { ProductReviews } from '@/components/product-reviews';
import { ApiError, catalogApi } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { localizedName, pickText } from '@/lib/localize';
import { breadcrumbJsonLd, buildMetadata, productJsonLd } from '@/lib/seo';

import type { ProductDto, ReviewDto } from '@china-ru/shared';
import type { Metadata } from 'next';

async function loadProduct(slug: string): Promise<ProductDto | null> {
  try {
    return await catalogApi.product(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

async function loadReviews(productId: string): Promise<ReviewDto[]> {
  try {
    return await catalogApi.reviews(productId);
  } catch {
    return [];
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

  const name = localizedName(product, locale);
  const localizedDesc = pickText(
    locale,
    product.descriptionRu,
    product.descriptionEn,
    product.descriptionZh
  );
  return buildMetadata({
    title: name,
    description: (localizedDesc ?? `${name} — China.ru`).slice(0, 200),
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
  const reviews = await loadReviews(product.id);

  const name = localizedName(product, locale);
  const description = pickText(
    locale,
    product.descriptionRu,
    product.descriptionEn,
    product.descriptionZh
  );
  const path = `/${locale}/catalog/${product.slug}`;
  const jsonLd = [
    productJsonLd(product, path, { name, description }),
    breadcrumbJsonLd([
      { name: 'China.ru', path: `/${locale}` },
      { name: 'Catalog', path: `/${locale}/catalog` },
      { name, path },
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
            <img src={image.url} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl font-bold text-line">
              {name.slice(0, 1)}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Badge>
              {t('sku')}: {product.sku}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-ink">{name}</h1>
            {product.reviewCount > 0 && (
              <p className="flex items-center gap-2 text-sm text-muted">
                <span className="text-amber-500" aria-hidden>
                  {'★'.repeat(Math.round(Number(product.rating)))}
                  <span className="text-line">
                    {'★'.repeat(5 - Math.round(Number(product.rating)))}
                  </span>
                </span>
                {Number(product.rating).toFixed(1)} · {product.reviewCount} отзыв(ов)
              </p>
            )}
          </div>

          <p className="text-3xl font-bold text-brand">
            {formatPrice(product.price, product.currency, locale)}
          </p>

          <div className="flex flex-wrap items-start gap-3">
            <AddToCart productId={product.id} />
            <OrderButton productId={product.id} />
          </div>

          {description && (
            <div className="space-y-2 border-t border-line pt-6">
              <h2 className="text-lg font-semibold text-ink">{t('description')}</h2>
              <p className="whitespace-pre-line text-muted">{description}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12">
        <ProductReviews productId={product.id} initial={reviews} />
      </div>
    </Container>
  );
}
