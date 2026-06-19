'use client';

import { Button } from '@china-ru/ui';
import { useEffect, useState } from 'react';

import { Link } from '@/i18n/navigation';
import { accountClient, ClientApiError, socialClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

import type { PostDto } from '@china-ru/shared';

/** Композер нового поста. Если у пользователя есть подтверждённая компания — можно постить от её лица. */
export function PostComposer({ onCreated }: { onCreated: (post: PostDto) => void }) {
  const { user, isHydrated } = useAuth();
  const [body, setBody] = useState('');
  const [asCompany, setAsCompany] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    void accountClient
      .getSeller()
      .then(seller => {
        if (!seller) return;
        if (seller.verifyStatus === 'verified') setCompanyName(seller.companyName);
      })
      .catch(() => {
        // нет компании — не ошибка
      });
  }, [user]);

  if (isHydrated && !user) {
    return (
      <div className="rounded-2xl border border-line bg-white p-5 text-sm text-muted">
        <Link href="/login" className="font-medium text-brand hover:underline">
          Войдите
        </Link>
        , чтобы публиковать посты в ленте сообщества.
      </div>
    );
  }

  const submit = async (): Promise<void> => {
    if (body.trim().length === 0) return;
    setStatus('sending');
    setError('');
    try {
      const post = await socialClient.createPost(body.trim(), asCompany);
      onCreated(post);
      setBody('');
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : 'Не удалось опубликовать пост');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-white p-5">
      <textarea
        rows={3}
        value={body}
        maxLength={5000}
        onChange={e => {
          setBody(e.target.value);
        }}
        placeholder="Поделитесь новостью, спросите совета, упомяните коллегу через @ID…"
        className="w-full resize-none rounded-lg border border-line px-3 py-2 outline-none focus:border-brand"
      />
      {error && <p className="text-sm text-brand">{error}</p>}
      <div className="flex items-center justify-between gap-3">
        {companyName ? (
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={asCompany}
              onChange={e => {
                setAsCompany(e.target.checked);
              }}
            />
            От лица компании «{companyName}»
          </label>
        ) : (
          <span className="text-xs text-muted">Ссылки на сторонние сайты и мат запрещены</span>
        )}
        <Button
          size="sm"
          disabled={status === 'sending' || body.trim().length === 0}
          onClick={() => {
            void submit();
          }}
        >
          Опубликовать
        </Button>
      </div>
    </div>
  );
}
