'use client';

import {
  aggregateFulfillment,
  FULFILLMENT_STATUS_LABELS,
  ORDER_STATUS_LABELS,
} from '@china-ru/shared';
import { StatusBadge } from '@china-ru/ui';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Link } from '@/i18n/navigation';
import { orderClient } from '@/lib/api-client';
import { formatPrice } from '@/lib/format';

import type { OrderDto } from '@china-ru/shared';

/**
 * Заказ покупателя: позиции, суммы и статус исполнения по каждой позиции —
 * его двигает продавец («Собирается» → «Отправлен» → «Выдан»), здесь он виден
 * сразу после смены. Оплата — отдельным статусом заказа.
 */
export default function CabinetOrderPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDto | null | 'missing'>(null);

  useEffect(() => {
    let cancelled = false;
    void orderClient
      .get(id)
      .then(o => {
        if (!cancelled) setOrder(o);
      })
      .catch(() => {
        if (!cancelled) setOrder('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const back = (
    <Link href="/cabinet/orders" className="text-sm text-muted hover:text-ink">
      ← Мои заказы
    </Link>
  );

  if (order === null) return <p className="text-muted">Загрузка…</p>;
  if (order === 'missing') {
    return (
      <div className="space-y-4">
        {back}
        <p className="text-muted">Заказ не найден.</p>
      </div>
    );
  }

  const money = (v: string): string => formatPrice(v, order.currency, 'ru-RU');

  return (
    <div className="space-y-6">
      {back}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Заказ № {order.number}</h1>
          <p className="text-sm text-muted">
            от{' '}
            {new Date(order.createdAt).toLocaleString('ru-RU', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge
            value={aggregateFulfillment(order.items.map(i => i.fulfillmentStatus))}
            labels={FULFILLMENT_STATUS_LABELS}
          />
          <StatusBadge value={order.status} labels={ORDER_STATUS_LABELS} />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <ul className="divide-y divide-line">
          {order.items.map(item => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-ink">{item.nameSnapshot}</p>
                <p className="text-sm text-muted">
                  {item.qty} шт × {money(item.price)}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="font-semibold text-ink">
                  {money((Number.parseFloat(item.price) * item.qty).toFixed(2))}
                </p>
                <StatusBadge value={item.fulfillmentStatus} labels={FULFILLMENT_STATUS_LABELS} />
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-line bg-surface px-5 py-4">
          <span className="font-semibold text-ink">Итого</span>
          <span className="text-lg font-bold text-ink">{money(order.totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}
