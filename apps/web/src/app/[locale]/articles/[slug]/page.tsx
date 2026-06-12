import { ARTICLE_SECTION_LABELS } from '@china-ru/shared';
import { Container } from '@china-ru/ui';
import { notFound } from 'next/navigation';

import { NewsBlock } from '@/components/content/news-block';
import { Link } from '@/i18n/navigation';
import { ApiError, contentApi } from '@/lib/api';

import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const a = await contentApi.article(slug);
    return {
      title: `${a.title} | China.ru`,
      ...(a.excerpt ? { description: a.excerpt } : {}),
    };
  } catch {
    return { title: 'Статья | China.ru' };
  }
}

/** Лёгкий рендер Markdown-подмножества (заголовки/списки/абзацы) без зависимостей. */
function renderBody(body: string): React.ReactNode {
  const blocks: React.ReactNode[] = [];
  const lines = body.replace(/\*\*/g, '').split('\n');
  let list: string[] = [];
  let key = 0;

  const flushList = (): void => {
    if (list.length === 0) return;
    const items = list;
    blocks.push(
      <ul key={`l${key++}`} className="my-3 list-disc space-y-1 pl-6 text-ink">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    );
    list = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') {
      flushList();
      continue;
    }
    if (line.startsWith('### ')) {
      flushList();
      blocks.push(
        <h3 key={`h${key++}`} className="mt-5 text-lg font-semibold text-ink">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith('## ')) {
      flushList();
      blocks.push(
        <h2 key={`h${key++}`} className="mt-6 text-xl font-bold text-ink">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('# ')) {
      flushList();
      blocks.push(
        <h2 key={`h${key++}`} className="mt-6 text-2xl font-bold text-ink">
          {line.slice(2)}
        </h2>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      list.push(line.slice(2));
    } else {
      flushList();
      blocks.push(
        <p key={`p${key++}`} className="my-3 leading-relaxed text-ink">
          {line}
        </p>
      );
    }
  }
  flushList();
  return blocks;
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await contentApi.article(slug).catch((e: unknown) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });

  const date = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <Container className="py-8">
      <Link
        href={`/articles?section=${article.section}`}
        className="text-sm text-muted hover:text-brand"
      >
        ← {ARTICLE_SECTION_LABELS[article.section].ru}
      </Link>

      <article className="mx-auto mt-4 max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          {ARTICLE_SECTION_LABELS[article.section].ru}
          {date ? ` · ${date}` : ''}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink sm:text-4xl">{article.title}</h1>
        {article.excerpt && <p className="mt-3 text-lg text-muted">{article.excerpt}</p>}

        {article.coverImageUrl && (
          <img
            src={article.coverImageUrl}
            alt=""
            className="mt-6 w-full rounded-2xl object-cover"
          />
        )}

        <div className="mt-6 text-[15px]">{renderBody(article.body)}</div>

        {article.authorName && (
          <p className="mt-8 border-t border-line pt-4 text-sm text-muted">
            Материал подготовлен: {article.authorName}
          </p>
        )}
      </article>

      <NewsBlock section={article.section} title="Читайте также" />
    </Container>
  );
}
