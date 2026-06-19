'use client';

/**
 * Тендеры в кабинете: «Мои тендеры» (размещённые компанией-заказчиком) и «Мои
 * заявки» (участие в чужих тендерах со статусом). Живые данные тендерной площадки.
 */
import {
  TENDER_BID_STATUS_LABELS,
  TENDER_STATUS_LABELS,
  type MyTenderBidDto,
  type TenderDto,
} from '@china-ru/shared';
import { useEffect, useState } from 'react';

import { EmptyState, Tabs } from '@/components/cabinet/tabs';
import { money, tenderStatusClass } from '@/components/tenders/format';
import { Link } from '@/i18n/navigation';
import { tenderClient } from '@/lib/api-client';

function TenderRow({ t }: { t: TenderDto }) {
  const price = money(t.startPrice, t.currency);
  return (
    <Link
      href={`/tenders/${t.id}`}
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-brand"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{t.title}</p>
        <p className="text-xs text-muted">
          № {t.registryNumber} · заявок: {t.bidCount}
        </p>
      </div>
      {price && <span className="font-semibold text-ink">{price}</span>}
      <span className={`rounded-full px-2.5 py-0.5 text-xs ${tenderStatusClass(t.status)}`}>
        {TENDER_STATUS_LABELS[t.status]}
      </span>
    </Link>
  );
}

function BidRow({ b }: { b: MyTenderBidDto }) {
  return (
    <Link
      href={`/tenders/${b.tenderId}`}
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-brand"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{b.tenderTitle}</p>
        <p className="text-xs text-muted">
          Тендер № {b.tenderRegistryNumber} · {TENDER_STATUS_LABELS[b.tenderStatus]}
        </p>
      </div>
      <span className="font-semibold text-ink">{Number(b.price).toLocaleString('ru-RU')}</span>
      <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-ink">
        {TENDER_BID_STATUS_LABELS[b.status]}
      </span>
    </Link>
  );
}

export default function CabinetTendersPage() {
  const [tenders, setTenders] = useState<TenderDto[]>([]);
  const [bids, setBids] = useState<MyTenderBidDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      tenderClient.myTenders().catch(() => null),
      tenderClient.myBids().catch(() => null),
    ]).then(([t, b]) => {
      if (cancelled) return;
      if (t) setTenders(t.items);
      if (b) setBids(b.items);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const tabs = [
    { key: 'tenders', label: 'Мои тендеры', count: tenders.length },
    { key: 'bids', label: 'Мои заявки', count: bids.length },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Тендеры</h1>
        <Link
          href="/tenders/new"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Разместить тендер
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Загрузка…</p>
      ) : (
        <Tabs tabs={tabs}>
          {active => {
            if (active === 'tenders') {
              return tenders.length === 0 ? (
                <EmptyState
                  title="Вы пока не размещали тендеры."
                  action={{ label: 'Разместить тендер', href: '/tenders/new' }}
                />
              ) : (
                <div className="space-y-3">
                  {tenders.map(t => (
                    <TenderRow key={t.id} t={t} />
                  ))}
                </div>
              );
            }
            return bids.length === 0 ? (
              <EmptyState
                title="Вы пока не подавали заявки на тендеры."
                action={{ label: 'Найти тендеры', href: '/tenders' }}
              />
            ) : (
              <div className="space-y-3">
                {bids.map(b => (
                  <BidRow key={b.id} b={b} />
                ))}
              </div>
            );
          }}
        </Tabs>
      )}
    </div>
  );
}
