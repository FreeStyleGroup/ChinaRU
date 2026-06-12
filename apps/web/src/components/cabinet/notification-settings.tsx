'use client';

/**
 * Настройки уведомлений: о чём уведомлять и по каким каналам (В приложении / Почта / СМС).
 * Демо-состояние; реальное сохранение настроек подключается с модулем нотификаций.
 */
import { useState } from 'react';

const CHANNELS = ['app', 'email', 'sms'] as const;
type Channel = (typeof CHANNELS)[number];
const CHANNEL_LABEL: Record<Channel, string> = {
  app: 'В приложении',
  email: 'Почта',
  sms: 'СМС',
};

interface Category {
  key: string;
  label: string;
  defaults: Channel[];
}

const CATEGORIES: Category[] = [
  { key: 'orders', label: 'Заказы и доставка', defaults: ['app', 'email'] },
  { key: 'messages', label: 'Сообщения', defaults: ['app'] },
  { key: 'events', label: 'Афиша и события', defaults: ['app'] },
  { key: 'partners', label: 'Партнёрская программа', defaults: ['app', 'email'] },
  { key: 'promos', label: 'Акции и скидки', defaults: ['email'] },
  { key: 'news', label: 'Новости China.ru', defaults: [] },
];

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<Record<string, Set<Channel>>>(() =>
    Object.fromEntries(CATEGORIES.map(c => [c.key, new Set(c.defaults)]))
  );

  const toggle = (cat: string, ch: Channel): void => {
    setPrefs(prev => {
      const next = new Set(prev[cat] ?? []);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return { ...prev, [cat]: next };
    });
  };

  return (
    <div className="rounded-2xl border border-line bg-white p-6">
      <h2 className="text-lg font-semibold text-ink">Уведомления</h2>
      <p className="mt-1 text-sm text-muted">Выберите, о чём и куда вас уведомлять.</p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted">
              <th className="pb-2 text-left font-medium">Событие</th>
              {CHANNELS.map(ch => (
                <th key={ch} className="px-2 pb-2 text-center font-medium">
                  {CHANNEL_LABEL[ch]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {CATEGORIES.map(cat => (
              <tr key={cat.key}>
                <td className="py-2.5 pr-3 text-ink">{cat.label}</td>
                {CHANNELS.map(ch => (
                  <td key={ch} className="px-2 text-center">
                    <input
                      type="checkbox"
                      checked={prefs[cat.key]?.has(ch) ?? false}
                      onChange={() => {
                        toggle(cat.key, ch);
                      }}
                      className="h-4 w-4 cursor-pointer accent-brand"
                      aria-label={`${cat.label} — ${CHANNEL_LABEL[ch]}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted">
        Демонстрационные настройки — сохранение подключается с модулем уведомлений.
      </p>
    </div>
  );
}
