'use client';

import {
  TENDER_LAWS,
  TENDER_LAW_LABELS,
  TENDER_METHODS,
  TENDER_METHOD_LABELS,
  type TenderDto,
  type TenderLaw,
  type TenderMethod,
} from '@china-ru/shared';
import { Button } from '@china-ru/ui';
import { useState } from 'react';

import { tenderClient } from '@/lib/api-client';

import { TenderCard } from './tender-card';

type MethodFilter = TenderMethod | '';
type LawFilter = TenderLaw | '';

/** Реестр тендеров: фильтры (способ/закон/поиск) + список + догрузка. */
export function TendersBoard({ initial }: { initial: { items: TenderDto[]; totalPages: number } }) {
  const [items, setItems] = useState<TenderDto[]>(initial.items);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initial.totalPages);
  const [method, setMethod] = useState<MethodFilter>('');
  const [law, setLaw] = useState<LawFilter>('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (nextPage: number): Promise<void> => {
    setLoading(true);
    try {
      const res = await tenderClient.list({
        page: nextPage,
        ...(method ? { method } : {}),
        ...(law ? { law } : {}),
        ...(q.trim() ? { q: q.trim() } : {}),
      });
      setItems(prev => (nextPage === 1 ? res.items : [...prev, ...res.items]));
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch {
      // реестр недоступен — оставляем что есть
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (): void => {
    void load(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Способ
          <select
            value={method}
            onChange={e => {
              setMethod(e.target.value as MethodFilter);
            }}
            className="rounded-lg border border-line px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          >
            <option value="">Любой</option>
            {TENDER_METHODS.map(m => (
              <option key={m} value={m}>
                {TENDER_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Закон
          <select
            value={law}
            onChange={e => {
              setLaw(e.target.value as LawFilter);
            }}
            className="rounded-lg border border-line px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          >
            <option value="">Любой</option>
            {TENDER_LAWS.map(l => (
              <option key={l} value={l}>
                {TENDER_LAW_LABELS[l]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
          Поиск
          <input
            value={q}
            onChange={e => {
              setQ(e.target.value);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') applyFilters();
            }}
            placeholder="Название или предмет закупки"
            className="rounded-lg border border-line px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
        <Button size="sm" disabled={loading} onClick={applyFilters}>
          Найти
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-center text-sm text-muted">
          Тендеров по заданным условиям не найдено.
        </p>
      ) : (
        <div className="grid gap-3">
          {items.map(t => (
            <TenderCard key={t.id} tender={t} />
          ))}
        </div>
      )}

      {page < totalPages && (
        <div className="text-center">
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => {
              void load(page + 1);
            }}
          >
            {loading ? 'Загрузка…' : 'Показать ещё'}
          </Button>
        </div>
      )}
    </div>
  );
}
