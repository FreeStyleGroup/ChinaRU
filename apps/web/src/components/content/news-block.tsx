import { type ArticleCardDto, type ArticleSection } from '@china-ru/shared';

import { Link } from '@/i18n/navigation';
import { contentApi } from '@/lib/api';

/**
 * Переиспользуемый блок новостей внизу публичного раздела. У каждого большого
 * раздела (гороскоп, авто, акции, путешествия…) — свой агент Контент-завода,
 * чьи опубликованные статьи показываются здесь. Если статей нет — блок скрыт.
 */
export async function NewsBlock({
  section,
  title,
  limit = 4,
}: {
  section: ArticleSection;
  title: string;
  limit?: number;
}) {
  const list = await contentApi
    .articles({ section, limit })
    .catch(() => ({ items: [] as ArticleCardDto[], total: 0, page: 1, pageSize: limit, totalPages: 0 }));

  if (list.items.length === 0) return null;

  return (
    <section className="mt-10 rounded-3xl border-2 border-brand/30 bg-white p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink">{title}</h2>
        <Link
          href={`/articles?section=${section}`}
          className="text-sm font-medium text-brand hover:underline"
        >
          Все новости →
        </Link>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {list.items.map(a => (
          <NewsCard key={a.id} a={a} />
        ))}
      </div>
    </section>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso)
    .toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    .toUpperCase();
}

function NewsCard({ a }: { a: ArticleCardDto }) {
  return (
    <Link
      href={`/articles/${a.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface/40 transition-colors hover:border-brand"
    >
      <div className="flex h-32 items-center justify-center bg-brand/5">
        {a.coverImageUrl ? (
          <img src={a.coverImageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-4xl opacity-40">🔮</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {a.publishedAt && (
          <p className="text-[10px] font-medium tracking-wider text-muted">
            {formatDate(a.publishedAt)}
          </p>
        )}
        <p className="mt-1 line-clamp-2 font-semibold text-ink group-hover:text-brand">{a.title}</p>
        {a.excerpt && <p className="mt-1 line-clamp-3 text-xs text-muted">{a.excerpt}</p>}
      </div>
    </Link>
  );
}
