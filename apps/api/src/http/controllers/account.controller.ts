import {
  createSellerProfileSchema,
  ok,
  setNicknameSchema,
  updateMenuSectionsSchema,
  updateProfileSchema,
} from '@china-ru/shared';

import { asyncHandler } from '../async-handler';
import { UnauthorizedError } from '../errors';

import type { AccountService } from '../../domain/account/account.service';
import type { RequestHandler } from 'express';

export interface AccountController {
  updateProfile: RequestHandler;
  updateMenu: RequestHandler;
  setNickname: RequestHandler;
  getSeller: RequestHandler;
  applySeller: RequestHandler;
  setSellerNickname: RequestHandler;
}

export function createAccountController(deps: { account: AccountService }): AccountController {
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
  };
}
