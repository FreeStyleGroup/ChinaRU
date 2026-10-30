/**
 * Число колонок сетки карточек — от количества карточек, а не от минимальной
 * ширины в пикселях (`auto-fill`): так в последнем ряду не остаются дырки.
 *
 * Правило (то же, что `ts_grid_cols()` на сайтах-клонах):
 *  - карточек не больше `max` — все в один ряд (3 → 3 колонки, 2 → 2);
 *  - иначе выбираем из 4 и 3 колонок: точное деление бьёт любой остаток, иначе
 *    побеждает более полный последний ряд; при равенстве — больше колонок
 *    (ряд шире, страница короче). 12 → 4×3, 9 → 3×3, 7 → 4+3, 5 → 3+2.
 *
 * Двойку в кандидаты не берём специально: на 10 карточках она даёт ноль дырок,
 * но узкую «колбасу» 2×5 во весь экран.
 */
export function gridColumns(count: number, max = 4): number {
  if (count <= max) return Math.max(1, count);
  let best = max;
  let bestScore = -1;
  for (let cols = max; cols >= 3; cols--) {
    const rest = count % cols;
    const score = rest === 0 ? 2 : rest / cols;
    if (score > bestScore) {
      bestScore = score;
      best = cols;
    }
  }
  return best;
}

/*
 * Классы — целыми строками: Tailwind находит утилиты в исходниках по тексту,
 * собранное на лету `lg:grid-cols-${n}` в CSS не попадёт.
 */
const LG_COLS: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
};
const MD_COLS: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
};

/**
 * Сетка плиток разделов: на телефоне 2 колонки, на планшете (md) 2 — для
 * раскладки по 4 — или 3, на десктопе (lg) — по правилу выше. Нечётная последняя
 * плитка там, где колонок две, растягивается на всю строку — дырки нет и там.
 */
export function tileGrid(count: number): { grid: string; item: (index: number) => string } {
  const cols = gridColumns(count);
  const tabletCols = cols === 3 ? 3 : Math.min(cols, 2);
  const grid = [
    'grid gap-4 sm:gap-5',
    count === 1 ? 'grid-cols-1' : 'grid-cols-2',
    MD_COLS[tabletCols],
    LG_COLS[cols],
  ].join(' ');

  const lastIndex = count - 1;
  const oddOnPhone = count > 1 && count % 2 === 1;
  const oddOnTablet = tabletCols === 2 && oddOnPhone;
  const item = (index: number): string => {
    if (index !== lastIndex || !oddOnPhone) return '';
    // Растянута на телефоне; на планшете — только если и там две колонки; на десктопе — нет.
    return oddOnTablet ? 'col-span-2 lg:col-span-1' : 'col-span-2 md:col-span-1';
  };
  return { grid, item };
}

/**
 * Сетка карточек товаров: на телефоне 2 колонки, с планшета — по правилу выше,
 * но не меньше трёх: одна-две карточки товара во всю ширину страницы — это
 * огромные фото, а не витрина.
 */
export function productGrid(count: number): string {
  const cols = Math.max(3, gridColumns(count));
  return ['grid grid-cols-2 gap-4 sm:gap-5', MD_COLS[cols], LG_COLS[cols]].join(' ');
}
