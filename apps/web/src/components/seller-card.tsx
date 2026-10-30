import { buttonVariants, cn } from '@china-ru/ui';
import { useTranslations } from 'next-intl';

import { StoreLogo, VerifiedMark } from '@/components/store/store-identity';
import { Link } from '@/i18n/navigation';
import { storeName, storePath } from '@/lib/store';

import type { StoreDto } from '@china-ru/shared';

/** Блок «Продавец» на карточке товара: логотип, название, отметка проверки, ссылка в магазин. */
export function SellerCard({ store, locale }: { store: StoreDto; locale: string }) {
  const t = useTranslations('product');
  const tc = useTranslations('catalog');
  const name = storeName(store, locale);

  return (
    <section aria-label={t('seller')} className="rounded-2xl border border-line bg-white p-4">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{t('seller')}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-3">
        <StoreLogo
          name={store.companyName}
          logoUrl={store.logoUrl}
          className="h-12 w-12 shrink-0 rounded-xl border border-line text-base"
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-semibold text-ink">
            <span className="truncate">{name}</span>
            {store.verified && <VerifiedMark label={t('verifiedSeller')} className="h-4 w-4" />}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {store.reviewCount > 0 && (
              <>
                <span className="text-amber-500" aria-hidden>
                  ★
                </span>{' '}
                {Number(store.rating).toFixed(1)} · {t('reviewCount', { count: store.reviewCount })}{' '}
                ·{' '}
              </>
            )}
            {tc('productCount', { count: store.productCount })}
          </p>
        </div>
        <Link
          href={storePath(store)}
          // На телефоне — отдельной строкой во всю ширину: иначе кнопка съедает название.
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full sm:w-auto')}
        >
          {t('goToStore')}
        </Link>
      </div>
    </section>
  );
}
