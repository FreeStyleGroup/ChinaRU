import {
  adminPostListQuerySchema,
  adminReportListQuerySchema,
  createAdPostSchema,
  createCommentSchema,
  createPostSchema,
  createReportSchema,
  feedQuerySchema,
  idSchema,
  ok,
  resolveReportSchema,
} from '@china-ru/shared';
import { z } from 'zod';

import { asyncHandler } from '../async-handler';
import { UnauthorizedError } from '../errors';

import type { ReportService } from '../../domain/social/report.service';
import type { SocialService } from '../../domain/social/social.service';
import type { RequestHandler } from 'express';

const publicIdSchema = z.coerce.number().int().positive();

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
  followingFeed: RequestHandler;
  followUser: RequestHandler;
  unfollowUser: RequestHandler;
  followCompany: RequestHandler;
  unfollowCompany: RequestHandler;
  resolveMention: RequestHandler;
  report: RequestHandler;
  // admin
  adminListPosts: RequestHandler;
  createAd: RequestHandler;
  hidePost: RequestHandler;
  unhidePost: RequestHandler;
  adminListReports: RequestHandler;
  resolveReport: RequestHandler;
}

export function createSocialController(deps: {
  social: SocialService;
  reports: ReportService;
}): SocialController {
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

    followingFeed: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const query = feedQuerySchema.parse(req.query);
      res.json(ok(await deps.social.getFollowingFeed(req.auth.userId, query)));
    }),

    followUser: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const userId = idSchema.parse(req.params.userId);
      res.json(ok(await deps.social.followUser(req.auth.userId, userId)));
    }),

    unfollowUser: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const userId = idSchema.parse(req.params.userId);
      res.json(ok(await deps.social.unfollowUser(req.auth.userId, userId)));
    }),

    followCompany: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const sellerId = idSchema.parse(req.params.sellerId);
      res.json(ok(await deps.social.followCompany(req.auth.userId, sellerId)));
    }),

    unfollowCompany: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const sellerId = idSchema.parse(req.params.sellerId);
      res.json(ok(await deps.social.unfollowCompany(req.auth.userId, sellerId)));
    }),

    resolveMention: asyncHandler(async (req, res) => {
      const publicId = publicIdSchema.parse(req.params.publicId);
      res.json(ok(await deps.social.resolveUserByPublicId(publicId)));
    }),

    report: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const input = createReportSchema.parse(req.body);
      res.status(201).json(ok(await deps.reports.create(req.auth.userId, input)));
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

    adminListReports: asyncHandler(async (req, res) => {
      const query = adminReportListQuerySchema.parse(req.query);
      res.json(ok(await deps.reports.adminList(query)));
    }),

    resolveReport: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      const input = resolveReportSchema.parse(req.body);
      res.json(ok(await deps.reports.resolve(req.auth.userId, id, input)));
    }),
  };
}
