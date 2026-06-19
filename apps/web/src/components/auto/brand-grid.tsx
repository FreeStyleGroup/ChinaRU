import { Link } from '@/i18n/navigation';

import type { VehicleBrandDto } from '@china-ru/shared';

/** Сетка марок (как «Популярные марки» на боевом /auto/). */
export function BrandGrid({ brands }: { brands: VehicleBrandDto[] }) {
  if (brands.length === 0) {
    return <p className="text-sm text-muted">Марки появятся здесь.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {brands.map(b => (
        <Link
          key={b.id}
          href={`/catalog?search=${encodeURIComponent(b.name)}`}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-white p-4 text-center transition-colors hover:border-brand"
        >
          {b.logoUrl ? (
            <img src={b.logoUrl} alt={b.name} className="h-10 object-contain" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-base font-bold text-brand">
              {b.name.slice(0, 1)}
            </span>
          )}
          <span className="text-sm font-medium text-ink">{b.name}</span>
          {b.modelCount > 0 && (
            <span className="text-xs text-muted">{b.modelCount} мод.</span>
          )}
        </Link>
      ))}
    </div>
  );
}
