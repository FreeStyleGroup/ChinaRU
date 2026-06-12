import { paginate, slugify } from '@china-ru/shared';

import { BadRequestError, NotFoundError } from '../../http/errors';
import {
  toArticleCardDto,
  toArticleDto,
  toArticlePublicDto,
  toContentAgentDto,
} from '../dto';

import type { AiProvider } from '../../ai/factory';
import type { ArticleRepository, ContentAgentRepository } from '@china-ru/db';
import type {
  ArticleCardDto,
  ArticleDto,
  ArticleListQuery,
  ArticlePublicDto,
  ArticleSection,
  ContentAgentDto,
  CreateArticleInput,
  GenerateArticleInput,
  Paginated,
  PublicArticleQuery,
  UpsertContentAgentInput,
  UpdateArticleInput,
} from '@china-ru/shared';

/** Структура, которую агент возвращает JSON-объектом. */
interface GeneratedArticle {
  title?: string;
  excerpt?: string;
  body?: string;
  imagePrompt?: string;
}

/**
 * Контент-завод: управление ИИ-агентами разделов и их статьями (генерация через
 * провайдеро-агностичный AiProvider, модерация draft→published, публичная выдача
 * для блоков новостей). Каждый агент пишет строго по своей теме.
 */
export class ContentService {
  constructor(
    private readonly agents: ContentAgentRepository,
    private readonly articles: ArticleRepository,
    private readonly ai: AiProvider
  ) {}

  /* ── Агенты ── */

  async listAgents(): Promise<ContentAgentDto[]> {
    const rows = await this.agents.list();
    return rows.map(toContentAgentDto);
  }

  async upsertAgent(
    section: ArticleSection,
    input: UpsertContentAgentInput
  ): Promise<ContentAgentDto> {
    const agent = await this.agents.upsert(section, {
      name: input.name,
      persona: input.persona,
      topics: input.topics,
      enabled: input.enabled,
      ...(input.model !== undefined ? { model: input.model } : {}),
    });
    return toContentAgentDto(agent);
  }

  /* ── Генерация статьи агентом ── */

  async generateArticle(
    section: ArticleSection,
    input: GenerateArticleInput
  ): Promise<ArticleDto> {
    const agent = await this.agents.findBySection(section);
    if (!agent) {
      throw new BadRequestError('Агент раздела не настроен', 'agent_not_configured');
    }
    if (!agent.enabled) {
      throw new BadRequestError('Агент раздела отключён', 'agent_disabled');
    }

    const topic = input.topic ?? this.pickTopic(agent.topics) ?? agent.name;
    const generated = this.ai.enabled
      ? await this.runAgent(agent.persona, agent.model, topic)
      : this.stubArticle(topic);

    const title = (generated.title ?? topic).trim().slice(0, 300) || topic;
    const body = (generated.body ?? '').trim() || `Статья по теме «${topic}» (черновик).`;
    const excerpt = (generated.excerpt ?? '').trim().slice(0, 1000) || null;
    const imagePrompt = (generated.imagePrompt ?? '').trim().slice(0, 1000) || null;

    const created = await this.articles.create({
      section,
      agentId: agent.id,
      slug: await this.uniqueSlug(title),
      title,
      body,
      excerpt,
      imagePrompt,
      status: 'draft',
      source: 'ai',
      authorName: agent.name,
    });
    return toArticleDto(created);
  }

