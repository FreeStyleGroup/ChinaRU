'use client';

import { cn } from '@china-ru/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { ProductImageDto } from '@china-ru/shared';

/** Порядок показа: главное фото первым, остальные — по порядку продавца. */
function ordered(images: ProductImageDto[]): ProductImageDto[] {
  return [...images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sort - b.sort);
}

/**
 * Галерея товара: большое фото и миниатюры всех фото. Фото станков и линий
 * показываем целиком (object-contain) — обрезка срезала бы узлы оборудования.
 */
export function ProductGallery({ images, name }: { images: ProductImageDto[]; name: string }) {
  const t = useTranslations('product');
  const list = ordered(images);
  const [index, setIndex] = useState(0);
  const total = list.length;
  const current = list[Math.min(index, total - 1)];

  if (!current) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl border border-line bg-surface text-6xl font-bold text-line">
        {name.slice(0, 1)}
      </div>
    );
  }

  const go = (delta: number): void => {
    setIndex(i => (i + delta + total) % total);
  };

  return (
    <div className="min-w-0 space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-white">
        <img
          src={current.url}
          alt={total > 1 ? `${name}. ${t('photo', { index: index + 1, total })}` : name}
          className="h-full w-full object-contain"
        />
        {total > 1 && (
          <>
            <GalleryArrow direction="prev" label={t('prevPhoto')} onClick={() => go(-1)} />
            <GalleryArrow direction="next" label={t('nextPhoto')} onClick={() => go(1)} />
            <span className="absolute right-3 bottom-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white tabular-nums">
              {index + 1} / {total}
            </span>
          </>
        )}
      </div>

      {total > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {list.map((img, i) => (
            <li key={img.id} className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIndex(i);
                }}
                aria-label={t('photo', { index: i + 1, total })}
                aria-current={i === index ? 'true' : undefined}
                className={cn(
                  'block h-16 w-16 overflow-hidden rounded-xl border-2 bg-white transition-colors focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none sm:h-20 sm:w-20',
                  i === index ? 'border-brand' : 'border-line hover:border-muted'
                )}
              >
                <img src={img.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GalleryArrow({
  direction,
  label,
  onClick,
}: {
  direction: 'prev' | 'next';
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm ring-1 ring-line transition-colors hover:bg-white hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none',
        direction === 'prev' ? 'left-3' : 'right-3'
      )}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d={direction === 'prev' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
      </svg>
    </button>
  );
}
