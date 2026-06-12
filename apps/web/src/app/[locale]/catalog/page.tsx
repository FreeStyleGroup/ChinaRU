import { PRODUCT_SORTS, type ProductSort } from '@china-ru/shared';
import { Container } from '@china-ru/ui';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { CategoryTreeNode, Paginated, ProductDto } from '@china-ru/shared';
import type { Metadata } from 'next';

import { ProductCard } from '@/components/product-card';
import { Link } from '@/i18n/navigation';
import { catalogApi } from '@/lib/api';
import { localizedName } from '@/lib/localize';
import { buildMetadata } from '@/lib/seo';

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'catalog' });
  return buildMetadata({
    title: t('title'),
    description: t('title'),
    path: `/${locale}/catalog`,
    locale,
  });
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isSort(value: string | undefined): value is ProductSort {
  return value !== undefined && (PRODUCT_SORTS as readonly string[]).includes(value);
}

function buildHref(base: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(base)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/catalog?${qs}` : '/catalog';
}

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations('catalog');

  const sortParam = first(sp.sort);
  const sort: ProductSort = isSort(sortParam) ? sortParam : 'newest';
  const categoryId = first(sp.categoryId);
  const search = first(sp.search);
  const page = Math.max(1, Number(first(sp.page) ?? '1') || 1);

  let result: Paginated<ProductDto> = { items: [], page: 1, pageSize: 12, total: 0, totalPages: 1 };
  let categories: CategoryTreeNode[] = [];
  try {
    [result, categories] = await Promise.all([
      catalogApi.products({
        page,
        pageSize: 12,
        sort,
        status: 'active',
        ...(categoryId ? { categoryId } : {}),
        ...(search ? { search } : {}),
      }),
      catalogApi.categories(),
    ]);
  } catch {
    // API недоступен — показываем пустое состояние.
  }

  const sortOptions: { value: ProductSort; label: string }[] = [
    { value: 'newest', label: t('sortNewest') },
    { value: 'price_asc', label: t('sortPriceAsc') },
    { value: 'price_desc', label: t('sortPriceDesc') },
    { value: 'rating', label: t('sortRating') },
  ];

  return (
    <Container className="py-12">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-ink">{t('title')}</h1>

      {categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href={buildHref({ sort })}
            className={`rounded-full border px-3 py-1 text-sm ${categoryId ? 'border-line text-muted hover:text-ink' : 'border-brand bg-brand/5 text-brand'}`}
          >
            {t('title')}
          </Link>
          {categories.map(c => (
            <Link
              key={c.id}
              href={buildHref({ categoryId: c.id, sort })}
              className={`rounded-full border px-3 py-1 text-sm ${
                categoryId === c.id
                  ? 'border-brand bg-brand/5 text-brand'
                  : 'border-line text-muted hover:text-ink'
              }`}
            >
              {localizedName(c, locale)}
            </Link>
          ))}
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{t('sort')}:</span>
        {sortOptions.map(o => (
          <Link
            key={o.value}
            href={buildHref({
              sort: o.value,
              ...(categoryId ? { categoryId } : {}),
              ...(search ? { search } : {}),
            })}
            className={o.value === sort ? 'font-semibold text-brand' : 'text-muted hover:text-ink'}
          >
            {o.label}
          </Link>
        ))}
      </div>

      {result.items.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {result.items.map(p => (
              <ProductCard key={p.id} product={p} locale={locale} />
            ))}
          </div>

          <div className="mt-10 flex items-center justify-center gap-4 text-sm">
            {page > 1 && (
              <Link
                href={buildHref({ sort, categoryId, search, page: String(page - 1) })}
                className="rounded-lg border border-line px-4 py-2 text-ink hover:bg-surface"
              >
                {t('prev')}
              </Link>
            )}
            <span className="text-muted">
              {t('page', { page: result.page, total: result.totalPages })}
            </span>
            {page < result.totalPages && (
              <Link
                href={buildHref({ sort, categoryId, search, page: String(page + 1) })}
                className="rounded-lg border border-line px-4 py-2 text-ink hover:bg-surface"
              >
                {t('next')}
              </Link>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-line p-16 text-center text-muted">
          {t('empty')}
        </div>
      )}
    </Container>
  );
}
