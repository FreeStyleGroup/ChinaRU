'use client';

import { Button } from '@china-ru/ui';
import { useState } from 'react';

import { useRouter } from '@/i18n/navigation';
import { ClientApiError, jobClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

/** Кнопка отклика на вакансию: открывает поле сопроводительного письма, шлёт отклик. */
export function ApplyButton({ vacancyId }: { vacancyId: string }) {
  const { user, isHydrated } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [letter, setLetter] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  if (isHydrated && !user) {
    return (
      <Button
        onClick={() => {
          router.push('/login');
        }}
      >
        Войдите, чтобы откликнуться
      </Button>
    );
  }

  if (status === 'done') {
    return (
      <p className="rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
        ✓ Отклик отправлен
      </p>
    );
  }

  const send = async (): Promise<void> => {
    setStatus('sending');
    setError('');
    try {
      await jobClient.apply(vacancyId, letter.trim() || undefined);
      setStatus('done');
    } catch (e) {
      setStatus('error');
      setError(e instanceof ClientApiError ? e.message : 'Не удалось отправить отклик');
    }
  };

  if (!open) {
    return (
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Откликнуться
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-white p-4">
      <textarea
        rows={4}
        value={letter}
        onChange={e => {
          setLetter(e.target.value);
        }}
        placeholder="Сопроводительное письмо (необязательно)…"
        className="w-full resize-none rounded-lg border border-line px-3 py-2 outline-none focus:border-brand"
      />
      {status === 'error' && <p className="text-sm text-brand">{error}</p>}
      <div className="flex gap-2">
        <Button
          disabled={status === 'sending'}
          onClick={() => {
            void send();
          }}
        >
          Отправить отклик
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setOpen(false);
          }}
        >
          Отмена
        </Button>
      </div>
    </div>
  );
}
