'use client';

/**
 * Тендеры — отражение тендеров пользователя/компании: «Мои заявки» (участие + статус)
 * и «Мои тендеры» (размещённые). Демо-данные; подробную логику площадки (типы,
 * ставки, переходы статусов) заказчик опишет отдельно.
 */
import { EmptyState, Tabs } from '@/components/cabinet/tabs';

type Status = 'review' | 'accepted' | 'rejected' | 'won';

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  review: { label: 'На рассмотрении', cls: 'bg-amber-50 text-amber-600' },
  accepted: { label: 'Заявка принята', cls: 'bg-blue-50 text-blue-600' },
  won: { label: 'Победа', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Отклонена', cls: 'bg-red-100 text-red-600' },
};

interface Application {
  id: string;
  title: string;
  customer: string;
  date: string;
  amount: string;
  status: Status;
}

const MY_APPLICATIONS: Application[] = [
  {
    id: 'T-100231',
    title: 'Поставка комплектующих для электроники',
    customer: 'ООО «ТехноИмпорт»',
    date: '08.06.2026',
    amount: '1 200 000 ₽',
    status: 'review',
  },
  {
    id: 'T-100198',
    title: 'Партия LED-светильников, 5000 шт.',
    customer: 'ООО «СветТорг»',
    date: '02.06.2026',
    amount: '850 000 ₽',
    status: 'accepted',
  },
  {
    id: 'T-100154',
    title: 'Текстиль оптом из Гуанчжоу',
    customer: 'ИП Иванов',
    date: '21.05.2026',
    amount: '430 000 ₽',
    status: 'rejected',
  },
];

const MY_TENDERS: Application[] = [
  {
    id: 'T-100240',
    title: 'Закупка упаковочного оборудования',
    customer: 'Размещён вами',
    date: '10.06.2026',
    amount: '2 100 000 ₽',
    status: 'review',
  },
];

const TABS = [
  { key: 'applications', label: 'Мои заявки', count: MY_APPLICATIONS.length },
  { key: 'tenders', label: 'Мои тендеры', count: MY_TENDERS.length },
] as const;

function Row({ a }: { a: Application }) {
  const s = STATUS_META[a.status];
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{a.title}</p>
        <p className="text-xs text-muted">
          {a.id} · {a.customer} · {a.date}
        </p>
      </div>
      <span className="font-semibold text-ink">{a.amount}</span>
      <span className={`rounded-full px-2.5 py-0.5 text-xs ${s.cls}`}>{s.label}</span>
    </div>
  );
}

export default function TendersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Тендеры</h1>
        <a
          href="/tenders"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Открыть площадку
        </a>
      </div>

      <Tabs tabs={TABS}>
        {active => {
          const list = active === 'applications' ? MY_APPLICATIONS : MY_TENDERS;
          if (list.length === 0) {
            return (
              <EmptyState
                title={
                  active === 'applications'
                    ? 'Вы пока не подавали заявки на тендеры.'
                    : 'Вы пока не размещали тендеры.'
                }
                action={{
                  label: active === 'applications' ? 'Найти тендеры' : 'Разместить тендер',
                  href: '/tenders',
                }}
              />
            );
          }
          return (
            <div className="space-y-3">
              {list.map(a => (
                <Row key={a.id} a={a} />
              ))}
            </div>
          );
        }}
      </Tabs>

      <p className="text-center text-xs text-muted">
        Демонстрационные данные — раздел отражает тендеры и статусы заявок (для пользователей и
        компаний). Логику площадки уточним отдельно.
      </p>
    </div>
  );
}
