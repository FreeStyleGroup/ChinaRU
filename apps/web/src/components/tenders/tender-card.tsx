import {
  TENDER_LAW_LABELS,
  TENDER_METHOD_LABELS,
  TENDER_STATUS_LABELS,
  type TenderDto,
} from '@china-ru/shared';

import { Link } from '@/i18n/navigation';

import { formatDeadline, money, tenderStatusClass } from './format';

/** Карточка тендера в реестре. */
export function TenderCard({ tender }: { tender: TenderDto }) {
  const price = money(tender.startPrice, tender.currency);
  return (
    <Link
      href={`/tenders/${tender.id}`}
      className="block rounded-2xl border border-line bg-white p-5 transition-colors hover:border-brand"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="font-medium text-ink">№ {tender.registryNumber}</span>
        <span className="rounded-full bg-surface px-2 py-0.5">
          {TENDER_METHOD_LABELS[tender.method]}
        </span>
        <span className="rounded-full bg-surface px-2 py-0.5">
          {TENDER_LAW_LABELS[tender.law]}
        </span>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 ${tenderStatusClass(tender.status)}`}>
          {TENDER_STATUS_LABELS[tender.status]}
        </span>
      </div>

      <h3 className="mt-3 line-clamp-2 font-semibold text-ink">{tender.title}</h3>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <span className="flex items-center gap-1">
          {tender.customer.companyName}
          {tender.customer.verified && (
            <span
              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white"
              title="Верифицированная компания"
            >
              ✓
            </span>
          )}
        </span>
        {tender.region && <span>📍 {tender.region}</span>}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        {price ? (
          <span className="font-semibold text-ink">НМЦК: {price}</span>
        ) : (
          <span className="text-muted">Цена договорная</span>
        )}
        <span className="text-muted">
          {tender.status === 'published'
            ? `Заявки до ${formatDeadline(tender.submissionDeadline)}`
            : `Заявок: ${tender.bidCount}`}
        </span>
      </div>
    </Link>
  );
}
