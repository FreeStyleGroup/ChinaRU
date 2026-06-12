'use client';

/**
 * Гороскоп — определяет китайский знак зодиака по дате рождения из профиля.
 * Прогноз — демонстрационный (детерминированный по знаку); живой контент позже.
 */
import { chineseZodiac } from '@china-ru/shared';

import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';

const FACETS = [
  { key: 'love', label: 'Любовь', icon: '❤️' },
  { key: 'career', label: 'Карьера', icon: '💼' },
  { key: 'finance', label: 'Финансы', icon: '💰' },
  { key: 'health', label: 'Здоровье', icon: '🌿' },
] as const;

const FORECAST: Record<string, string[]> = {
  love: [
    'День располагает к откровенному разговору — он сблизит вас с близким человеком.',
    'Прислушайтесь к интуиции в отношениях, она сегодня особенно точна.',
  ],
  career: [
    'Хорошее время для инициативы: ваши идеи заметят и поддержат.',
    'Сосредоточьтесь на одной задаче — многозадачность сегодня рассеивает силы.',
  ],
  finance: [
    'Удачный день для планирования бюджета и взвешенных покупок.',
    'Избегайте импульсивных трат — выгодное предложение появится позже.',
  ],
  health: [
    'Энергии много — направьте её на активный отдых и прогулку.',
    'Уделите внимание режиму сна, тело скажет спасибо.',
  ],
};

/** Детерминированный выбор строки по знаку — стабилен при SSR/гидратации. */
function pick(lines: string[], seed: number): string {
  return lines[seed % lines.length] ?? lines[0] ?? '';
}

export default function HoroscopePage() {
  const { user } = useAuth();
  const sign = chineseZodiac(user?.birthday);

  if (!sign) {
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

  const seed = sign.key.length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Гороскоп</h1>

      <div className="flex items-center gap-5 rounded-2xl bg-gradient-to-br from-brand to-accent p-6 text-white">
        <span className="text-6xl leading-none">{sign.emoji}</span>
        <div>
          <p className="text-sm text-white/70">Ваш знак китайского зодиака</p>
          <p className="text-2xl font-bold">{sign.ru}</p>
          <p className="mt-1 text-sm text-white/85">
            Стихия: {sign.element} · {sign.traits}
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted">Прогноз на сегодня</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {FACETS.map((f, i) => (
            <div key={f.key} className="rounded-2xl border border-line bg-white p-5">
              <p className="flex items-center gap-2 font-medium text-ink">
                <span>{f.icon}</span> {f.label}
              </p>
              <p className="mt-2 text-sm text-muted">{pick(FORECAST[f.key] ?? [], seed + i)}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-muted">
        Демонстрационный прогноз — ежедневный контент подключается позже.
      </p>
    </div>
  );
}
