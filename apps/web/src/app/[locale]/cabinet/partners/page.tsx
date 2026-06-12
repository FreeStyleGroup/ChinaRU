'use client';

/**
 * Мои партнёры — многоуровневая (MLM) реферальная программа на реальном API:
 * персональная ссылка/промокод (по publicId), баланс (баллы + деньги), агрегаты,
 * партнёры по уровням 1–3. Начисления — движок ReferralService (15/5/2% + баллы).
 */
import { useEffect, useState } from 'react';

import { referralClient } from '@/lib/api-client';

import type { ReferralSummaryDto } from '@china-ru/shared';


function money(v: string): string {
  return `${Number(v).toLocaleString('ru-RU')} ₽`;
}

export default function PartnersPage() {
  const [data, setData] = useState<ReferralSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void referralClient
      .summary()
      .then(d => {
        if (!cancelled) setData(d);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const copy = (): void => {
    if (!data) return;
    void navigator.clipboard?.writeText(data.refLink).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    });
  };

  if (loading) return <p className="text-muted">Загрузка…</p>;
  if (!data) return <p className="text-muted">Не удалось загрузить данные партнёрской программы.</p>;

  const kpi = [
    { label: 'Заработано всего', value: money(data.totalEarned), accent: true },
    { label: 'Баланс', value: money(data.balance) },
    { label: 'Баллы', value: data.points.toLocaleString('ru-RU') },
    { label: 'Всего партнёров', value: String(data.totalPartners) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Мои партнёры</h1>

      <div className="grid gap-4 rounded-2xl bg-gradient-to-r from-brand to-accent p-6 text-white lg:grid-cols-[1fr_auto]">
        <div>
          <h2 className="text-lg font-bold">Ваша реферальная программа</h2>
          <p className="mt-1 max-w-md text-sm text-white/85">
            Делитесь ссылкой или промокодом и получайте баллы и доход с нескольких уровней
            приглашённых партнёров.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {data.levels.map(l => (
              <span key={l.level} className="rounded-md bg-white/20 px-2 py-1">
                Уровень {l.level}: {l.percent}%
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 text-ink">
          <p className="text-xs text-muted">Ваша ссылка:</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="truncate rounded bg-surface px-2 py-1 text-xs">{data.refLink}</code>
            <button
              type="button"
              onClick={copy}
              className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white"
            >
              {copied ? 'Скопировано' : 'Копировать'}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Ваш промокод: <span className="font-semibold text-ink">{data.refCode}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpi.map(k => (
          <div key={k.label} className="rounded-xl border border-line bg-white p-5">
            <p className="text-sm text-muted">{k.label}</p>
            <p className={`mt-1 text-xl font-bold ${k.accent ? 'text-green-600' : 'text-ink'}`}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-white p-5">
        <h2 className="mb-4 font-semibold text-ink">Структура сети</h2>
        {data.partners.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            У вас пока нет партнёров. Поделитесь ссылкой, чтобы пригласить первых.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {data.partners.map(p => (
              <div
                key={p.publicId}
                className="flex items-center gap-3 py-3"
                style={{ paddingLeft: `${(p.level - 1) * 24}px` }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-sm font-semibold text-brand">
                  {(p.name ?? '#').slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {p.name ?? `Партнёр #${p.publicId}`}
                  </p>
                  <p className="text-xs text-muted">
                    ID: {p.publicId} · Уровень {p.level} · с{' '}
                    {new Date(p.joinedAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-xs text-muted">Ваш доход</p>
                  <p className="text-sm font-medium text-green-600">{money(p.income)}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs ${p.active ? 'bg-green-100 text-green-700' : 'bg-surface text-muted'}`}
                >
                  {p.active ? 'Активен' : 'Неактивен'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-muted">
        Доход и баллы тратятся на портале. Начисления идут автоматически с заказов
        приглашённых (10/5/2% по уровням) и за первую сделку реферала.
      </p>
    </div>
  );
}
