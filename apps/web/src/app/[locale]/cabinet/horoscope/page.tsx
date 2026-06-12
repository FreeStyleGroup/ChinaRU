'use client';

/**
 * Гороскоп в кабинете: знак китайского зодиака по дате рождения из профиля +
 * дневной прогноз. Прогноз приходит из API (генерируется ИИ-провайдером; при
 * отсутствии ключа — детерминированный демо-прогноз).
 */
import { chineseZodiac, type HoroscopeForecastDto } from '@china-ru/shared';
import { useEffect, useState } from 'react';

import { Link } from '@/i18n/navigation';
import { horoscopeClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

const FACETS = [
  { key: 'love', label: 'Любовь', icon: '❤️' },
  { key: 'career', label: 'Карьера', icon: '💼' },
  { key: 'finance', label: 'Финансы', icon: '💰' },
  { key: 'health', label: 'Здоровье', icon: '🌿' },
] as const;

export default function HoroscopePage() {
  const { user } = useAuth();
  const hasBirthday = Boolean(user?.birthday);
  const localSign = chineseZodiac(user?.birthday);
  const [forecast, setForecast] = useState<HoroscopeForecastDto | null>(null);
  const [loading, setLoading] = useState(hasBirthday);

  useEffect(() => {
    if (!hasBirthday) return;
    let cancelled = false;
    setLoading(true);
    void horoscopeClient
      .forecast()
      .then(f => {
        if (!cancelled) setForecast(f);
      })
      .catch(() => {
        /* знак покажем локально, прогноз пропустим */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasBirthday]);

  if (!hasBirthday || !localSign) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ink">Гороскоп</h1>
        <div className="rounded-2xl border border-dashed border-line p-12 text-center">
          <p className="text-muted">
            Чтобы определить ваш знак китайского зодиака, укажите дату рождения в профиле.
          </p>
          <Link
            href="/cabinet/profile"
            className="mt-4 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
          >
            Заполнить дату рождения
          </Link>
        </div>
      </div>
    );
  }

  const sign = forecast?.sign ?? {
    key: localSign.key,
    ru: localSign.ru,
    cn: '',
    emoji: localSign.emoji,
    element: localSign.element,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Гороскоп</h1>
        <Link href="/horoscope" className="text-sm text-brand hover:underline">
          Раздел «Китайский гороскоп» →
        </Link>
      </div>

      <Link
        href={`/horoscope/${sign.key}`}
        className="flex items-center gap-5 rounded-2xl bg-gradient-to-br from-brand to-accent p-6 text-white transition-opacity hover:opacity-95"
      >
        <span className="text-6xl leading-none">{sign.emoji}</span>
        <div>
          <p className="text-sm text-white/70">Ваш знак китайского зодиака</p>
          <p className="text-2xl font-bold">
            {sign.ru} {sign.cn && <span className="text-white/80">{sign.cn}</span>}
          </p>
          <p className="mt-1 text-sm text-white/85">
            Стихия года: {sign.element} · {localSign.traits}
          </p>
        </div>
      </Link>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted">
          Прогноз на сегодня
          {forecast?.date ? ` · ${new Date(forecast.date).toLocaleDateString('ru-RU')}` : ''}
        </h2>
        {loading ? (
          <p className="text-muted">Составляем прогноз…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {FACETS.map(f => (
              <div key={f.key} className="rounded-2xl border border-line bg-white p-5">
                <p className="flex items-center gap-2 font-medium text-ink">
                  <span>{f.icon}</span> {f.label}
                </p>
                <p className="mt-2 text-sm text-muted">
                  {forecast?.facets[f.key] ?? 'Прогноз временно недоступен.'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {forecast && !forecast.generated && (
        <p className="text-center text-xs text-muted">
          Демонстрационный прогноз — персональный ИИ-прогноз подключается после настройки провайдера.
        </p>
      )}
    </div>
  );
}
