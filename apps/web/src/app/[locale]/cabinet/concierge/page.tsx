'use client';

/**
 * Консьерж — расширенный ИИ-помощник по всем направлениям портала (товары, логистика,
 * тендеры, путешествия, перевод и т.д.). Доступен ТОЛЬКО по платной подписке: без неё
 * показывается paywall. Демо: подписка не оформлена. Реальная оплата/доступ — позже.
 */
import { useState } from 'react';

const CAPABILITIES = [
  { icon: '🛒', title: 'Подбор товаров и поставщиков', desc: 'Найдёт и сравнит предложения под задачу' },
  { icon: '🚚', title: 'Логистика и таможня', desc: 'Подскажет маршрут, сроки и расчёт доставки' },
  { icon: '📋', title: 'Тендеры и закупки', desc: 'Поможет оформить заявку и оценить условия' },
  { icon: '✈️', title: 'Путешествия и бизнес-туры', desc: 'Спланирует поездку и бронирования' },
  { icon: '🗣️', title: 'Перевод и переговоры', desc: 'Перевод и помощь в общении с Китаем' },
  { icon: '🧭', title: 'Навигация по порталу', desc: 'Ответит на любой вопрос по China.ru' },
];

export default function ConciergePage() {
  // Демо: подписка не оформлена (придёт из профиля/биллинга позже).
  const [subscribed] = useState(false);

  if (subscribed) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ink">Консьерж</h1>
        <div className="rounded-2xl border border-line bg-white p-6 text-muted">
          Чат с ИИ-консьержем — подключается с модулем ассистента.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Консьерж</h1>

      <div className="rounded-2xl bg-gradient-to-br from-ink to-brand p-8 text-white">
        <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
          PREMIUM · по подписке
        </span>
        <h2 className="mt-3 text-2xl font-bold">Расширенный ИИ-помощник China.ru</h2>
        <p className="mt-2 max-w-xl text-sm text-white/85">
          Персональный консьерж на базе ИИ помогает по всем направлениям портала: товары и
          поставщики, логистика, тендеры, путешествия, перевод и переговоры. Доступен после
          оформления подписки.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CAPABILITIES.map(c => (
          <div key={c.title} className="rounded-2xl border border-line bg-white p-5">
            <span className="text-2xl">{c.icon}</span>
            <p className="mt-2 font-medium text-ink">{c.title}</p>
            <p className="text-sm text-muted">{c.desc}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand/30 bg-brand/5 p-6">
        <div>
          <p className="text-lg font-bold text-ink">Подписка «Консьерж»</p>
          <p className="text-sm text-muted">Полный доступ к ИИ-помощнику по всем разделам портала.</p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Оформить подписку
        </button>
      </div>

      <p className="text-center text-xs text-muted">
        Демонстрационный раздел — оплата подписки и доступ к ИИ-консьержу подключаются позже.
      </p>
    </div>
  );
}
