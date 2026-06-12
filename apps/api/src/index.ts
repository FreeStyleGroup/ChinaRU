/**
 * @china-ru/api — REST API (Node 22 + Express): routes → controllers → services → repositories.
 * Точка входа сервера — server.ts. Этот модуль реэкспортирует публичную поверхность
 * (фабрику приложения, конфиг) и хелпер health-нагрузки.
 */
import { ok } from '@china-ru/shared';

import type { ApiResponse } from '@china-ru/shared';

export { createApp } from './app';
export { createContainer } from './container';
export { loadConfig, ConfigError } from './config';
export type { AppConfig } from './config';

export interface HealthPayload {
  status: 'ok';
  service: 'api';
}

export function healthPayload(): ApiResponse<HealthPayload> {
  return ok({ status: 'ok', service: 'api' });
}
