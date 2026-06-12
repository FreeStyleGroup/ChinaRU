import { ok } from '@china-ru/shared';

import { asyncHandler } from '../async-handler';
import { UnauthorizedError } from '../errors';

import type { ReferralService } from '../../domain/referral/referral.service';
import type { RequestHandler } from 'express';

export interface ReferralController {
  summary: RequestHandler;
}

export function createReferralController(deps: {
  referrals: ReferralService;
}): ReferralController {
  return {
    summary: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      res.json(ok(await deps.referrals.getSummary(req.auth.userId)));
    }),
  };
}
