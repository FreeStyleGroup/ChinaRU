'use client';

/**
 * Афиша — купленные билеты (Активные), wishlist (Избранное), Архив. По «Напомнить»
 * открывается модалка с датой/временем и каналами (СМС / В приложении / По почте).
 * Демо-данные; живые события и нотификации — из раздела /events/.
 */
import { useState } from 'react';

import { EmptyState, Tabs } from '@/components/cabinet/tabs';

interface EventCard {
  id: number;
  name: string;
  date: string;
  remindAt: string;
  location: string;
  price: string;
  tickets?: number;
  daysLeft?: number;
}

const ACTIVE: EventCard[] = [
  {
    id: 101,
    name: 'Концерт Jay Chou',
    date: 'через 3 дня, 19:00',
    remindAt: '2026-06-13T10:00',
    location: 'Mercedes-Benz Arena, Шанхай',
    price: '1 280 ¥',
    tickets: 2,
    daysLeft: 3,
  },
  {
    id: 102,
    name: 'Выставка «Искусство династии Тан»',
    date: 'через 10 дней, 10:00',
    remindAt: '2026-06-20T09:00',
    location: 'Шанхайский музей',
    price: '100 ¥',
    tickets: 1,
    daysLeft: 10,
  },
];

const FAVORITE: EventCard[] = [
  {
    id: 201,
    name: 'Фестиваль фонарей',
    date: '15.02.2026',
    remindAt: '2026-02-14T18:00',
    location: 'Сад Юйюань, Шанхай',
    price: 'Бесплатно',
  },
];

const ARCHIVE: EventCard[] = [
  {
    id: 301,
    name: 'Шанхайский кинофестиваль',
    date: '10.06.2025',
    remindAt: '2025-06-09T19:00',
    location: 'Shanghai Film Art Center',
    price: '80 ¥',
  },
];

const TABS = [
  { key: 'active', label: 'Активные события', count: ACTIVE.length },
  { key: 'favorite', label: 'Избранное', count: FAVORITE.length },
  { key: 'archive', label: 'Архив', count: ARCHIVE.length },
] as const;

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-2">
      <span className="text-sm text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => {
          onChange(!on);
        }}
        className={`relative h-6 w-11 rounded-full transition-colors ${on ? 'bg-brand' : 'bg-line'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>
    </label>
  );
}

function ReminderModal({ ev, onClose }: { ev: EventCard; onClose: () => void }) {
  const [when, setWhen] = useState(ev.remindAt);
  const [sms, setSms] = useState(false);
  const [app, setApp] = useState(true);
  const [mail, setMail] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        onClick={e => {
          e.stopPropagation();
        }}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold text-ink">Напоминание</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>
        <div className="space-y-4 px-5 py-5">
          <p className="text-sm text-muted">{ev.name}</p>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Дата и время</span>
            <input
              type="datetime-local"
              value={when}
              onChange={e => {
                setWhen(e.target.value);
              }}
              className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
            />
          </label>
          <div className="divide-y divide-line">
            <Toggle label="СМС" on={sms} onChange={setSms} />
            <Toggle label="В приложении" on={app} onChange={setApp} />
            <Toggle label="По почте" on={mail} onChange={setMail} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-line bg-surface/50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line bg-white px-4 py-2 text-sm text-ink hover:bg-surface"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({
  ev,
  tab,
  onRemind,
}: {
  ev: EventCard;
  tab: string;
  onRemind: (ev: EventCard) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="relative h-32 bg-gradient-to-br from-brand/80 to-accent">
        {typeof ev.daysLeft === 'number' && tab !== 'archive' && (
          <span className="absolute right-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-xs text-white">
            Осталось {ev.daysLeft} дн.
          </span>
        )}
      </div>
      <div className="space-y-1 p-4">
        <p className="font-semibold text-ink">{ev.name}</p>
        <p className="text-sm text-muted">📅 {ev.date}</p>
        <p className="text-sm text-muted">📍 {ev.location}</p>
        <div className="flex items-center justify-between gap-2 pt-2">
          <span className="font-medium text-ink">{ev.price}</span>
          <div className="flex items-center gap-2">
            {tab === 'active' && typeof ev.tickets === 'number' && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                Билетов: {ev.tickets}
              </span>
            )}
            {tab !== 'archive' && (
              <button
                type="button"
                onClick={() => {
                  onRemind(ev);
                }}
                className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink hover:bg-surface"
              >
                🔔 Напомнить
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [reminder, setReminder] = useState<EventCard | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Афиша</h1>

      <Tabs tabs={TABS}>
        {active => {
          const list = active === 'active' ? ACTIVE : active === 'favorite' ? FAVORITE : ARCHIVE;
          if (list.length === 0) {
            return (
              <EmptyState
                title={
                  active === 'active'
                    ? 'У вас нет купленных билетов.'
                    : active === 'favorite'
                      ? 'В избранном пока нет мероприятий.'
                      : 'Архив мероприятий пуст.'
                }
                action={{ label: 'Смотреть афишу', href: '/events' }}
              />
            );
          }
          return (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map(ev => (
                <Card key={ev.id} ev={ev} tab={active} onRemind={setReminder} />
              ))}
            </div>
          );
        }}
      </Tabs>

      <p className="text-center text-xs text-muted">
        Демонстрационные данные — билеты, wishlist и уведомления подключаются из раздела «Афиша».
      </p>

      {reminder && (
        <ReminderModal
          ev={reminder}
          onClose={() => {
            setReminder(null);
          }}
        />
      )}
    </div>
  );
}
