import { err } from '@china-ru/shared';

import type { RequestHandler } from 'express';

/** 404 для неизвестных маршрутов — в том же конверте, что и остальные ответы. */
export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json(err('not_found', 'Маршрут не найден'));
};
