'use client';

/**
 * Грузоперевозки — отражение перевозок пользователя: «Активные перевозки» (маршрут,
 * статус, трекинг, ETA) и «Мои объявления». Демо-данные; подробную логику биржи
 * (типы доставки, отклики, расчёты) заказчик опишет отдельно.
 */
import { EmptyState, Tabs } from '@/components/cabinet/tabs';

type Status = 'awaiting' | 'transit' | 'customs' | 'delivered';

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  awaiting: { label: 'Ожидает отправки', cls: 'bg-surface text-muted' },
  transit: { label: 'В пути', cls: 'bg-blue-50 text-blue-600' },
  customs: { label: 'На таможне', cls: 'bg-amber-50 text-amber-600' },
  delivered: { label: 'Доставлено', cls: 'bg-green-100 text-green-700' },
};

interface Shipment {
  id: string;
  route: string;
  mode: string;
  tracking: string;
  eta: string;
  progress: number;
  status: Status;
}

const SHIPMENTS: Shipment[] = [
  {
    id: 'CR-558012',
    route: 'Гуанчжоу → Москва',
    mode: 'Авто',
    tracking: 'CNRU558012',
    eta: '18.06.2026',
    progress: 65,
    status: 'transit',
  },
  {
    id: 'CR-557840',
    route: 'Иу → Новосибирск',
    mode: 'ЖД',
    tracking: 'CNRU557840',
    eta: '22.06.2026',
    progress: 40,
    status: 'customs',
  },
];

const ADS: Shipment[] = [];

const TABS = [
  { key: 'active', label: 'Активные перевозки', count: SHIPMENTS.length },
  { key: 'ads', label: 'Мои объявления', count: ADS.length },
] as const;

function ShipmentCard({ s }: { s: Shipment }) {
  const meta = STATUS_META[s.status];
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-ink">{s.route}</p>
          <p className="text-xs text-muted">
            {s.id} · {s.mode} · трек {s.tracking}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs ${meta.cls}`}>{meta.label}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full bg-brand" style={{ width: `${s.progress}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>В пути {s.progress}%</span>
        <span>ETA: {s.eta}</span>
      </div>
    </div>
  );
}

export default function FreightPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Грузоперевозки</h1>
        <a
          href="/cargo"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Открыть биржу
        </a>
      </div>

      <Tabs tabs={TABS}>
        {active => {
          const list = active === 'active' ? SHIPMENTS : ADS;
          if (list.length === 0) {
            return (
              <EmptyState
                title={
                  active === 'active'
                    ? 'Нет активных перевозок.'
                    : 'Вы пока не размещали объявления.'
                }
                action={{
                  label: active === 'active' ? 'Найти транспорт' : 'Подать объявление',
                  href: '/cargo',
                }}
              />
            );
          }
          return (
            <div className="space-y-3">
              {list.map(s => (
                <ShipmentCard key={s.id} s={s} />
              ))}
            </div>
          );
        }}
      </Tabs>

      <p className="text-center text-xs text-muted">
        Демонстрационные данные — раздел отражает активные перевозки со статусом и трекингом
        (для пользователей и компаний). Логику биржи уточним отдельно.
      </p>
    </div>
  );
}
