import {
  ARTICLE_SECTION_LABELS,
  type ArticleCardDto,
  type ArticleSection,
} from '@china-ru/shared';
import { Container } from '@china-ru/ui';

import { Link } from '@/i18n/navigation';
import { contentApi } from '@/lib/api';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Новости и статьи — China.ru',
  description: 'Экспертные материалы портала: гороскоп, авто, акции Китая, путешествия и не только.',
};

function isSection(v: string | undefined): v is ArticleSection {
  return v !== undefined && v in ARTICLE_SECTION_LABELS;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function ArticleCard({ a }: { a: ArticleCardDto }) {
  return (
    <Link
      href={`/articles/${a.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-colors hover:border-brand"
    >
      <div className="flex h-40 items-center justify-center bg-brand/5">
        {a.coverImageUrl ? (
          <img src={a.coverImageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-5xl opacity-40">📰</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs text-muted">
          {ARTICLE_SECTION_LABELS[a.section].ru}
          {a.publishedAt ? ` · ${formatDate(a.publishedAt)}` : ''}
        </p>
        <p className="mt-1 font-semibold text-ink group-hover:text-brand">{a.title}</p>
        {a.excerpt && <p className="mt-2 line-clamp-3 text-sm text-muted">{a.excerpt}</p>}
      </div>
    </Link>
  );
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const sp = await searchParams;
  const section = isSection(sp.section) ? sp.section : undefined;

  const list = await contentApi
    .articles({ ...(section ? { section } : {}), limit: 24 })
    .catch(() => ({ items: [] as ArticleCardDto[], total: 0, page: 1, pageSize: 24, totalPages: 0 }));

  return (
    <Container className="py-8">
      <h1 className="text-3xl font-extrabold text-ink">
        {section ? ARTICLE_SECTION_LABELS[section].ru : 'Новости и статьи'}
      </h1>
      <p className="mt-1 text-muted">Экспертные материалы портала China.ru</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/articles"
          className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
            section ? 'border-line bg-white text-ink hover:border-brand' : 'border-brand bg-brand text-white'
          }`}
        >
          Все
        </Link>
        {(Object.keys(ARTICLE_SECTION_LABELS) as ArticleSection[]).map(key => {
          const active = key === section;
          return (
            <Link
              key={key}
              href={`/articles?section=${key}`}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                active ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink hover:border-brand'
              }`}
            >
              {ARTICLE_SECTION_LABELS[key].ru}
            </Link>
          );
        })}
      </div>

      {list.items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line p-12 text-center text-muted">
          Статей пока нет.
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.items.map(a => (
            <ArticleCard key={a.id} a={a} />
          ))}
        </div>
      )}
    </Container>
  );
}
