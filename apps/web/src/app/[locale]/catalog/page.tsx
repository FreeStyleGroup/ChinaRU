import { PRODUCT_SORTS, type ProductSort } from '@china-ru/shared';
import { Container } from '@china-ru/ui';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { CategoryTiles } from '@/components/category-tiles';
import { Pager } from '@/components/pager';
import { ProductCard } from '@/components/product-card';
import { Link } from '@/i18n/navigation';
import { catalogApi } from '@/lib/api';
import { categoryHref, findCategoryPath } from '@/lib/categories';
import { productGrid } from '@/lib/grid';
import { localizedName, pickText } from '@/lib/localize';
import { breadcrumbJsonLd, buildMetadata } from '@/lib/seo';

import type { CategoryTreeNode, Paginated, ProductDto } from '@china-ru/shared';
import type { Metadata } from 'next';

type SearchParams = Record<string, string | string[] | undefined>;

const PAGE_SIZE = 12;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isSort(value: string | undefined): value is ProductSort {
  return value !== undefined && (PRODUCT_SORTS as readonly string[]).includes(value);
}

/** Дерево разделов; недоступный API — пустое дерево (страница покажет пустое состояние). */
async function loadCategories(): Promise<CategoryTreeNode[]> {
  try {
    return await catalogApi.categories();
  } catch {
    return [];
  }
}

function categoryDescription(c: CategoryTreeNode, locale: string): string | null {
  return pickText(locale, c.descriptionRu, c.descriptionEn, c.descriptionZh);
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const categoryId = first((await searchParams).categoryId);
  const t = await getTranslations({ locale, namespace: 'catalog' });

  // Страница раздела — своя каноническая ссылка, иначе все разделы склеятся с корнем каталога.
  const category = categoryId
    ? findCategoryPath(await loadCategories(), categoryId).at(-1)
    : undefined;
  if (category) {
    const name = localizedName(category, locale);
    return buildMetadata({
      title: name,
      description: (
        categoryDescription(category, locale) ?? t('categoryMetaDescription', { name })
      ).slice(0, 200),
      path: `/${locale}/catalog?categoryId=${encodeURIComponent(category.id)}`,
      locale,
      ...(category.imageUrl ? { images: [category.imageUrl] } : {}),
    });
  }
  return buildMetadata({
    title: t('title'),
    description: t('metaDescription'),
    path: `/${locale}/catalog`,
    locale,
  });
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

  const categories = await loadCategories();
  const trail = categoryId ? findCategoryPath(categories, categoryId) : [];
  const category = trail.at(-1);
  // Раздела нет в загруженном дереве — такой страницы нет. Дерево не загрузилось — не 404.
  if (categoryId && categories.length > 0 && !category) notFound();

  // Корень каталога — витрина разделов; товары — внутри раздела и в поиске.
  if (!categoryId && !search && categories.length > 0) {
    return (
      <Container className="py-12">
        <h1 className="text-3xl font-bold tracking-tight text-ink">{t('title')}</h1>
        <p className="mt-2 mb-8 max-w-2xl text-muted">{t('lead')}</p>
        <CategoryTiles categories={categories} locale={locale} />
      </Container>
    );
  }

  let result: Paginated<ProductDto> = {
    items: [],
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  };
  try {
    result = await catalogApi.products({
      page,
      pageSize: PAGE_SIZE,
      sort,
      status: 'active',
      ...(categoryId ? { categoryId } : {}),
      ...(search ? { search } : {}),
    });
  } catch {
    // API недоступен — показываем пустое состояние.
  }

  const sortOptions: { value: ProductSort; label: string }[] = [
    { value: 'newest', label: t('sortNewest') },
    { value: 'price_asc', label: t('sortPriceAsc') },
    { value: 'price_desc', label: t('sortPriceDesc') },
    { value: 'rating', label: t('sortRating') },
  ];
  const listHref = (extra: Record<string, string | undefined>): string =>
    categoryHref(categoryId, { search, ...extra });

  const jsonLd = category
    ? breadcrumbJsonLd([
        { name: t('title'), path: `/${locale}/catalog` },
        ...trail.map(c => ({
          name: localizedName(c, locale),
          path: `/${locale}/catalog?categoryId=${encodeURIComponent(c.id)}`,
        })),
      ])
    : null;

  return (
    <Container className="py-12">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {category ? (
        <CategoryHeader category={category} trail={trail} locale={locale} />
      ) : (
        <h1 className="mb-6 text-3xl font-bold tracking-tight text-ink">{t('title')}</h1>
      )}

      <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <span className="text-muted">{t('sort')}:</span>
        {sortOptions.map(o => (
          <Link
            key={o.value}
            href={listHref({ sort: o.value })}
            className={o.value === sort ? 'font-semibold text-brand' : 'text-muted hover:text-ink'}
          >
            {o.label}
          </Link>
        ))}
      </div>

      {result.items.length > 0 ? (
        <>
          <div className={productGrid(result.items.length)}>
            {result.items.map(p => (
              <ProductCard key={p.id} product={p} locale={locale} />
            ))}
          </div>
          <Pager
            page={result.page}
            totalPages={result.totalPages}
            href={n => listHref({ sort, page: String(n) })}
          />
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-line p-16 text-center text-muted">
          <p>{category ? t('categoryEmpty') : t('empty')}</p>
          {category && (
            <Link
              href="/catalog"
              className="mt-3 inline-block font-medium text-brand hover:underline"
            >
              {t('allSections')}
            </Link>
          )}
        </div>
      )}
    </Container>
  );
}

