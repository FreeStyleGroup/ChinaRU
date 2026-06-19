'use client';

import { Button, Container } from '@china-ru/ui';
import { useEffect, useState } from 'react';

import { Link } from '@/i18n/navigation';
import { notificationClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

import type { NotificationDto } from '@china-ru/shared';

const LABELS: Record<string, string> = {
  mention: 'Вас упомянули в публикации',
  follow: 'У вас новый подписчик',
  report: 'Новая жалоба — требуется модерация',
  order: 'Обновление по заказу',
  review: 'Новый отзыв',
  chat: 'Новое сообщение',
  system: 'Системное уведомление',
};

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  return new Date(iso).toLocaleDateString('ru-RU');
}

export default function NotificationsPage() {
  const { user, isHydrated } = useAuth();
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    void notificationClient
      .list()
      .then(res => {
        setItems(res.items);
      })
      .catch(() => {
        setItems([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  const markAll = async (): Promise<void> => {
    await notificationClient.markRead().catch(() => undefined);
    setItems(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
  };

  if (isHydrated && !user) {
    return (
      <Container className="py-10">
        <p className="text-muted">
          <Link href="/login" className="font-medium text-brand hover:underline">
            Войдите
          </Link>
          , чтобы видеть уведомления.
        </p>
      </Container>
    );
  }

  return (
    <Container className="max-w-2xl py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Уведомления</h1>
        {items.some(n => !n.readAt) && (
          <Button variant="outline" size="sm" onClick={() => void markAll()}>
            Отметить всё прочитанным
          </Button>
        )}
      </div>

      <div className="mt-5 space-y-2">
        {!loading && items.length === 0 && (
          <p className="rounded-2xl border border-line bg-white p-6 text-center text-sm text-muted">
            Уведомлений пока нет.
          </p>
        )}
        {items.map(n => (
          <div
            key={n.id}
            className={`rounded-xl border border-line p-4 ${n.readAt ? 'bg-white' : 'bg-surface'}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-ink">{LABELS[n.type] ?? n.type}</span>
              <span className="text-xs text-muted">{timeAgo(n.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>

      <Link href="/social" className="mt-6 inline-block text-sm text-muted hover:text-ink">
        ← К ленте сообщества
      </Link>
    </Container>
  );
}
