'use client';

import { Badge } from '@china-ru/ui';
import { useEffect, useState } from 'react';

import { orderClient } from '@/lib/api-client';

import type { OrderDto } from '@china-ru/shared';


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
            <div
              key={o.id}
              className="flex items-center justify-between rounded-xl border border-line bg-white px-5 py-4"
            >
              <div>
                <p className="font-mono text-xs text-muted">{o.id.slice(0, 8)}</p>
                <p className="text-sm text-ink">{o.items.length} поз.</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-ink">
                  {o.totalAmount} {o.currency.toUpperCase()}
                </p>
                <Badge>{o.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
