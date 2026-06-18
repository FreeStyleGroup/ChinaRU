import {
  adminPostListQuerySchema,
  createAdPostSchema,
  createCommentSchema,
  createPostSchema,
  feedQuerySchema,
  idSchema,
  ok,
} from '@china-ru/shared';

import { asyncHandler } from '../async-handler';
import { UnauthorizedError } from '../errors';

import type { SocialService } from '../../domain/social/social.service';
import type { RequestHandler } from 'express';

export interface SocialController {
  feed: RequestHandler;
  getPost: RequestHandler;
  createPost: RequestHandler;
  deletePost: RequestHandler;
  toggleLike: RequestHandler;
  listComments: RequestHandler;
  addComment: RequestHandler;
  deleteComment: RequestHandler;
  userFeed: RequestHandler;
  companyFeed: RequestHandler;
  // admin
  adminListPosts: RequestHandler;
  createAd: RequestHandler;
  hidePost: RequestHandler;
  unhidePost: RequestHandler;
}

export function createSocialController(deps: { social: SocialService }): SocialController {
  return {
    feed: asyncHandler(async (req, res) => {
      const query = feedQuerySchema.parse(req.query);
      res.json(ok(await deps.social.getFeed(query, req.auth?.userId ?? null)));
    }),

    getPost: asyncHandler(async (req, res) => {
      const id = idSchema.parse(req.params.id);
      res.json(ok(await deps.social.getPost(id, req.auth?.userId ?? null)));
    }),

    createPost: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const input = createPostSchema.parse(req.body);
      res.status(201).json(ok(await deps.social.createPost(req.auth.userId, input)));
    }),

    deletePost: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      await deps.social.deletePost(req.auth.userId, req.auth.role, id);
      res.json(ok({ id }));
    }),

    toggleLike: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      res.json(ok(await deps.social.toggleLike(req.auth.userId, id)));
    }),

    listComments: asyncHandler(async (req, res) => {
      const id = idSchema.parse(req.params.id);
      const query = feedQuerySchema.parse(req.query);
      res.json(ok(await deps.social.listComments(id, query)));
    }),

    addComment: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      const input = createCommentSchema.parse(req.body);
      res.status(201).json(ok(await deps.social.addComment(req.auth.userId, id, input)));
    }),

    deleteComment: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      await deps.social.deleteComment(req.auth.userId, req.auth.role, id);
      res.json(ok({ id }));
    }),

    userFeed: asyncHandler(async (req, res) => {
      const userId = idSchema.parse(req.params.userId);
      const query = feedQuerySchema.parse(req.query);
      res.json(ok(await deps.social.getAuthorFeed({ authorUserId: userId }, query, req.auth?.userId ?? null)));
    }),

    companyFeed: asyncHandler(async (req, res) => {
      const sellerId = idSchema.parse(req.params.sellerId);
      const query = feedQuerySchema.parse(req.query);
      res.json(ok(await deps.social.getAuthorFeed({ sellerId }, query, req.auth?.userId ?? null)));
    }),

    adminListPosts: asyncHandler(async (req, res) => {
      const query = adminPostListQuerySchema.parse(req.query);
      res.json(ok(await deps.social.adminListPosts(query)));
    }),

    createAd: asyncHandler(async (req, res) => {
      const input = createAdPostSchema.parse(req.body);
      res.status(201).json(ok(await deps.social.createAd(input)));
    }),

    hidePost: asyncHandler(async (req, res) => {
      const id = idSchema.parse(req.params.id);
      res.json(ok(await deps.social.setPostStatus(id, 'hidden')));
    }),

    unhidePost: asyncHandler(async (req, res) => {
      const id = idSchema.parse(req.params.id);
      res.json(ok(await deps.social.setPostStatus(id, 'published')));
    }),
  };
}
