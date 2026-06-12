import type { AiProvider, ChatOptions } from './provider';
import type { Logger } from 'pino';

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

/**
 * Реализация для любого OpenAI-совместимого endpoint (`/chat/completions` с
 * Bearer-токеном): AITunnel, OpenAI и большинство RU-прокси. ГигаЧат с его OAuth-
 * потоком получит отдельную реализацию того же интерфейса AiProvider.
 */
export class OpenAiCompatibleProvider implements AiProvider {
  readonly enabled = true;

  constructor(
    readonly name: string,
    private readonly config: { apiKey: string; baseUrl: string; model: string },
    private readonly logger: Logger
  ) {}

  async chat(opts: ChatOptions): Promise<string> {
    const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model ?? this.config.model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 2_500,
        ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error({ status: res.status, text }, 'AI request failed');
      throw new Error(`AI provider ${this.name} responded ${res.status}`);
    }
    const data = (await res.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      this.logger.error({ data }, 'AI response missing content');
      throw new Error('AI returned no content');
    }
    return content;
  }

  async chatJson<T>(opts: ChatOptions): Promise<T> {
    const raw = await this.chat({ ...opts, jsonMode: true });
    try {
      return JSON.parse(stripCodeFence(raw)) as T;
    } catch (err) {
      this.logger.error({ raw, err }, 'AI returned invalid JSON');
      throw new Error('AI returned invalid JSON');
    }
  }
}

/** Снимает обёртку ```json … ``` , если модель вернула fenced-блок. */
function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}
