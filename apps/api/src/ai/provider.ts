/**
 * Провайдеро-агностичный контракт ИИ. Сервисы (Контент-завод, прогнозы гороскопа)
 * зависят ТОЛЬКО от этого интерфейса — конкретная модель (AITunnel / ГигаЧат / др.)
 * подставляется в композиционном корне. Переключить провайдера = сменить реализацию,
 * не трогая доменную логику.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Просить ответ строго JSON-объектом (response_format). */
  jsonMode?: boolean;
}

export interface AiProvider {
  /** Настроен ли живой провайдер (есть ключ). false → stub-режим. */
  readonly enabled: boolean;
  /** Имя провайдера (для логов/диагностики). */
  readonly name: string;
  chat(opts: ChatOptions): Promise<string>;
  chatJson<T>(opts: ChatOptions): Promise<T>;
}

/**
 * Stub-провайдер: используется, когда ключ ИИ не задан (dev/тесты). Возвращает
 * детерминированные шаблонные ответы, чтобы флоу проходил без живого ИИ.
 */
export class StubAiProvider implements AiProvider {
  readonly enabled = false;
  readonly name = 'stub';

  chat(opts: ChatOptions): Promise<string> {
    const lastUser = [...opts.messages].reverse().find(m => m.role === 'user');
    return Promise.resolve(`[stub] ИИ не настроен. Запрос: ${lastUser?.content.slice(0, 80) ?? ''}`);
  }

  chatJson<T>(_opts: ChatOptions): Promise<T> {
    return Promise.resolve({} as T);
  }
}
