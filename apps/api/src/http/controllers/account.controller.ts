import {
  createSellerProfileSchema,
  markNotificationsReadSchema,
  notificationListQuerySchema,
  ok,
  setNicknameSchema,
  updateMenuSectionsSchema,
  updateProfileSchema,
} from '@china-ru/shared';

import { asyncHandler } from '../async-handler';
import { BadRequestError, UnauthorizedError } from '../errors';

import type { AccountService } from '../../domain/account/account.service';
import type { NotificationService } from '../../domain/account/notification.service';
import type { HoroscopeService } from '../../domain/horoscope/horoscope.service';
import type { RequestHandler } from 'express';

export interface AccountController {
  updateProfile: RequestHandler;
  updateMenu: RequestHandler;
  setNickname: RequestHandler;
  uploadAvatar: RequestHandler;
  getSeller: RequestHandler;
  applySeller: RequestHandler;
  setSellerNickname: RequestHandler;
  horoscope: RequestHandler;
  notifications: RequestHandler;
  notificationsUnread: RequestHandler;
  markNotificationsRead: RequestHandler;
}

export function createAccountController(deps: {
  account: AccountService;
  horoscope: HoroscopeService;
  notifications: NotificationService;
}): AccountController {
  return {
    updateProfile: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const input = updateProfileSchema.parse(req.body);
      res.json(ok(await deps.account.updateProfile(req.auth.userId, input)));
    }),

    updateMenu: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const input = updateMenuSectionsSchema.parse(req.body);
      res.json(ok(await deps.account.updateMenu(req.auth.userId, input)));
    }),

    setNickname: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const input = setNicknameSchema.parse(req.body);
      res.json(ok(await deps.account.setNickname(req.auth.userId, input)));
    }),

    uploadAvatar: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      if (!req.file) throw new BadRequestError('Файл не передан', 'file_required');
      res.json(ok(await deps.account.updateAvatar(req.auth.userId, req.file)));
    }),

    getSeller: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      res.json(ok(await deps.account.getSellerProfile(req.auth.userId)));
    }),

    applySeller: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const input = createSellerProfileSchema.parse(req.body);
      res.json(ok(await deps.account.applySeller(req.auth.userId, input)));
    }),

    setSellerNickname: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const input = setNicknameSchema.parse(req.body);
      res.json(ok(await deps.account.setSellerNickname(req.auth.userId, input)));
    }),

    horoscope: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      res.json(ok(await deps.horoscope.getDailyForecast(req.auth.userId)));
    }),

    notifications: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const query = notificationListQuerySchema.parse(req.query);
      res.json(ok(await deps.notifications.list(req.auth.userId, query)));
    }),

    notificationsUnread: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      res.json(ok(await deps.notifications.unreadCount(req.auth.userId)));
    }),

    markNotificationsRead: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const input = markNotificationsReadSchema.parse(req.body);
      res.json(ok(await deps.notifications.markRead(req.auth.userId, input)));
    }),
  };
}
