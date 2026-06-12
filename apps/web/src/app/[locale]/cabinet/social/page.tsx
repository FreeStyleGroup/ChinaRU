'use client';

/**
 * Социальная сеть — лента активности пользователя (china:feed). Композер + посты.
 * Демо-данные; реальная лента, лайки/комментарии и отдельные страницы компаний —
 * при сборке модуля соцсети. (Компании/магазины имеют собственную страницу постов.)
 */
import { useState } from 'react';

import { useAuth } from '@/lib/auth-context';

interface Post {
  id: number;
  author: string;
  company?: boolean;
  time: string;
  text: string;
  likes: number;
  comments: number;
}

const FEED: Post[] = [
  {
    id: 1,
    author: 'Xiaomi Official Store',
    company: true,
    time: '2 ч назад',
    text: 'Новая партия Redmi Note 14 Pro уже на складе в Москве. Отгрузка в день заказа 🚀',
    likes: 142,
    comments: 18,
  },
  {
    id: 2,
    author: 'Алексей Смирнов',
    time: 'вчера',
    text: 'Заказал робот-пылесос Dreame — приехал за 11 дней, всё отлично упаковано. Рекомендую продавца!',
    likes: 37,
    comments: 5,
  },
];

export default function SocialPage() {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const initial = (user?.name ?? user?.email ?? '?').slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-ink">Социальная сеть</h1>

      <div className="rounded-2xl border border-line bg-white p-4">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
            {initial}
          </span>
          <textarea
            value={text}
            onChange={e => {
              setText(e.target.value);
            }}
            rows={2}
            placeholder="Поделитесь новостью или отзывом…"
            className="flex-1 resize-none rounded-lg border border-line px-3 py-2 outline-none focus:border-brand"
          />
        </div>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            disabled={!text.trim()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Опубликовать
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {FEED.map(p => (
          <article key={p.id} className="rounded-2xl border border-line bg-white p-4">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                  p.company ? 'bg-blue-500/10 text-blue-600' : 'bg-surface text-ink'
                }`}
              >
                {p.author.slice(0, 1)}
              </span>
              <div>
                <p className="flex items-center gap-1 text-sm font-semibold text-ink">
                  {p.author}
                  {p.company && (
                    <span
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white"
                      title="Верифицированная компания"
                    >
                      ✓
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted">{p.time}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-ink">{p.text}</p>
            <div className="mt-3 flex gap-4 text-sm text-muted">
              <span>♥ {p.likes}</span>
              <span>💬 {p.comments}</span>
            </div>
          </article>
        ))}
      </div>

      <p className="text-center text-xs text-muted">
        Демонстрационная лента — соцсеть и страницы компаний подключаются позже.
      </p>
    </div>
  );
}
