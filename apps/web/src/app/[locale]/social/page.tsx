import { Container } from '@china-ru/ui';

import { Feed } from '@/components/social/feed';
import { Link } from '@/i18n/navigation';
import { socialApi } from '@/lib/api';

import type { PostDto } from '@china-ru/shared';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Сообщество China.ru — деловая B2B-лента',
  description:
    'Бизнес-лента China.ru: новости компаний и пользователей, поставщики, отзывы и обсуждения. Публикуйте посты, подписывайтесь на компании и коллег.',
};

const EMPTY = { items: [] as PostDto[], total: 0, page: 1, pageSize: 20, totalPages: 0 };

export default async function SocialPage() {
  const feed = await socialApi.feed().catch(() => EMPTY);

  return (
    <Container className="py-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-accent p-8 text-white sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
          Сообщество · B2B
        </p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold sm:text-4xl">Деловая лента China.ru</h1>
        <p className="mt-3 max-w-2xl text-white/85">
          Новости компаний и предпринимателей, поставщики, сделки и опыт. Публикуйте, обсуждайте,
          подписывайтесь и упоминайте коллег через @ID.
        </p>
        <Link
          href="/social/notifications"
          className="mt-4 inline-block text-sm font-medium text-white/90 underline-offset-4 hover:underline"
        >
          Мои уведомления →
        </Link>
      </section>

      <div className="mx-auto mt-6 max-w-2xl">
        <Feed initial={{ items: feed.items, totalPages: feed.totalPages }} />
      </div>
    </Container>
  );
}
