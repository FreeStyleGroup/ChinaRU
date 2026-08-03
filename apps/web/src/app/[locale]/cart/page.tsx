'use client';

import { Button, Container } from '@china-ru/ui';
import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';

import { Link } from '@/i18n/navigation';
import { cartClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { formatPrice } from '@/lib/format';
import { localizedName } from '@/lib/localize';

import type { CartDto, OrderDto } from '@china-ru/shared';

export default function CartPage() {
  const locale = useLocale();
  const { isAuthenticated, isHydrated } = useAuth();
  const [cart, setCart] = useState<CartDto | null>(null);
  const [pending, setPending] = useState(false);
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) return;
    let cancelled = false;
    void cartClient
      .get()
      .then(c => {
        if (!cancelled) setCart(c);
      })
      .catch(() => {
        if (!cancelled) setCart({ items: [], totalQty: 0, totalAmount: '0.00', currency: 'rub' });
      });
    return () => {
      cancelled = true;
    };
  }, [isHydrated, isAuthenticated]);

  async function run(fn: () => Promise<CartDto>): Promise<void> {
    setPending(true);
    setError(null);
    try {
      setCart(await fn());
    } catch {
      setError('Не удалось обновить корзину');
    } finally {
      setPending(false);
    }
  }

  const setQty = (itemId: string, qty: number): void => {
    void run(() => (qty < 1 ? cartClient.remove(itemId) : cartClient.updateItem(itemId, qty)));
  };
  const remove = (itemId: string): void => {
    void run(() => cartClient.remove(itemId));
  };

  const checkout = async (): Promise<void> => {
    setPending(true);
    setError(null);
    try {
      setOrder(await cartClient.checkout());
      setCart({ items: [], totalQty: 0, totalAmount: '0.00', currency: 'rub' });
    } catch {
      setError('Не удалось оформить заказ. Возможно, товара нет в наличии.');
    } finally {
      setPending(false);
    }
  };

  // Гость
  if (isHydrated && !isAuthenticated) {
    return (
      <Container className="py-16 text-center">
        <h1 className="text-2xl font-bold text-ink">Корзина</h1>
        <p className="mt-3 text-muted">Войдите, чтобы добавлять товары и оформлять заказы.</p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-xl bg-brand px-6 py-3 font-medium text-white"
        >
          Войти
        </Link>
      </Container>
    );
  }

  // Успех оформления
  if (order) {
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-line bg-white p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-3xl text-brand">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-ink">Заказ оформлен</h1>
          <p className="mt-2 text-muted">
            Заказ № <span className="font-mono">{order.id.slice(0, 8)}</span> на сумму{' '}
            {formatPrice(order.totalAmount, order.currency, locale)}. Менеджер свяжется с вами.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/cabinet/orders"
              className="rounded-xl bg-brand px-5 py-2.5 font-medium text-white"
            >
              Мои заказы
            </Link>
            <Link href="/catalog" className="rounded-xl border border-line px-5 py-2.5 text-ink">
              В каталог
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  // Загрузка
  if (cart === null) {
    return (
      <Container className="py-16">
        <p className="text-muted">Загрузка…</p>
      </Container>
    );
  }

  // Пустая корзина
  if (cart.items.length === 0) {
    return (
      <Container className="py-16 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surface text-4xl">
          🛒
        </div>
        <h1 className="text-2xl font-bold text-ink">Корзина пуста</h1>
        <p className="mt-2 text-muted">Добавьте товары из каталога — соберём заказ.</p>
        <Link
          href="/catalog"
          className="mt-6 inline-flex rounded-xl bg-brand px-6 py-3 font-medium text-white"
        >
          Перейти в каталог
        </Link>
      </Container>
    );
  }

  return (
    <Container className="py-12">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-ink">Корзина</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Список позиций */}
        <div className="space-y-3">
          {cart.items.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4"
            >
              <Link
                href={`/catalog/${item.slug}`}
                className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface"
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={localizedName(item, locale)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-line">
                    {localizedName(item, locale).slice(0, 1)}
                  </div>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/catalog/${item.slug}`}
                  className="line-clamp-2 font-medium text-ink hover:text-brand"
                >
                  {localizedName(item, locale)}
                </Link>
                <p className="mt-1 text-sm text-muted">
                  {formatPrice(item.price, item.currency, locale)} / шт.
                </p>
                {!item.available && (
                  <p className="mt-1 text-sm text-brand">Нет в наличии в нужном количестве</p>
                )}
              </div>

              {/* Степпер количества */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setQty(item.id, item.qty - 1);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-lg text-ink hover:bg-surface disabled:opacity-50"
                  aria-label="Уменьшить"
                >
                  −
                </button>
                <span className="w-10 text-center font-medium tabular-nums text-ink">
                  {item.qty}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setQty(item.id, item.qty + 1);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-lg text-ink hover:bg-surface disabled:opacity-50"
                  aria-label="Увеличить"
                >
                  +
                </button>
              </div>

              <div className="w-28 text-right">
                <p className="font-semibold text-ink">
                  {formatPrice(item.lineTotal, item.currency, locale)}
                </p>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    remove(item.id);
                  }}
                  className="mt-1 text-sm text-muted hover:text-brand disabled:opacity-50"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Итого */}
        <aside className="h-fit rounded-2xl border border-line bg-white p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold text-ink">Итого</h2>
          <div className="mt-4 flex items-center justify-between text-sm text-muted">
            <span>Товаров</span>
            <span className="tabular-nums text-ink">{cart.totalQty} шт.</span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
            <span className="font-medium text-ink">К оплате</span>
            <span className="text-xl font-bold text-ink">
              {formatPrice(cart.totalAmount, cart.currency, locale)}
            </span>
          </div>
          <Button
            size="lg"
            className="mt-6 w-full"
            disabled={pending}
            onClick={() => {
              void checkout();
            }}
          >
            {pending ? 'Оформляем…' : 'Оформить заказ'}
          </Button>
          {error && <p className="mt-3 text-sm text-brand">{error}</p>}
          <Link
            href="/catalog"
            className="mt-3 block text-center text-sm text-muted hover:text-ink"
          >
            ← Продолжить покупки
          </Link>
        </aside>
      </div>
    </Container>
  );
}
