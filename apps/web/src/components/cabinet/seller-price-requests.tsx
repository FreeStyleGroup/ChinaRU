'use client';

/**
 * «Мой магазин» → «Запросы цены»: покупатели просят назвать цену на товары без
 * цены. Продавец видит товар, количество, контакты покупателя и комментарий,
 * отвечает письмом или звонком вне площадки и сам ведёт статус:
 * новый → отвечен → закрыт.
 */
import { PRICE_REQUEST_STATUSES } from '@china-ru/shared';
import { Button, cn, StatusBadge, type BadgeTone } from '@china-ru/ui';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Link } from '@/i18n/navigation';
import { ClientApiError, sellerPriceRequestClient } from '@/lib/api-client';

import type { Paginated, PriceRequestDto, PriceRequestStatus } from '@china-ru/shared';

const PAGE_SIZE = 20;

const TONES: Record<PriceRequestStatus, BadgeTone> = {
  new: 'pending',
  answered: 'success',
  closed: 'neutral',
};

/** Действия продавца из текущего статуса. */
const NEXT: Record<PriceRequestStatus, PriceRequestStatus[]> = {
  new: ['answered', 'closed'],
  answered: ['closed'],
  closed: [],
};

/** Номер для ссылки tel: — только цифры и ведущий «+». */
function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

function RequestCard({
  request,
  onChanged,
}: {
  request: PriceRequestDto;
  onChanged: (updated: PriceRequestDto) => void;
}) {
  const t = useTranslations('priceRequests');
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const labels: Record<PriceRequestStatus, { label: string; tone: BadgeTone }> = {
    new: { label: t('statusNew'), tone: TONES.new },
    answered: { label: t('statusAnswered'), tone: TONES.answered },
    closed: { label: t('statusClosed'), tone: TONES.closed },
  };

  const setStatus = async (status: PriceRequestStatus): Promise<void> => {
    setBusy(true);
    setError('');
    try {
      onChanged(await sellerPriceRequestClient.setStatus(request.id, status));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : t('errorStatus'));
    } finally {
      setBusy(false);
    }
  };

  const date = new Date(request.createdAt).toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const subject = t('replySubject', { product: request.product.nameRu });
  const mailto = `mailto:${request.buyer.email}?subject=${encodeURIComponent(subject)}`;

  return (
    <li
      className={cn(
        'rounded-2xl border bg-white p-5',
        request.status === 'new' ? 'border-amber-200' : 'border-line'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge value={request.status} labels={labels} />
        <time dateTime={request.createdAt} className="text-sm text-muted">
          {date}
        </time>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Link
          href={`/catalog/${request.product.slug}`}
          className="min-w-0 font-semibold break-words text-ink hover:text-brand"
        >
          {request.product.nameRu}
        </Link>
        <span className="text-sm font-medium whitespace-nowrap text-ink">
          {t('qty', { qty: request.qty })}
        </span>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
        <dt className="text-muted">{t('buyer')}</dt>
        <dd className="min-w-0 space-x-2 break-words text-ink">
          <span>{request.buyer.name ?? t('noName')}</span>
          <span className="text-line">·</span>
          <a href={`mailto:${request.buyer.email}`} className="text-brand hover:underline">
            {request.buyer.email}
          </a>
          {request.contactPhone && (
            <>
              <span className="text-line">·</span>
              <a
                href={telHref(request.contactPhone)}
                className="whitespace-nowrap text-brand hover:underline"
              >
                {request.contactPhone}
              </a>
            </>
          )}
        </dd>
        {request.comment && (
          <>
            <dt className="text-muted">{t('comment')}</dt>
            <dd className="min-w-0 break-words whitespace-pre-line text-ink">{request.comment}</dd>
          </>
        )}
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <a href={mailto} className="text-sm font-medium text-brand hover:underline">
          {t('reply')} →
        </a>
        <div className="ml-auto flex flex-wrap gap-2">
          {NEXT[request.status].map(to => (
            <Button
              key={to}
              size="sm"
              variant={to === 'answered' ? 'primary' : 'outline'}
              disabled={busy}
              onClick={() => {
                void setStatus(to);
              }}
            >
              {to === 'answered' ? t('markAnswered') : t('close')}
            </Button>
          ))}
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-brand">
          {error}
        </p>
      )}
    </li>
  );
}

/**
 * Список запросов с фильтром по статусу и страницами. `onChanged` — сигнал
 * родителю (счётчик новых на вкладке) после смены статуса.
 */
export function SellerPriceRequests({ onChanged }: { onChanged?: () => void }) {
  const t = useTranslations('priceRequests');
  const tc = useTranslations('catalog');
  const [status, setStatus] = useState<PriceRequestStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<PriceRequestDto> | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  // Быстро переключили фильтр — ответ на прежний запрос уже не нужен и не затирает новый.
  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');
    sellerPriceRequestClient
      .list({ page, pageSize: PAGE_SIZE, ...(status ? { status } : {}) })
      .then(res => {
        if (cancelled) return;
        setData(res);
        setLoadState('ready');
      })
      .catch(() => {
        if (!cancelled) setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [page, status, reloadKey]);

  const filters: { value: PriceRequestStatus | undefined; label: string }[] = [
    { value: undefined, label: t('filterAll') },
    ...PRICE_REQUEST_STATUSES.map(s => ({
      value: s,
      label:
        s === 'new' ? t('filterNew') : s === 'answered' ? t('filterAnswered') : t('filterClosed'),
    })),
  ];

  // Сменили статус — карточка остаётся на месте с новой меткой (не прыгает из списка).
  const replace = (updated: PriceRequestDto): void => {
    setData(prev =>
      prev ? { ...prev, items: prev.items.map(r => (r.id === updated.id ? updated : r)) } : prev
    );
    onChanged?.();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">{t('title')}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t('lead')}</p>
      </div>

      <div role="group" aria-label={t('filterLabel')} className="flex flex-wrap gap-2">
        {filters.map(f => {
          const on = f.value === status;
          return (
            <button
              key={f.value ?? 'all'}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                on
                  ? 'border-brand bg-brand/5 font-medium text-brand'
                  : 'border-line text-muted hover:text-ink'
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loadState === 'loading' && !data && <p className="text-sm text-muted">{t('loading')}</p>}

      {loadState === 'error' && (
        <div className="rounded-2xl border border-line bg-white p-6 text-center">
          <p className="text-sm text-brand">{t('errorLoad')}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              setReloadKey(k => k + 1);
            }}
          >
            {t('retry')}
          </Button>
        </div>
      )}

      {loadState === 'ready' && data?.items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line p-12 text-center text-muted">
          {status ? t('emptyFiltered') : t('empty')}
        </div>
      )}

      {loadState !== 'error' && data && data.items.length > 0 && (
        <>
          <ul className={cn('space-y-3', loadState === 'loading' && 'opacity-60')}>
            {data.items.map(r => (
              <RequestCard key={r.id} request={r} onChanged={replace} />
            ))}
          </ul>
          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-2 text-sm">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loadState === 'loading'}
                onClick={() => {
                  setPage(p => p - 1);
                }}
              >
                {tc('prev')}
              </Button>
              <span className="text-muted">
                {tc('page', { page: data.page, total: data.totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages || loadState === 'loading'}
                onClick={() => {
                  setPage(p => p + 1);
                }}
              >
                {tc('next')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
