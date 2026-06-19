'use client';

import { useEffect, useState } from 'react';

import { tenderClient } from '@/lib/api-client';

import { TenderNotice } from './tender-notice';
import { TenderWorkspace } from './tender-workspace';

import type { TenderDto } from '@china-ru/shared';

type State = { kind: 'loading' } | { kind: 'ready'; tender: TenderDto } | { kind: 'notfound' };

/**
 * Догружает тендер на клиенте (с куками) — нужно владельцу для просмотра своего
 * черновика, который анонимный SSR-запрос не отдаёт.
 */
export function TenderDetailClient({ id }: { id: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void tenderClient
      .get(id)
      .then(tender => {
        if (!cancelled) setState({ kind: 'ready', tender });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'notfound' });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.kind === 'loading') {
    return <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">Загрузка…</p>;
  }
  if (state.kind === 'notfound') {
    return (
      <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">
        Тендер не найден или ещё не опубликован.
      </p>
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <TenderNotice tender={state.tender} />
      <TenderWorkspace tender={state.tender} />
    </div>
  );
}
