import {
  awardTenderSchema,
  cancelTenderSchema,
  createBidSchema,
  createTenderSchema,
  idSchema,
  myTenderListQuerySchema,
  ok,
  reviewBidSchema,
  tenderListQuerySchema,
  updateBidSchema,
  updateTenderSchema,
} from '@china-ru/shared';

import { asyncHandler } from '../async-handler';
import { UnauthorizedError } from '../errors';

import type { TenderService } from '../../domain/tenders/tender.service';
import type { RequestHandler } from 'express';

export interface TenderController {
  list: RequestHandler;
  get: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  publish: RequestHandler;
  closeBidding: RequestHandler;
  cancel: RequestHandler;
  award: RequestHandler;
  complete: RequestHandler;
  remove: RequestHandler;
  // заявки
  submitBid: RequestHandler;
  listBids: RequestHandler;
  myBidForTender: RequestHandler;
  updateBid: RequestHandler;
  withdrawBid: RequestHandler;
  reviewBid: RequestHandler;
  // кабинет
  myTenders: RequestHandler;
  myBids: RequestHandler;
}

export function createTenderController(deps: { tenders: TenderService }): TenderController {
  const { tenders } = deps;
  return {
    list: asyncHandler(async (req, res) => {
      const query = tenderListQuerySchema.parse(req.query);
      res.json(ok(await tenders.listTenders(query)));
    }),

    get: asyncHandler(async (req, res) => {
      const id = idSchema.parse(req.params.id);
      res.json(ok(await tenders.getTender(id, req.auth?.userId ?? null)));
    }),

    create: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const input = createTenderSchema.parse(req.body);
      res.status(201).json(ok(await tenders.createTender(req.auth.userId, input)));
    }),

    update: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      const input = updateTenderSchema.parse(req.body);
      res.json(ok(await tenders.updateTender(req.auth.userId, id, input)));
    }),

    publish: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      res.json(ok(await tenders.publishTender(req.auth.userId, id)));
    }),

    closeBidding: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      res.json(ok(await tenders.closeBidding(req.auth.userId, id)));
    }),

    cancel: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      const input = cancelTenderSchema.parse(req.body);
      res.json(ok(await tenders.cancelTender(req.auth.userId, id, input)));
    }),

    award: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      const input = awardTenderSchema.parse(req.body);
      res.json(ok(await tenders.awardTender(req.auth.userId, id, input)));
    }),

    complete: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      res.json(ok(await tenders.completeTender(req.auth.userId, id)));
    }),

    remove: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      await tenders.deleteTender(req.auth.userId, id);
      res.json(ok({ id }));
    }),

    submitBid: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      const input = createBidSchema.parse(req.body);
      res.status(201).json(ok(await tenders.submitBid(req.auth.userId, id, input)));
    }),

    listBids: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      res.json(ok(await tenders.listBids(req.auth.userId, id)));
    }),

    myBidForTender: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      res.json(ok(await tenders.getMyBidForTender(req.auth.userId, id)));
    }),

    updateBid: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      const input = updateBidSchema.parse(req.body);
      res.json(ok(await tenders.updateBid(req.auth.userId, id, input)));
    }),

    withdrawBid: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      res.json(ok(await tenders.withdrawBid(req.auth.userId, id)));
    }),

    reviewBid: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      const input = reviewBidSchema.parse(req.body);
      res.json(ok(await tenders.reviewBid(req.auth.userId, id, input)));
    }),

    myTenders: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const query = myTenderListQuerySchema.parse(req.query);
      res.json(ok(await tenders.listMyTenders(req.auth.userId, query)));
    }),

    myBids: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const query = myTenderListQuerySchema.parse(req.query);
      res.json(ok(await tenders.listMyBids(req.auth.userId, query)));
    }),
  };
}
