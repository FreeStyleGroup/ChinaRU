'use client';

/**
 * Социальная сеть в кабинете — живая лента «по подпискам» поверх общего движка
 * (тот же компонент Feed, что и публичный раздел /social).
 */
import { Feed } from '@/components/social/feed';
import { Link } from '@/i18n/navigation';

export default function SocialPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Социальная сеть</h1>
        <Link href="/social" className="text-sm text-brand hover:underline">
          Вся лента →
        </Link>
      </div>
      <Feed initial={{ items: [], totalPages: 1 }} mode="following" />
    </div>
  );
}
