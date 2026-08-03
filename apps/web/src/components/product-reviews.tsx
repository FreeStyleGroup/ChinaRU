'use client';

/**
 * Блок отзывов на карточке товара: список одобренных отзывов (SSR-preload) + форма
 * покупателя. Отзыв доступен только купившему товар; после отправки уходит на
 * модерацию, поэтому на экране показываем подтверждение, а не мгновенную публикацию.
 */
import { Button } from '@china-ru/ui';
import { useState } from 'react';

import { ClientApiError, reviewClient } from '@/lib/api-client';

import type { ReviewDto } from '@china-ru/shared';

function Stars({ value }: { value: number }) {
  return (
    <span className="text-amber-500" aria-label={`Оценка ${value} из 5`}>
      {'★'.repeat(value)}
      <span className="text-line">{'★'.repeat(5 - value)}</span>
    </span>
  );
}

function ReviewList({ reviews }: { reviews: ReviewDto[] }) {
  if (reviews.length === 0) {
    return <p className="text-muted">Отзывов пока нет. Купите товар и поделитесь мнением первым.</p>;
  }
  return (
    <ul className="space-y-4">
      {reviews.map(r => (
        <li key={r.id} className="rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-ink">{r.author.name ?? 'Покупатель'}</span>
            <Stars value={r.rating} />
          </div>
          {r.title && <p className="mt-1 font-semibold text-ink">{r.title}</p>}
          <p className="mt-1 whitespace-pre-line text-muted">{r.body}</p>
          <p className="mt-2 text-xs text-muted">
            {new Date(r.createdAt).toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </li>
      ))}
    </ul>
  );
}

function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (): Promise<void> => {
    setState('saving');
    setError('');
    try {
      await reviewClient.create(productId, {
        rating,
        body: body.trim(),
        ...(title.trim() ? { title: title.trim() } : {}),
      });
      setState('done');
    } catch (e) {
      setState('error');
      if (e instanceof ClientApiError) {
        if (e.status === 401) setError('Войдите в аккаунт, чтобы оставить отзыв.');
        else if (e.code === 'purchase_required')
          setError('Отзыв можно оставить только после покупки этого товара.');
        else if (e.code === 'review_exists') setError('Вы уже оставляли отзыв на этот товар.');
        else setError(e.message);
      } else {
        setError('Не удалось отправить отзыв');
      }
    }
  };

  if (state === 'done') {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-700">
        Спасибо! Отзыв отправлен на модерацию и появится после проверки.
      </div>
    );
  }

  return (
    <form
      className="space-y-3 rounded-2xl border border-line bg-white p-5"
      onSubmit={e => {
        e.preventDefault();
        void submit();
      }}
    >
      <p className="font-semibold text-ink">Оставить отзыв</p>
      <label className="block space-y-1">
        <span className="text-sm text-muted">Оценка</span>
        <div className="flex gap-1 text-2xl">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setRating(n);
              }}
              className={n <= rating ? 'text-amber-500' : 'text-line'}
              aria-label={`${n} из 5`}
            >
              ★
            </button>
          ))}
        </div>
      </label>
      <input
        value={title}
        onChange={e => {
          setTitle(e.target.value);
        }}
        placeholder="Заголовок (необязательно)"
        maxLength={200}
        className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
      />
      <textarea
        value={body}
        onChange={e => {
          setBody(e.target.value);
        }}
        placeholder="Расскажите о товаре: качество, доставка, соответствие описанию"
        rows={4}
        maxLength={5000}
        className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand"
      />
      {state === 'error' && <p className="text-sm text-brand">{error}</p>}
      <Button type="submit" disabled={state === 'saving' || body.trim().length === 0}>
        Отправить отзыв
      </Button>
    </form>
  );
}

export function ProductReviews({
  productId,
  initial,
}: {
  productId: string;
  initial: ReviewDto[];
}) {
  return (
    <div className="space-y-6 border-t border-line pt-8">
      <h2 className="text-xl font-bold text-ink">Отзывы {initial.length > 0 && `(${initial.length})`}</h2>
      <ReviewList reviews={initial} />
      <ReviewForm productId={productId} />
    </div>
  );
}
