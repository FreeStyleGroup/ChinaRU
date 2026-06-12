/**
 * Мои партнёры — реферальная программа (демо-данные; начисления/структура подключаются позже).
 * Структура по референсу Битрикс: баннер программы + KPI + дерево сети.
 */
const KPI = [
  { label: 'Заработано всего', value: '284 500 ₽', accent: true },
  { label: 'Доход за месяц', value: '45 200 ₽' },
  { label: 'Всего партнёров', value: '124' },
  { label: 'Конверсия в сделки', value: '12.5%' },
];

interface PartnerRow {
  name: string;
  id: string;
  date: string;
  level: number;
  turnover: string;
  income: string;
  active: boolean;
  depth: number;
}

const NETWORK: PartnerRow[] = [
  {
    name: 'Алексей Смирнов',
    id: '10154',
    date: '10.02.2025',
    level: 1,
    turnover: '450 000 ₽',
    income: '+67 500 ₽',
    active: true,
    depth: 0,
  },
  {
    name: 'Иван П.',
    id: '20112',
    date: '15.02.2025',
    level: 2,
    turnover: '120 000 ₽',
    income: '+6 000 ₽',
    active: true,
    depth: 1,
  },
  {
    name: 'Елена В.',
    id: '20245',
    date: '20.02.2025',
    level: 2,
    turnover: '0 ₽',
    income: '+0 ₽',
    active: false,
    depth: 1,
  },
  {
    name: 'ООО «ВЭД Эксперт»',
    id: '10299',
    date: '05.01.2025',
    level: 1,
    turnover: '1 200 000 ₽',
    income: '+180 000 ₽',
    active: true,
    depth: 0,
  },
  {
    name: 'Михаил Д.',
    id: '20388',
    date: '18.01.2025',
    level: 2,
    turnover: '350 000 ₽',
    income: '+17 500 ₽',
    active: true,
    depth: 1,
  },
  {
    name: 'Анна К.',
    id: '30101',
    date: '01.02.2025',
    level: 3,
    turnover: '50 000 ₽',
    income: '+1 000 ₽',
    active: true,
    depth: 2,
  },
  {
    name: 'Денис Р.',
    id: '10321',
    date: '28.02.2025',
    level: 1,
    turnover: '80 000 ₽',
    income: '+12 000 ₽',
    active: true,
    depth: 0,
  },
];

export default function PartnersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Мои партнёры</h1>

      <div className="grid gap-4 rounded-2xl bg-gradient-to-r from-brand to-accent p-6 text-white lg:grid-cols-[1fr_auto]">
        <div>
          <h2 className="text-lg font-bold">Ваша реферальная программа</h2>
          <p className="mt-1 max-w-md text-sm text-white/85">
            Делитесь ссылкой или промокодом и получайте до 15% с каждой успешной сделки
            приглашённых.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-md bg-white/20 px-2 py-1">Уровень 1: 15%</span>
            <span className="rounded-md bg-white/20 px-2 py-1">Уровень 2: 5%</span>
            <span className="rounded-md bg-white/20 px-2 py-1">Уровень 3: 2%</span>
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 text-ink">
          <p className="text-xs text-muted">Ваша ссылка:</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="rounded bg-surface px-2 py-1 text-xs">
              https://china.ru/register?ref=…
            </code>
            <button
              type="button"
              className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white"
            >
              Копировать
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Ваш промокод: <span className="font-semibold text-ink">CN-000001</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPI.map(k => (
          <div key={k.label} className="rounded-xl border border-line bg-white p-5">
            <p className="text-sm text-muted">{k.label}</p>
            <p className={`mt-1 text-xl font-bold ${k.accent ? 'text-green-600' : 'text-ink'}`}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-semibold text-ink">Структура сети</h2>
          <input
            placeholder="Поиск партнёра по ID или имени…"
            className="h-9 w-64 max-w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
          />
        </div>
        <div className="divide-y divide-line">
          {NETWORK.map(p => (
            <div
              key={p.id}
              className="flex items-center gap-3 py-3"
              style={{ paddingLeft: `${p.depth * 24}px` }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-sm font-semibold text-brand">
                {p.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                <p className="text-xs text-muted">
                  ID: {p.id} · Рег: {p.date} · Уровень {p.level}
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-xs text-muted">Оборот</p>
                <p className="text-sm text-ink">{p.turnover}</p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-xs text-muted">Ваш доход</p>
                <p className="text-sm font-medium text-green-600">{p.income}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs ${p.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}
              >
                {p.active ? 'Активен' : 'Неактивен'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-muted">
        Демонстрационные данные — начисления и структура сети подключаются позже.
      </p>
    </div>
  );
}
