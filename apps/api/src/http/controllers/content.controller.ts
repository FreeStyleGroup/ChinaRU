import {
  articleListQuerySchema,
  articleSectionSchema,
  articleSlugSchema,
  createArticleSchema,
  generateArticleSchema,
  idSchema,
  ok,
  publicArticleQuerySchema,
  updateArticleSchema,
  upsertContentAgentSchema,
} from '@china-ru/shared';

import { asyncHandler } from '../async-handler';

import type { ContentService } from '../../domain/content/content.service';
import type { RequestHandler } from 'express';

export interface ContentController {
  /* публичное */
  listArticles: RequestHandler;
  getArticle: RequestHandler;
  /* админ */
  listAgents: RequestHandler;
  upsertAgent: RequestHandler;
  generate: RequestHandler;
  adminListArticles: RequestHandler;
  adminGetArticle: RequestHandler;
  createArticle: RequestHandler;
  updateArticle: RequestHandler;
  publishArticle: RequestHandler;
  archiveArticle: RequestHandler;
  deleteArticle: RequestHandler;
}

export function createContentController(deps: { content: ContentService }): ContentController {
  const { content } = deps;
  return {
    /* ── Публичное ── */
    listArticles: asyncHandler(async (req, res) => {
      const query = publicArticleQuerySchema.parse(req.query);
      res.json(ok(await content.listPublic(query)));
    }),

    getArticle: asyncHandler(async (req, res) => {
      const slug = articleSlugSchema.parse(req.params.slug);
      res.json(ok(await content.getPublicBySlug(slug)));
    }),

    /* ── Админ: агенты ── */
    listAgents: asyncHandler(async (_req, res) => {
      res.json(ok(await content.listAgents()));
    }),

    upsertAgent: asyncHandler(async (req, res) => {
      const section = articleSectionSchema.parse(req.params.section);
      const input = upsertContentAgentSchema.parse(req.body);
      res.json(ok(await content.upsertAgent(section, input)));
    }),

    generate: asyncHandler(async (req, res) => {
      const section = articleSectionSchema.parse(req.params.section);
      const input = generateArticleSchema.parse(req.body);
      res.status(201).json(ok(await content.generateArticle(section, input)));
    }),

    /* ── Админ: статьи ── */
    adminListArticles: asyncHandler(async (req, res) => {
      const query = articleListQuerySchema.parse(req.query);
      res.json(ok(await content.listArticles(query)));
    }),

    adminGetArticle: asyncHandler(async (req, res) => {
      const id = idSchema.parse(req.params.id);
      res.json(ok(await content.getArticle(id)));
    }),

    createArticle: asyncHandler(async (req, res) => {
      const input = createArticleSchema.parse(req.body);
      res.status(201).json(ok(await content.createArticle(input)));
    }),

    updateArticle: asyncHandler(async (req, res) => {
      const id = idSchema.parse(req.params.id);
      const input = updateArticleSchema.parse(req.body);
      res.json(ok(await content.updateArticle(id, input)));
    }),

    publishArticle: asyncHandler(async (req, res) => {
      const id = idSchema.parse(req.params.id);
      res.json(ok(await content.setStatus(id, 'published')));
    }),

    archiveArticle: asyncHandler(async (req, res) => {
      const id = idSchema.parse(req.params.id);
      res.json(ok(await content.setStatus(id, 'archived')));
    }),

    deleteArticle: asyncHandler(async (req, res) => {
      const id = idSchema.parse(req.params.id);
      res.json(ok(await content.deleteArticle(id)));
    }),
  };
}
