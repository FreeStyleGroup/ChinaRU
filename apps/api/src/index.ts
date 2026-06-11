/**
 * @china-ru/api — REST API (Node 22 + Express): routes → controllers → services → repositories.
 * HTTP-сервер, middleware, auth и домены реализуются в фазе R3. Сейчас — health-нагрузка.
 */
import { ok } from '@china-ru/shared';

import type { ApiResponse } from '@china-ru/shared';

export interface HealthPayload {
  status: 'ok';
  service: 'api';
}

export function healthPayload(): ApiResponse<HealthPayload> {
  return ok({ status: 'ok', service: 'api' });
}
