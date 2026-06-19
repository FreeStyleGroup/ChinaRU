'use client';

import { Button } from '@china-ru/ui';
import { useEffect, useState } from 'react';

import { socialClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

import { PostCard } from './post-card';
import { PostComposer } from './post-composer';

import type { PostDto } from '@china-ru/shared';

type Tab = 'all' | 'following';

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-brand text-white' : 'bg-surface text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

/** Лента сообщества: вкладки «Все/Подписки», композер, посты, догрузка. */
export function Feed({
  initial,
  mode = 'all',
}: {
  initial: { items: PostDto[]; totalPages: number };
  mode?: Tab;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>(mode);
  const [items, setItems] = useState<PostDto[]>(initial.items);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initial.totalPages);
  const [loading, setLoading] = useState(false);

  const load = async (which: Tab, nextPage: number): Promise<void> => {
    setLoading(true);
    try {
      const res =
        which === 'following'
          ? await socialClient.followingFeed(nextPage)
          : await socialClient.feed(nextPage);
      setItems(prev => (nextPage === 1 ? res.items : [...prev, ...res.items]));
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch {
      // лента недоступна — оставляем что есть
    } finally {
      setLoading(false);
    }
  };

  // Лента подписок грузится на клиенте (нет SSR-данных).
  useEffect(() => {
    if (mode === 'following' && user) void load('following', 1);
  }, [user, mode]);

  const switchTab = (t: Tab): void => {
    setTab(t);
    void load(t, 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <TabButton active={tab === 'all'} onClick={() => switchTab('all')}>
          Все
        </TabButton>
        {user && (
          <TabButton active={tab === 'following'} onClick={() => switchTab('following')}>
            Подписки
          </TabButton>
        )}
      </div>

      <PostComposer
        onCreated={post => {
          setItems(prev => [post, ...prev]);
        }}
      />

      {items.length === 0 && (
        <p className="rounded-2xl border border-line bg-white p-6 text-center text-sm text-muted">
          {tab === 'following'
            ? 'Здесь появятся посты тех, на кого вы подписаны.'
            : 'Постов пока нет — будьте первым!'}
        </p>
      )}

      {items.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onDeleted={id => {
            setItems(prev => prev.filter(p => p.id !== id));
          }}
        />
      ))}

      {page < totalPages && (
        <div className="text-center">
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => {
              void load(tab, page + 1);
            }}
          >
            {loading ? 'Загрузка…' : 'Показать ещё'}
          </Button>
        </div>
      )}
    </div>
  );
}
