import { useTranslations } from 'next-intl';

import type { ProductSpec } from '@china-ru/shared';

/**
 * Таблица характеристик «название — значение» с чередованием строк.
 * `table-fixed`: длинное значение переносится внутри ячейки, а не распирает
 * таблицу шире экрана телефона.
 */
export function ProductSpecs({ specs }: { specs: ProductSpec[] }) {
  const t = useTranslations('product');
  if (specs.length === 0) return null;

  return (
    <section id="specs" className="scroll-mt-24 space-y-4">
      <h2 className="text-xl font-semibold text-ink">{t('specs')}</h2>
      <div className="overflow-hidden rounded-2xl border border-line">
        {/* hyphens-auto: длинное слово в узкой колонке переносится по слогам (язык — из <html lang>). */}
        <table className="w-full table-fixed text-sm hyphens-auto">
          <tbody>
            {specs.map((s, i) => (
              <tr key={`${i}-${s.name}`} className="odd:bg-surface even:bg-white">
                <th
                  scope="row"
                  className="w-2/5 px-4 py-3 text-left align-top font-normal break-words text-muted sm:w-1/3"
                >
                  {s.name}
                </th>
                <td className="px-4 py-3 align-top break-words whitespace-pre-line text-ink">
                  {s.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Первые характеристики — коротким списком рядом с ценой (полная таблица ниже). */
export function KeySpecs({ specs, limit = 5 }: { specs: ProductSpec[]; limit?: number }) {
  const t = useTranslations('product');
  if (specs.length === 0) return null;

  return (
    <div className="space-y-2">
      <dl className="space-y-1.5 text-sm">
        {specs.slice(0, limit).map((s, i) => (
          <div key={`${i}-${s.name}`} className="flex gap-2">
            <dt className="shrink-0 text-muted">{s.name}:</dt>
            <dd className="min-w-0 break-words text-ink">{s.value}</dd>
          </div>
        ))}
      </dl>
      {specs.length > limit && (
        <a href="#specs" className="inline-block text-sm font-medium text-brand hover:underline">
          {t('allSpecs')} ↓
        </a>
      )}
    </div>
  );
}
