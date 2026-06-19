import {
  TENDER_LAW_LABELS,
  TENDER_METHOD_LABELS,
  TENDER_STATUS_LABELS,
  type TenderDto,
} from '@china-ru/shared';

import { formatDeadline, money, tenderStatusClass } from './format';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

/** Извещение тендера (презентационный блок, без интерактива). */
export function TenderNotice({ tender }: { tender: TenderDto }) {
  const start = money(tender.startPrice, tender.currency);
  const bidSec = money(tender.bidSecurity, tender.currency);
  const contractSec = money(tender.contractSecurity, tender.currency);
  return (
    <article className="rounded-2xl border border-line bg-white p-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="font-medium text-ink">Тендер № {tender.registryNumber}</span>
        <span className="rounded-full bg-surface px-2 py-0.5">
          {TENDER_METHOD_LABELS[tender.method]}
        </span>
        <span className="rounded-full bg-surface px-2 py-0.5">{TENDER_LAW_LABELS[tender.law]}</span>
        <span className={`rounded-full px-2.5 py-0.5 ${tenderStatusClass(tender.status)}`}>
          {TENDER_STATUS_LABELS[tender.status]}
        </span>
      </div>

      <h1 className="mt-3 text-2xl font-bold text-ink">{tender.title}</h1>

      <p className="mt-2 flex items-center gap-1 text-sm text-muted">
        Заказчик: <span className="font-medium text-ink">{tender.customer.companyName}</span>
        {tender.customer.verified && (
          <span
            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white"
            title="Верифицированная компания"
          >
            ✓
          </span>
        )}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Срок подачи заявок" value={formatDeadline(tender.submissionDeadline)} />
        <Field label="НМЦК" value={start ?? 'Договорная'} />
        {tender.region && <Field label="Регион" value={tender.region} />}
        {tender.deliveryPlace && <Field label="Место поставки" value={tender.deliveryPlace} />}
        {bidSec && <Field label="Обеспечение заявки" value={bidSec} />}
        {contractSec && <Field label="Обеспечение контракта" value={contractSec} />}
        <Field label="Заявок подано" value={String(tender.bidCount)} />
      </dl>

      <div className="mt-5">
        <h2 className="text-sm font-semibold text-ink">Предмет закупки</h2>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink/90">
          {tender.description}
        </p>
      </div>

      {tender.status === 'awarded' && tender.awardComment && (
        <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
          Итоги: {tender.awardComment}
        </p>
      )}
      {tender.status === 'cancelled' && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          Тендер отменён{tender.cancelReason ? `: ${tender.cancelReason}` : ''}.
        </p>
      )}
    </article>
  );
}
