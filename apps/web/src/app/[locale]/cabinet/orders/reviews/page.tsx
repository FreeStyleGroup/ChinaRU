'use client';

/**
 * Мои отзывы — вкладки «Ожидание отзыва» / «Вы уже оценили».
 * Демо-данные перенесены из боевого china:cabinet (actionReviews).
 */
import { EmptyState, Tabs } from '@/components/cabinet/tabs';

interface WaitingReview {
  orderId: string;
  product: string;
  date: string;
}
interface DoneReview {
  product: string;
  rating: number;
  text: string;
  date: string;
}

const WAITING: WaitingReview[] = [
  { orderId: '100500', product: 'Беспроводные наушники Baseus', date: '10.03.2026' },
];

const DONE: DoneReview[] = [
  {
    product: 'Чехол для iPhone 15',
    rating: 5,
    text: 'Отличный чехол, сел идеально!',
    date: '01.02.2026',
  },
  {
    product: 'Зарядное устройство Ugreen 65W',
    rating: 4,
    text: 'Греется, но заряжает быстро.',
    date: '15.01.2026',
  },
];

const TABS = [
  { key: 'waiting', label: 'Ожидание отзыва', count: WAITING.length },
  { key: 'done', label: 'Вы уже оценили', count: DONE.length },
] as const;

function Stars({ value }: { value: number }) {
  return (
    <span className="text-sm text-amber-500" aria-label={`${value} из 5`}>
      {'★'.repeat(value)}
      <span className="text-line">{'★'.repeat(5 - value)}</span>
    </span>
  );
}

export default function ReviewsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Мои отзывы</h1>

      <Tabs tabs={TABS}>
        {active =>
          active === 'waiting' ? (
            WAITING.length === 0 ? (
              <EmptyState title="Нет товаров, ожидающих отзыва." />
            ) : (
              <div className="space-y-3">
                {WAITING.map(r => (
                  <div
                    key={r.orderId}
                    className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4"
                  >
                    <span className="h-14 w-14 flex-shrink-0 rounded-xl bg-surface" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{r.product}</p>
                      <p className="text-xs text-muted">
                        Заказ #{r.orderId} · {r.date}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
                    >
                      Написать отзыв
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : DONE.length === 0 ? (
            <EmptyState title="Вы пока не оставили ни одного отзыва." />
          ) : (
            <div className="space-y-3">
              {DONE.map(r => (
                <div key={r.product} className="rounded-2xl border border-line bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-ink">{r.product}</p>
                    <span className="text-xs text-muted">{r.date}</span>
                  </div>
                  <div className="mt-1">
                    <Stars value={r.rating} />
                  </div>
                  <p className="mt-2 text-sm text-muted">{r.text}</p>
                </div>
              ))}
            </div>
          )
        }
      </Tabs>
    </div>
  );
}
