import { OpenAiCompatibleProvider } from './openai-compatible';
import { StubAiProvider, type AiProvider } from './provider';

import type { AppConfig } from '../config';
import type { Logger } from 'pino';

/**
 * Выбирает реализацию ИИ-провайдера по конфигу. Нет ключа → StubAiProvider.
 * Новые провайдеры (например, ГигаЧат с OAuth) добавляются здесь — доменные сервисы
 * не меняются, так как зависят только от интерфейса AiProvider.
 */
export function createAiProvider(config: AppConfig, logger: Logger): AiProvider {
  if (!config.ai.enabled) {
    logger.warn('[AI] ключ не задан — Контент-завод и прогнозы работают в stub-режиме');
    return new StubAiProvider();
  }
  // aitunnel / openai / custom — все OpenAI-совместимые. gigachat пока тоже идёт
  // сюда (Bearer); при необходимости OAuth — отдельная реализация AiProvider.
  return new OpenAiCompatibleProvider(
    config.ai.provider,
    { apiKey: config.ai.apiKey, baseUrl: config.ai.baseUrl, model: config.ai.model },
    logger
  );
}

export type { AiProvider } from './provider';
