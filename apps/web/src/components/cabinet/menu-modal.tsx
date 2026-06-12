'use client';

import { CABINET_SECTIONS } from '@china-ru/shared';
import { Button } from '@china-ru/ui';
import { useState } from 'react';


import { accountClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

import { NavIcon } from './nav-icon';

const OPTIONAL = CABINET_SECTIONS.filter(s => !s.pinned);

export function CabinetMenuModal({ onClose }: { onClose: () => void }) {
  const { user, setUser } = useAuth();
  const [selected, setSelected] = useState<Set<string>>(new Set(user?.menuSections ?? []));
  const [saving, setSaving] = useState(false);

  const toggle = (key: string): void => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      const updated = await accountClient.updateMenu([...selected]);
      setUser(updated);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={e => {
          e.stopPropagation();
        }}
      >
        <h2 className="text-lg font-bold text-ink">Настройка меню</h2>
        <p className="mt-1 text-sm text-muted">
          Выберите дополнительные разделы, которые будут отображаться в вашем меню. Основные разделы
          закреплены.
        </p>
        <div className="mt-4 space-y-2">
          {OPTIONAL.map(s => {
            const on = selected.has(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  toggle(s.key);
                }}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                  on ? 'border-brand bg-brand/5' : 'border-line hover:bg-surface'
                }`}
              >
                <span className="flex items-center gap-3 text-sm text-ink">
                  <span className="text-muted">
                    <NavIcon section={s.key} />
                  </span>
                  {s.titleRu}
                </span>
                <span
                  className={`relative h-5 w-9 rounded-full transition-colors ${on ? 'bg-brand' : 'bg-line'}`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-4.5' : 'left-0.5'}`}
                  />
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            disabled={saving}
            onClick={() => {
              void save();
            }}
          >
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
}
