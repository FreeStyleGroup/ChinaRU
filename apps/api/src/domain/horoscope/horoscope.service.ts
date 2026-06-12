import { elementByYear, signByDate } from '@china-ru/shared';

import { BadRequestError, NotFoundError } from '../../http/errors';

import type { AiProvider } from '../../ai/factory';
import type { Cache } from '../../cache/cache';
import type { UserRepository } from '@china-ru/db';
import type { HoroscopeForecastDto, ZodiacSign } from '@china-ru/shared';

interface Facets {
  love: string;
  career: string;
  finance: string;
  health: string;
}

/**
 * Дневной прогноз гороскопа для кабинета: знак по дате рождения + текст от ИИ-провайдера
 * (с кешем на день; stub-прогноз, если ИИ не настроен). Провайдер абстрагирован —
 * переключение модели не затрагивает эту логику.
 */
export class HoroscopeService {
  constructor(
    private readonly users: UserRepository,
    private readonly ai: AiProvider,
    private readonly cache: Cache
  ) {}

  async getDailyForecast(userId: string): Promise<HoroscopeForecastDto> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('Пользователь не найден', 'user_not_found');
    if (!user.birthday) {
      throw new BadRequestError('Укажите дату рождения в профиле', 'birthday_required');
    }

    const [y, m, d] = user.birthday.split('-').map(Number);
    const sign = signByDate(d ?? 15, m ?? 6, y ?? 2000);
    const yearElement = y ? elementByYear(y) : sign.element;
    const date = new Date().toISOString().slice(0, 10);

    const cacheKey = `horoscope:${userId}:${date}`;
    const cached = await this.cache.get<HoroscopeForecastDto>(cacheKey);
    if (cached) return cached;

    const facets = this.ai.enabled
      ? await this.generate(sign, yearElement, date)
      : this.stub(sign);

    const result: HoroscopeForecastDto = {
      sign: { key: sign.key, ru: sign.ru, cn: sign.cn, emoji: sign.emoji, element: yearElement },
      date,
      facets,
      generated: this.ai.enabled,
    };
    await this.cache.set(cacheKey, result, 21_600);
    return result;
  }

  private async generate(sign: ZodiacSign, element: string, date: string): Promise<Facets> {
    const system = [
      'Ты — астролог китайского гороскопа. Дай короткий дневной прогноз.',
      'Ответь строго JSON-объектом с полями "love", "career", "finance", "health".',
      'Каждое поле — 1–2 предложения, по-русски, доброжелательно и конкретно. Без пояснений вне JSON.',
    ].join('\n');
    const user = `Знак: ${sign.ru} (${sign.cn}), стихия года: ${element}. Дата: ${date}.`;
    try {
      const out = await this.ai.chatJson<Partial<Facets>>({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.85,
        maxTokens: 700,
      });
      const fb = this.stub(sign);
      const pick = (v: string | undefined, fallback: string): string => {
        const t = v?.trim();
        return t && t.length > 0 ? t : fallback;
      };
      return {
        love: pick(out.love, fb.love),
        career: pick(out.career, fb.career),
        finance: pick(out.finance, fb.finance),
        health: pick(out.health, fb.health),
      };
    } catch {
      return this.stub(sign);
    }
  }

  /** Детерминированный демо-прогноз (стабилен), если ИИ недоступен. */
  private stub(sign: ZodiacSign): Facets {
    const love = [
      'День располагает к откровенному разговору — он сблизит вас с близким человеком.',
      'Прислушайтесь к интуиции в отношениях, сегодня она особенно точна.',
    ];
    const career = [
      'Хорошее время для инициативы: ваши идеи заметят и поддержат.',
      'Сосредоточьтесь на одной задаче — многозадачность сегодня рассеивает силы.',
    ];
    const finance = [
      'Удачный день для планирования бюджета и взвешенных покупок.',
      'Избегайте импульсивных трат — выгодное предложение появится позже.',
    ];
    const health = [
      'Энергии много — направьте её на активный отдых и прогулку.',
      'Уделите внимание режиму сна, тело скажет спасибо.',
    ];
    const seed = sign.order;
    const pick = (lines: string[]): string => lines[seed % lines.length] ?? lines[0] ?? '';
    return { love: pick(love), career: pick(career), finance: pick(finance), health: pick(health) };
  }
}
