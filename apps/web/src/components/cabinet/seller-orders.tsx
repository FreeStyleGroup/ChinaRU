'use client';

/**
 * «Мой магазин» → «Заказы»: продавец видит заказы со своими позициями и двигает
 * статус исполнения (собирается → отправлен → выдан, либо отмена при сборке).
 * Покупатель видит тот же статус у себя в «Моих заказах».
 * Мультивендор: у каждого продавца — только его позиции и его подытог.
 */
import { FULFILLMENT_STATUS_LABELS } from '@china-ru/shared';
import { Button, StatusBadge } from '@china-ru/ui';
import { useCallback, useEffect, useState } from 'react';

import { ClientApiError, sellerOrderClient } from '@/lib/api-client';
import { formatPrice } from '@/lib/format';

import type { FulfillmentStatus, SellerOrderDto } from '@china-ru/shared';

/** Кнопки-переходы, доступные продавцу из текущего статуса. */
const NEXT_ACTIONS: Record<FulfillmentStatus, { to: FulfillmentStatus; label: string }[]> = {
  processing: [
    { to: 'shipped', label: 'Отправлен' },
    { to: 'cancelled', label: 'Отменить' },
  ],
  shipped: [{ to: 'delivered', label: 'Выдан покупателю' }],
  delivered: [],
  cancelled: [],
};

const money = (value: string, currency: SellerOrderDto['currency']): string =>
  formatPrice(value, currency, 'ru-RU');

function OrderCard({
  order,
  onChanged,
}: {
  order: SellerOrderDto;
  onChanged: (updated: SellerOrderDto) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const act = async (to: FulfillmentStatus): Promise<void> => {
    setBusy(true);
    setError('');
    try {
      onChanged(await sellerOrderClient.setFulfillment(order.orderId, to));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : 'Не удалось сменить статус');
    } finally {
      setBusy(false);
    }
  };

  const date = new Date(order.createdAt).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const actions = NEXT_ACTIONS[order.fulfillmentStatus];

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-ink">Заказ № {order.orderNumber}</span>
          <StatusBadge value={order.fulfillmentStatus} labels={FULFILLMENT_STATUS_LABELS} />
        </div>
        <span className="text-sm text-muted">{date}</span>
      </div>

      <ul className="mt-3 divide-y divide-line/70">
        {order.items.map(item => (
          <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="text-ink">
              {item.nameSnapshot} <span className="text-muted">× {item.qty}</span>
            </span>
            <span className="whitespace-nowrap text-muted">{money(item.lineTotal, order.currency)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <span className="text-sm font-semibold text-ink">
          Итого по вашим товарам: {money(order.subtotal, order.currency)}
        </span>
        <div className="flex flex-wrap gap-2">
          {actions.map(a => (
            <Button
              key={a.to}
              variant={a.to === 'cancelled' ? 'outline' : 'primary'}
              disabled={busy}
              onClick={() => {
                void act(a.to);
              }}
            >
              {a.label}
            </Button>
          ))}
          {actions.length === 0 && (
            <span className="text-sm text-muted">Заказ закрыт — действий нет.</span>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-brand">{error}</p>}
    </div>
  );
}

export function SellerOrders() {
  const [orders, setOrders] = useState<SellerOrderDto[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  const load = useCallback(async (): Promise<void> => {
    setStatus('loading');
    try {
      setOrders(await sellerOrderClient.list());
      setStatus('ready');
    } catch (e) {
      setStatus('error');
      setError(e instanceof ClientApiError ? e.message : 'Не удалось загрузить заказы');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onChanged = (updated: SellerOrderDto): void => {
    setOrders(prev => prev.map(o => (o.orderId === updated.orderId ? updated : o)));
  };

  if (status === 'loading') return <p className="text-muted">Загрузка заказов…</p>;
  if (status === 'error') return <p className="text-brand">{error}</p>;
  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-12 text-center text-muted">
        Пока нет заказов с вашими товарами. Как только покупатель оформит заказ, он появится здесь.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map(order => (
        <OrderCard key={order.orderId} order={order} onChanged={onChanged} />
      ))}
    </div>
  );
}
