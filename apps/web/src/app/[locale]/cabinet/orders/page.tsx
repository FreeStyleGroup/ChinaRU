'use client';

import { aggregateFulfillment, FULFILLMENT_STATUS_LABELS } from '@china-ru/shared';
import { StatusBadge } from '@china-ru/ui';
import { useEffect, useState } from 'react';

import { Link } from '@/i18n/navigation';
import { orderClient } from '@/lib/api-client';
import { formatPrice } from '@/lib/format';

import type { OrderDto } from '@china-ru/shared';

/** «Оперативная память DDR5» или «Оперативная память DDR5 и ещё 2». */
function itemsSummary(order: OrderDto): string {
  const [first, ...rest] = order.items;
  if (!first) return '—';
  return rest.length > 0 ? `${first.nameSnapshot} и ещё ${rest.length}` : first.nameSnapshot;
}

export default function CabinetOrdersPage() {
  const [orders, setOrders] = useState<OrderDto[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void orderClient
      .list()
      .then(rows => {
        if (!cancelled) setOrders(rows);
      })
      .catch(() => {
        if (!cancelled) setOrders([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Мои заказы</h1>
      {orders === null ? (
        <p className="text-muted">Загрузка…</p>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-12 text-center text-muted">
          Заказов пока нет
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <Link
              key={o.id}
              href={`/cabinet/orders/${o.id}`}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white px-5 py-4 transition-colors hover:border-brand/40"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-ink">
                  Заказ № {o.number}
                  <span className="ml-2 text-sm font-normal text-muted">
                    от {new Date(o.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </p>
                <p className="truncate text-sm text-muted">{itemsSummary(o)}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="font-semibold text-ink">{formatPrice(o.totalAmount, o.currency, 'ru-RU')}</p>
                <StatusBadge
                  value={aggregateFulfillment(o.items.map(i => i.fulfillmentStatus))}
                  labels={FULFILLMENT_STATUS_LABELS}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
