import { ok, updateMenuSectionsSchema, updateProfileSchema } from '@china-ru/shared';

import { asyncHandler } from '../async-handler';
import { UnauthorizedError } from '../errors';

import type { AccountService } from '../../domain/account/account.service';
import type { RequestHandler } from 'express';

export interface AccountController {
  updateProfile: RequestHandler;
  updateMenu: RequestHandler;
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
  };
}
