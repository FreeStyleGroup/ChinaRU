'use client';

/**
 * Баллы и Купоны — вкладки «Баллы» (лояльность-«драконы») / «Купоны».
 * Уровни Белый → Красный → Изумрудный → Золотой. Демо из china:cabinet (actionCoupons).
 */
import { EmptyState, Tabs } from '@/components/cabinet/tabs';

const DRAGONS = [
  { key: 'white', name: 'Белый дракон', min: 0, color: '#94a3b8' },
  { key: 'red', name: 'Красный дракон', min: 1000, color: '#c62828' },
  { key: 'emerald', name: 'Изумрудный дракон', min: 3000, color: '#059669' },
  { key: 'gold', name: 'Золотой дракон', min: 7000, color: '#d4a017' },
] as const;

const LOYALTY = {
  level: 'Красный дракон',
  points: 1500,
  nextLevel: 'Изумрудный дракон',
  nextPoints: 3000,
  percent: 50,
};

interface Coupon {
  code: string;
  discount: string;
  minOrder: string;
  expire: string;
  desc: string;
}

const COUPONS: Coupon[] = [
  {
    code: 'NEWYEAR2026',
    discount: '500 ₽',
    minOrder: '3000 ₽',
    expire: '31.12.2026',
    desc: 'Скидка на любой заказ',
  },
  {
    code: 'XIAOMI10',
    discount: '10%',
    minOrder: '0 ₽',
    expire: '01.06.2026',
    desc: 'Скидка на товары Xiaomi',
  },
];

const TABS = [
  { key: 'points', label: 'Баллы' },
  { key: 'coupons', label: 'Купоны', count: COUPONS.length },
] as const;

export default function CouponsPage() {
  const remaining = LOYALTY.nextPoints - LOYALTY.points;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Баллы и Купоны</h1>

      <Tabs tabs={TABS}>
        {active =>
          active === 'points' ? (
            <div className="space-y-5">
              <div className="rounded-2xl bg-ink p-6 text-white">
                <p className="text-sm text-white/60">Ваш уровень</p>
                <p className="mt-1 text-2xl font-bold">🐉 {LOYALTY.level}</p>
                <p className="mt-3 text-3xl font-bold">
                  {LOYALTY.points.toLocaleString('ru-RU')}{' '}
                  <span className="text-base font-normal text-white/60">баллов</span>
                </p>
                <div className="mt-4">
                  <div className="h-2 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${LOYALTY.percent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-white/70">
                    До уровня «{LOYALTY.nextLevel}» осталось{' '}
                    {remaining.toLocaleString('ru-RU')} баллов
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {DRAGONS.map(d => {
                  const current = d.name === LOYALTY.level;
                  return (
                    <div
                      key={d.key}
                      className={`rounded-xl border p-4 text-center ${current ? 'border-brand bg-brand/5' : 'border-line bg-white'}`}
                    >
                      <span className="text-2xl" style={{ color: d.color }}>
                        🐉
                      </span>
                      <p className="mt-1 text-sm font-medium text-ink">{d.name}</p>
                      <p className="text-xs text-muted">от {d.min.toLocaleString('ru-RU')}</p>
                      {current && (
                        <span className="mt-1 inline-block rounded-full bg-brand px-2 py-0.5 text-[10px] font-medium text-white">
                          текущий
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : COUPONS.length === 0 ? (
            <EmptyState title="У вас пока нет купонов." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {COUPONS.map(c => (
                <div
                  key={c.code}
                  className="flex overflow-hidden rounded-2xl border border-line bg-white"
                >
                  <div className="flex w-24 flex-shrink-0 items-center justify-center bg-brand text-center text-lg font-bold text-white">
                    {c.discount}
                  </div>
                  <div className="flex-1 p-4">
                    <p className="font-semibold text-ink">{c.desc}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      Промокод: <span className="font-mono font-medium text-ink">{c.code}</span>
                    </p>
                    <p className="text-xs text-muted">
                      Мин. заказ: {c.minOrder} · до {c.expire}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </Tabs>

      <p className="text-center text-xs text-muted">
        Демонстрационные данные — программа лояльности подключается позже.
      </p>
    </div>
  );
}