  private async runAgent(
    persona: string,
    model: string | null,
    topic: string
  ): Promise<GeneratedArticle> {
    const system = [
      persona,
      '',
      'Ты пишешь статьи СТРОГО по своей теме. Формат ответа — JSON-объект с полями:',
      '"title" (заголовок до 90 символов), "excerpt" (анонс 1–2 предложения),',
      '"body" (статья 500–900 слов в Markdown, с подзаголовками),',
      '"imagePrompt" (промпт для обложки на английском).',
      'Пиши по-русски, экспертно, без воды. Только валидный JSON, без пояснений.',
    ].join('\n');
    return this.ai.chatJson<GeneratedArticle>({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `Тема статьи: ${topic}` },
      ],
      ...(model ? { model } : {}),
      temperature: 0.8,
      maxTokens: 3_000,
    });
  }

  /** Детерминированный черновик, когда ИИ не настроен (dev/тесты). */
  private stubArticle(topic: string): GeneratedArticle {
    return {
      title: topic,
      excerpt: `Черновик статьи по теме «${topic}». Подключите ИИ-провайдера для генерации.`,
      body: `# ${topic}\n\nЧерновик статьи. Текст будет сгенерирован ИИ-агентом раздела после настройки провайдера (AI_API_KEY).`,
      imagePrompt: topic,
    };
  }

  private pickTopic(topics: string[]): string | null {
    if (topics.length === 0) return null;
    return topics[Math.floor(Math.random() * topics.length)] ?? topics[0] ?? null;
  }

  private async uniqueSlug(title: string): Promise<string> {
    const base = slugify(title) || 'article';
    if (!(await this.articles.slugExists(base))) return base;
    for (let i = 2; i < 1000; i++) {
      const candidate = `${base}-${i}`;
      if (!(await this.articles.slugExists(candidate))) return candidate;
    }
    return `${base}-${Date.now()}`;
  }

  /* ── Статьи (админ) ── */

  async listArticles(query: ArticleListQuery): Promise<Paginated<ArticleDto>> {
    const { rows, total } = await this.articles.list({
      page: query.page,
      limit: query.pageSize,
      ...(query.section ? { section: query.section } : {}),
      ...(query.status ? { status: query.status } : {}),
    });
    return paginate(rows.map(toArticleDto), total, { page: query.page, pageSize: query.pageSize });
  }

  async getArticle(id: string): Promise<ArticleDto> {
    const found = await this.articles.findById(id);
    if (!found) throw new NotFoundError('Статья не найдена', 'article_not_found');
    return toArticleDto(found);
  }

  async createArticle(input: CreateArticleInput): Promise<ArticleDto> {
    const status = input.status ?? 'draft';
    const created = await this.articles.create({
      section: input.section,
      slug: await this.uniqueSlug(input.title),
      title: input.title,
      body: input.body,
      excerpt: input.excerpt ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
      status,
      source: 'manual',
      publishedAt: status === 'published' ? new Date() : null,
    });
    return toArticleDto(created);
  }

  async updateArticle(id: string, input: UpdateArticleInput): Promise<ArticleDto> {
    const existing = await this.articles.findById(id);
    if (!existing) throw new NotFoundError('Статья не найдена', 'article_not_found');
    const publishedAt =
      input.status === 'published' && existing.publishedAt === null
        ? new Date()
        : existing.publishedAt;
    const updated = await this.articles.update(id, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.excerpt !== undefined ? { excerpt: input.excerpt } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.coverImageUrl !== undefined ? { coverImageUrl: input.coverImageUrl } : {}),
      ...(input.status !== undefined ? { status: input.status, publishedAt } : {}),
    });
    if (!updated) throw new NotFoundError('Статья не найдена', 'article_not_found');
    return toArticleDto(updated);
  }

  async setStatus(id: string, status: 'published' | 'archived' | 'draft'): Promise<ArticleDto> {
    const existing = await this.articles.findById(id);
    if (!existing) throw new NotFoundError('Статья не найдена', 'article_not_found');
    const publishedAt =
      status === 'published' ? (existing.publishedAt ?? new Date()) : existing.publishedAt;
    const updated = await this.articles.update(id, { status, publishedAt });
    if (!updated) throw new NotFoundError('Статья не найдена', 'article_not_found');
    return toArticleDto(updated);
  }

  async deleteArticle(id: string): Promise<{ deleted: boolean }> {
    const ok = await this.articles.softDelete(id);
    if (!ok) throw new NotFoundError('Статья не найдена', 'article_not_found');
    return { deleted: true };
  }

  /* ── Публичная выдача (блок новостей, /articles) ── */

  async listPublic(query: PublicArticleQuery): Promise<Paginated<ArticleCardDto>> {
    const limit = query.limit ?? query.pageSize;
    const { rows, total } = await this.articles.listPublished({
      page: query.page,
      limit,
      ...(query.section ? { section: query.section } : {}),
    });
    return paginate(rows.map(toArticleCardDto), total, { page: query.page, pageSize: limit });
  }

  async getPublicBySlug(slug: string): Promise<ArticlePublicDto> {
    const found = await this.articles.findPublishedBySlug(slug);
    if (!found) throw new NotFoundError('Статья не найдена', 'article_not_found');
    return toArticlePublicDto(found);
  }
}
