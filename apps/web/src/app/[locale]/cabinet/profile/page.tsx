'use client';

import { Button } from '@china-ru/ui';
import { useState } from 'react';

import { accountClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const submit = async (): Promise<void> => {
    setStatus('saving');
    try {
      const updated = await accountClient.updateProfile({
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setUser(updated);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-ink">Профиль</h1>
      <form
        className="space-y-4 rounded-2xl border border-line bg-white p-6"
        onSubmit={e => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">Email</span>
          <input
            value={user?.email ?? ''}
            disabled
            className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-muted"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">Имя</span>
          <input
            value={name}
            onChange={e => {
              setName(e.target.value);
            }}
            className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">Телефон</span>
          <input
            value={phone}
            onChange={e => {
              setPhone(e.target.value);
            }}
            className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
          />
        </label>
        {status === 'error' && <p className="text-sm text-brand">Не удалось сохранить</p>}
        {status === 'saved' && <p className="text-sm text-green-600">Сохранено</p>}
        <Button type="submit" disabled={status === 'saving'}>
          Сохранить
        </Button>
      </form>
    </div>
  );
}