/**
 * Шапка раздела: «Все разделы › родитель › раздел», обложка с затемнением,
 * название, число товаров, описание; ниже — подразделы.
 */
async function CategoryHeader({
  category,
  trail,
  locale,
}: {
  category: CategoryTreeNode;
  trail: CategoryTreeNode[];
  locale: string;
}) {
  const t = await getTranslations('catalog');
  const name = localizedName(category, locale);
  const description = categoryDescription(category, locale);

  return (
    <>
      <nav aria-label={t('breadcrumbs')} className="mb-4">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <li>
            <Link href="/catalog" className="inline-flex items-center gap-1.5 hover:text-brand">
              <span aria-hidden>←</span> {t('allSections')}
            </Link>
          </li>
          {trail.slice(0, -1).map(c => (
            <li key={c.id} className="flex items-center gap-2">
              <span aria-hidden>›</span>
              <Link href={categoryHref(c.id)} className="hover:text-brand">
                {localizedName(c, locale)}
              </Link>
            </li>
          ))}
          <li className="flex items-center gap-2">
            <span aria-hidden>›</span>
            <span aria-current="page" className="text-ink">
              {name}
            </span>
          </li>
        </ol>
      </nav>

      <section className="relative mb-6 overflow-hidden rounded-3xl bg-ink">
        {category.imageUrl ? (
          <img
            src={category.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-brand via-brand-dark to-ink"
          />
        )}
        {/* Затемнение: на телефоне — ровное (текст во всю ширину), шире — слева, где текст. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-black/60 sm:bg-transparent sm:bg-gradient-to-r sm:from-black/80 sm:via-black/50 sm:to-black/5"
        />
        <div className="relative max-w-2xl px-6 py-10 sm:px-10 sm:py-14">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{name}</h1>
          <p className="mt-2 text-sm font-medium text-white/80">
            {t('productCount', { count: category.productCount })}
          </p>
          {description && (
            <p className="mt-4 leading-relaxed whitespace-pre-line text-white/90">{description}</p>
          )}
        </div>
      </section>

      {category.children.length > 0 && (
        <section aria-label={t('subsections')} className="mb-6">
          <ul className="flex flex-wrap gap-2">
            {category.children.map(c => (
              <li key={c.id}>
                <Link
                  href={categoryHref(c.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm text-ink transition-colors hover:border-brand hover:text-brand"
                >
                  {localizedName(c, locale)}
                  <span className="text-xs text-muted">{c.productCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
