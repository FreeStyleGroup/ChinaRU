import { Badge, cn, Container } from '@china-ru/ui';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PriceRequestForm } from '@/components/price-request-form';
import { ProductActions } from '@/components/product-actions';
import { ProductGallery } from '@/components/product-gallery';
import { ProductReviews } from '@/components/product-reviews';
import { KeySpecs, ProductSpecs } from '@/components/product-specs';
import { SellerCard } from '@/components/seller-card';
import { Link } from '@/i18n/navigation';
import { ApiError, catalogApi, storeApi } from '@/lib/api';
import { categoryHref, findCategoryPath } from '@/lib/categories';
import { formatPrice } from '@/lib/format';
import { localizedName, pickText } from '@/lib/localize';
import { breadcrumbJsonLd, buildMetadata, productJsonLd } from '@/lib/seo';

import type { CategoryTreeNode, ProductDto, ReviewDto, StoreDto } from '@china-ru/shared';
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

/** Магазин продавца для блока «Продавец». Нет страницы магазина (404) или сбой — блок скрыт. */
async function loadStore(sellerId: string): Promise<StoreDto | null> {
  try {
    return await storeApi.store(sellerId);
  } catch {
    return null;
  }
}

/** Цепочка разделов товара для хлебных крошек; без дерева — без крошек раздела. */
async function loadCategoryTrail(categoryId: string): Promise<CategoryTreeNode[]> {
  try {
    return findCategoryPath(await catalogApi.categories(), categoryId);
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
  const tc = await getTranslations('catalog');

  const product = await loadProduct(slug);
  if (!product) notFound();
  const [reviews, store, trail] = await Promise.all([
    loadReviews(product.id),
    loadStore(product.sellerId),
    loadCategoryTrail(product.categoryId),
  ]);

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
      { name: tc('title'), path: `/${locale}/catalog` },
      ...trail.map(c => ({
        name: localizedName(c, locale),
        path: `/${locale}/catalog?categoryId=${encodeURIComponent(c.id)}`,
      })),
      { name, path },
    ]),
  ];
  const rating = Math.round(Number(product.rating));

  return (
    <Container className="py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label={tc('breadcrumbs')} className="mb-6">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <li>
            <Link href="/catalog" className="hover:text-brand">
              {tc('title')}
            </Link>
          </li>
          {trail.map(c => (
            <li key={c.id} className="flex items-center gap-2">
              <span aria-hidden>›</span>
              <Link href={categoryHref(c.id)} className="hover:text-brand">
                {localizedName(c, locale)}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <ProductGallery images={product.images} name={name} />

        <div className="min-w-0 space-y-6">
          <div className="space-y-2">
            <Badge>
              {t('sku')}: {product.sku}
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{name}</h1>
            {product.reviewCount > 0 && (
              <p className="flex items-center gap-2 text-sm text-muted">
                <span className="text-amber-500" aria-hidden>
                  {'★'.repeat(rating)}
                  <span className="text-line">{'★'.repeat(5 - rating)}</span>
                </span>
                {Number(product.rating).toFixed(1)} ·{' '}
                {t('reviewCount', { count: product.reviewCount })}
              </p>
            )}
          </div>

          {product.price === null ? (
            <div className="space-y-4 rounded-2xl border border-line bg-surface/60 p-5">
              <div>
                <p className="text-2xl font-bold text-ink">{t('priceOnRequest')}</p>
                <p className="mt-1 text-sm text-muted">{t('priceOnRequestHint')}</p>
              </div>
              <PriceRequestForm productId={product.id} />
            </div>
          ) : (
            <>
              <p className="text-3xl font-bold text-brand">
                {formatPrice(product.price, product.currency, locale)}
              </p>
              <ProductActions productId={product.id} />
            </>
          )}

          <KeySpecs specs={product.specs} />

          {store && <SellerCard store={store} locale={locale} />}
        </div>
      </div>

      {(product.specs.length > 0 || description) && (
        <div
          className={cn(
            'mt-12 grid gap-10',
            product.specs.length > 0 && description ? 'lg:grid-cols-2' : 'max-w-4xl'
          )}
        >
          <ProductSpecs specs={product.specs} />
          {description && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-ink">{t('description')}</h2>
              <p className="leading-relaxed whitespace-pre-line text-muted">{description}</p>
            </section>
          )}
        </div>
      )}

      <div className="mt-12">
        <ProductReviews productId={product.id} initial={reviews} />
      </div>
    </Container>
  );
}
