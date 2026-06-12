import {
  ARTICLE_SECTION_LABELS,
  ARTICLE_STATUS_LABELS,
  type ArticleDto,
  type ArticleSection,
  type ContentAgentDto,
} from '@china-ru/shared';
import { Badge, Button } from '@china-ru/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { DataTable, type Column } from '@/components/data-table';
import { api } from '@/lib/api';

const SECTIONS = Object.keys(ARTICLE_SECTION_LABELS) as ArticleSection[];

interface AgentDraft {
  name: string;
  persona: string;
  model: string;
  topics: string;
  enabled: boolean;
}

const EMPTY_DRAFT: AgentDraft = { name: '', persona: '', model: '', topics: '', enabled: true };

function draftFrom(agent: ContentAgentDto | undefined, section: ArticleSection): AgentDraft {
  if (!agent) return { ...EMPTY_DRAFT, name: `Агент · ${ARTICLE_SECTION_LABELS[section].ru}` };
  return {
    name: agent.name,
    persona: agent.persona,
    model: agent.model ?? '',
    topics: agent.topics.join('\n'),
    enabled: agent.enabled,
  };
}

export function ContentFactoryPage() {
  const queryClient = useQueryClient();
  const [section, setSection] = useState<ArticleSection>('horoscope');
  const [draft, setDraft] = useState<AgentDraft>(EMPTY_DRAFT);
  const [topic, setTopic] = useState('');

  const agentsQuery = useQuery({ queryKey: ['content-agents'], queryFn: () => api.contentAgents() });
  const agent = agentsQuery.data?.find(a => a.section === section);

  useEffect(() => {
    setDraft(draftFrom(agent, section));
    setTopic('');
    // перезагружаем черновик при смене раздела или прихода данных
  }, [section, agent]);

  const saveAgent = useMutation({
    mutationFn: () =>
      api.upsertAgent(section, {
        name: draft.name.trim(),
        persona: draft.persona.trim(),
        topics: draft.topics
          .split('\n')
          .map(t => t.trim())
          .filter(Boolean),
        enabled: draft.enabled,
        ...(draft.model.trim() ? { model: draft.model.trim() } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content-agents'] });
    },
  });

  const generate = useMutation({
    mutationFn: () => api.generateArticle(section, topic.trim() ? { topic: topic.trim() } : {}),
    onSuccess: () => {
      setTopic('');
      void queryClient.invalidateQueries({ queryKey: ['content-articles'] });
    },
  });

  const articlesQuery = useQuery({
    queryKey: ['content-articles', section],
    queryFn: () => api.articles({ section, pageSize: 50 }),
  });

  const articleMut = useMutation({
    mutationFn: async (vars: { id: string; action: 'publish' | 'archive' | 'delete' }) => {
      if (vars.action === 'publish') await api.publishArticle(vars.id);
      else if (vars.action === 'archive') await api.archiveArticle(vars.id);
      else await api.deleteArticle(vars.id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content-articles'] });
    },
  });

  const columns: Column<ArticleDto>[] = [
    {
      header: 'Заголовок',
      cell: a => (
        <div>
          <p className="font-medium text-ink">{a.title}</p>
          {a.excerpt && <p className="line-clamp-1 text-xs text-muted">{a.excerpt}</p>}
        </div>
      ),
    },
    { header: 'Источник', cell: a => (a.source === 'ai' ? '🤖 ИИ' : '✍ Вручную') },
    { header: 'Статус', cell: a => <Badge>{ARTICLE_STATUS_LABELS[a.status] ?? a.status}</Badge> },
    {
      header: 'Действия',
      cell: a => (
        <div className="flex gap-2">
          {a.status !== 'published' && (
            <Button
              size="sm"
              disabled={articleMut.isPending}
              onClick={() => {
                articleMut.mutate({ id: a.id, action: 'publish' });
              }}
            >
              Опубликовать
            </Button>
          )}
          {a.status === 'published' && (
            <Button
              size="sm"
              variant="outline"
              disabled={articleMut.isPending}
              onClick={() => {
                articleMut.mutate({ id: a.id, action: 'archive' });
              }}
            >
              В архив
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={articleMut.isPending}
            onClick={() => {
              if (window.confirm('Удалить статью?')) articleMut.mutate({ id: a.id, action: 'delete' });
            }}
          >
            Удалить
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Контент завод</h1>
        <p className="text-sm text-muted">
          У каждого раздела — свой ИИ-агент, который пишет статьи только по своей теме. Статьи
          проходят модерацию и выводятся в блоке новостей внизу раздела.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Разделы */}
        <nav className="space-y-1">
          {SECTIONS.map(s => {
            const has = agentsQuery.data?.some(a => a.section === s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSection(s);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  s === section ? 'bg-brand/10 font-medium text-brand' : 'text-muted hover:bg-surface'
                }`}
              >
                {ARTICLE_SECTION_LABELS[s].ru}
                <span
                  className={`h-2 w-2 rounded-full ${has ? 'bg-green-500' : 'bg-line'}`}
                  title={has ? 'Агент настроен' : 'Агент не настроен'}
                />
              </button>
            );
          })}
        </nav>

        {/* Редактор агента + генерация */}
        <div className="space-y-6">
          <section className="space-y-4 rounded-2xl border border-line bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-ink">
                Агент раздела «{ARTICLE_SECTION_LABELS[section].ru}»
              </h2>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={e => {
                    setDraft({ ...draft, enabled: e.target.checked });
                  }}
                />
                Активен
              </label>
            </div>

            <Field label="Название агента">
              <input
                value={draft.name}
                onChange={e => {
                  setDraft({ ...draft, name: e.target.value });
                }}
                className="h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
              />
            </Field>

            <Field label="Персона / системный промпт (тема и стиль агента)">
              <textarea
                rows={6}
                value={draft.persona}
                onChange={e => {
                  setDraft({ ...draft, persona: e.target.value });
                }}
                placeholder="Ты — эксперт по китайскому гороскопу. Пишешь точные, увлекательные статьи строго по теме восточной астрологии…"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Модель (пусто → дефолт провайдера)">
                <input
                  value={draft.model}
                  onChange={e => {
                    setDraft({ ...draft, model: e.target.value });
                  }}
                  placeholder="gpt-4o-mini"
                  className="h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                />
              </Field>
            </div>

            <Field label="Темы-затравки (по одной на строку)">
              <textarea
                rows={5}
                value={draft.topics}
                onChange={e => {
                  setDraft({ ...draft, topics: e.target.value });
                }}
                placeholder={'Год Лошади 2026: что ждать\nСовместимость Крысы и Дракона'}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </Field>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={saveAgent.isPending || !draft.name.trim() || !draft.persona.trim()}
                onClick={() => {
                  saveAgent.mutate();
                }}
              >
                {agent ? 'Сохранить агента' : 'Создать агента'}
              </Button>
              {saveAgent.isSuccess && <span className="text-sm text-green-600">Сохранено</span>}
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-line bg-white p-5">
            <h2 className="font-semibold text-ink">Сгенерировать статью</h2>
            <p className="text-sm text-muted">
              Тема необязательна — агент возьмёт случайную из затравок. Статья создаётся как
              черновик на модерации.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                value={topic}
                onChange={e => {
                  setTopic(e.target.value);
                }}
                placeholder="Тема статьи (необязательно)"
                className="h-10 min-w-[260px] flex-1 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
              />
              <Button
                disabled={generate.isPending || !agent?.enabled}
                onClick={() => {
                  generate.mutate();
                }}
              >
                {generate.isPending ? 'Генерация…' : 'Сгенерировать'}
              </Button>
            </div>
            {!agent && <p className="text-sm text-amber-600">Сначала настройте и сохраните агента.</p>}
            {generate.isError && (
              <p className="text-sm text-red-600">Не удалось сгенерировать: проверьте настройки ИИ.</p>
            )}
            {generate.isSuccess && (
              <p className="text-sm text-green-600">Черновик создан — ниже в списке статей.</p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-ink">
              Статьи раздела «{ARTICLE_SECTION_LABELS[section].ru}»
            </h2>
            {articlesQuery.isLoading ? (
              <p className="text-muted">Загрузка…</p>
            ) : (
              <DataTable
                columns={columns}
                rows={articlesQuery.data?.items ?? []}
                rowKey={a => a.id}
                empty="Статей в разделе пока нет"
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}
