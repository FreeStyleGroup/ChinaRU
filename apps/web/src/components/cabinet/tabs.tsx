'use client';

import { useState, type ReactNode } from 'react';

export interface TabDef {
  key: string;
  label: string;
  count?: number;
}

/**
 * Лёгкие клиентские вкладки для разделов кабинета (подпись + опц. счётчик).
 * Контент каждой вкладки задаётся функцией render(activeKey).
 */
export function Tabs({
  tabs,
  children,
}: {
  tabs: readonly TabDef[];
  children: (active: string) => ReactNode;
}) {
  const [active, setActive] = useState(tabs[0]?.key ?? '');
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1 border-b border-line">
        {tabs.map(t => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setActive(t.key);
              }}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm transition-colors ${
                on
                  ? 'border-brand font-medium text-brand'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {t.label}
              {typeof t.count === 'number' && (
                <span
                  className={`rounded-full px-1.5 text-xs ${on ? 'bg-brand/10 text-brand' : 'bg-surface text-muted'}`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div>{children(active)}</div>
    </div>
  );
}

/** Единое пустое состояние раздела кабинета. */
export function EmptyState({
  title,
  action,
}: {
  title: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line p-12 text-center">
      <p className="text-muted">{title}</p>
      {action && (
        <a
          href={action.href}
          className="mt-4 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {action.label}
        </a>
      )}
    </div>
  );
}
