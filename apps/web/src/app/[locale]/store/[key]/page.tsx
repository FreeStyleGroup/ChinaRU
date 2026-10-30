import { Container } from '@china-ru/ui';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Pager } from '@/components/pager';
import { ProductCard } from '@/components/product-card';
import { StoreLogo, VerifiedMark } from '@/components/store/store-identity';
import { ApiError, catalogApi, storeApi } from '@/lib/api';
import { formatSinceMonth } from '@/lib/format';
import { productGrid } from '@/lib/grid';
import { buildMetadata, storeJsonLd } from '@/lib/seo';
import { storePath } from '@/lib/store';

import type { Paginated, ProductDto, StoreDto } from '@china-ru/shared';
import type { Metadata } from 'next';

type Params = Promise<{ locale: string; key: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PAGE_SIZE = 12;

async function loadStore(key: string): Promise<StoreDto | null> {
  try {
    return await storeApi.store(key);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, key } = await params;
  const store = await loadStore(key);
  if (!store) return { title: 'Not found' };
  const t = await getTranslations({ locale, namespace: 'store' });
  return buildMetadata({
    title: store.companyName,
    description: (store.description ?? t('metaDescription', { name: store.companyName })).slice(
      0,
      200
    ),
    path: `/${locale}${storePath(store)}`,
    locale,
    ...(store.bannerUrl
      ? { images: [store.bannerUrl] }
      : store.logoUrl
        ? { images: [store.logoUrl] }
        : {}),
  });
}

/**
 * Публичная страница магазина: баннер, логотип, название, отметка проверки,
 * рейтинг, «на площадке с …», описание и товары продавца в продаже.
 * Магазин открывается по никнейму, числовому ID или id профиля; каноническая
 * ссылка одна — никнейм, а пока его нет — числовой ID (остальные уводятся на неё).
 */
export default async function StorePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { locale, key } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('store');
  const tp = await getTranslations('product');
  const tc = await getTranslations('catalog');

  const store = await loadStore(key);
  if (!store) notFound();

  // Открыли по id профиля или по числу, а у магазина есть адрес главнее — уводим на него.
  const canonical = storePath(store);
  const canonicalKey = store.nickname ?? String(store.publicId);
  if (key !== canonicalKey && (key === store.id || key === String(store.publicId))) {
    permanentRedirect(`/${locale}${canonical}`);
  }

  const pageParam = (await searchParams).page;
  const page = Math.max(1, Number(Array.isArray(pageParam) ? pageParam[0] : pageParam) || 1);
  let products: Paginated<ProductDto> = {
    items: [],
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  };
  try {
    products = await catalogApi.products({
      sellerId: store.id,
      status: 'active',
      sort: 'newest',
      page,
      pageSize: PAGE_SIZE,
    });
  } catch {
    // Товары не загрузились — шапка магазина всё равно полезна; ниже пустое состояние.
  }

  const since = formatSinceMonth(store.createdAt, locale);
  const showZh = locale === 'zh' && store.companyNameZh;
  const jsonLd = storeJsonLd(store, `/${locale}${canonical}`);

  return (
    <Container className="py-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="overflow-hidden rounded-3xl border border-line bg-white">
        <div className="relative h-36 bg-ink sm:h-auto sm:aspect-[4/1]">
          {store.bannerUrl ? (
            <img
              src={store.bannerUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-brand via-brand-dark to-ink"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.18),transparent_45%)]" />
            </div>
          )}
        </div>

        <div className="px-5 pb-6 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <StoreLogo
              name={store.companyName}
              logoUrl={store.logoUrl}
              alt={t('logoAlt', { name: store.companyName })}
              // relative — чтобы логотип лёг поверх баннера, а не под него.
              className="relative -mt-12 h-24 w-24 shrink-0 rounded-2xl border-4 border-white text-3xl shadow-md sm:-mt-16 sm:h-32 sm:w-32 sm:text-4xl"
            />
            <div className="min-w-0 flex-1 sm:pb-1">
              <h1 className="text-2xl font-bold tracking-tight break-words text-ink sm:text-3xl">
                {store.companyName}
              </h1>
              {showZh && (
                <p lang="zh" className="mt-0.5 text-lg text-muted">
                  {store.companyNameZh}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
                {store.verified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200 ring-inset">
                    <VerifiedMark label={t('verified')} className="h-3.5 w-3.5" />
                    <span aria-hidden>{t('verified')}</span>
                  </span>
                )}
                {store.reviewCount > 0 && (
                  <span>
                    <span className="text-amber-500" aria-hidden>
                      ★
                    </span>{' '}
                    <span className="font-semibold text-ink">
                      {Number(store.rating).toFixed(1)}
                    </span>{' '}
                    · {tp('reviewCount', { count: store.reviewCount })}
                  </span>
                )}
                {since && <span>{t('since', { date: since })}</span>}
                <span>{tc('productCount', { count: store.productCount })}</span>
              </div>
            </div>
          </div>

          {store.description && (
            <section className="mt-6 border-t border-line pt-6">
              <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
                {t('about')}
              </h2>
              <p className="mt-2 max-w-3xl leading-relaxed whitespace-pre-line text-ink">
                {store.description}
              </p>
            </section>
          )}
        </div>
      </header>

      <section className="mt-10">
        <h2 className="mb-5 text-xl font-semibold text-ink">{t('products')}</h2>
        {products.items.length > 0 ? (
          <>
            <div className={productGrid(products.items.length)}>
              {products.items.map(p => (
                <ProductCard key={p.id} product={p} locale={locale} />
              ))}
            </div>
            <Pager
              page={products.page}
              totalPages={products.totalPages}
              href={n => `${canonical}?page=${n}`}
            />
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-line p-12 text-center text-muted">
            {t('empty')}
          </div>
        )}
      </section>
    </Container>
  );
}
