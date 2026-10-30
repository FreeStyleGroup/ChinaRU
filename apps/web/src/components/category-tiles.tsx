import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { categoryHref } from '@/lib/categories';
import { tileGrid } from '@/lib/grid';
import { localizedName } from '@/lib/localize';

import type { CategoryTreeNode } from '@china-ru/shared';

/**
 * Плитки разделов каталога: обложка раздела, затемнение снизу для читаемости,
 * название и число товаров. Раздел без обложки — фирменный градиент с буквой.
 * Колонки считаются от числа плиток (lib/grid), без дырок в последнем ряду.
 */
export function CategoryTiles({
  categories,
  locale,
}: {
  categories: CategoryTreeNode[];
  locale: string;
}) {
  const t = useTranslations('catalog');
  const { grid, item } = tileGrid(categories.length);

  return (
    <ul className={grid}>
      {categories.map((c, index) => {
        const name = localizedName(c, locale);
        return (
          <li key={c.id} className={item(index)}>
            <Link
              href={categoryHref(c.id)}
              className="group relative flex h-44 overflow-hidden rounded-2xl bg-ink shadow-sm transition-shadow hover:shadow-lg focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none sm:h-52 lg:h-60"
            >
              {c.imageUrl ? (
                <img
                  src={c.imageUrl}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-br from-brand via-brand-dark to-ink"
                >
                  <span className="absolute -top-4 -right-1 text-[8rem] leading-none font-bold text-white/10 sm:text-[10rem]">
                    {Array.from(name)[0]}
                  </span>
                </div>
              )}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"
              />
              {/* Длинное одно слово («Электродвигатели») на телефоне переносится, а не обрезается. */}
              <div className="relative mt-auto w-full p-3.5 sm:p-5">
                <h2 className="line-clamp-2 text-[15px] leading-snug font-semibold break-words hyphens-auto text-white sm:text-lg">
                  {name}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-white/80">
                  {t('productCount', { count: c.productCount })}
                  <span
                    aria-hidden
                    className="translate-x-0 transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
