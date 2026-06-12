import { Redis } from 'ioredis';

import type { Logger } from 'pino';

/** Кеш ключ→значение с TTL. Реализации: RedisCache (prod) и NoopCache (тесты/без Redis). */
export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

/** Заглушка: всегда промах. Используется, когда Redis не сконфигурирован. */
export class NoopCache implements Cache {
  async get<T>(): Promise<T | null> {
    return Promise.resolve(null);
  }
  async set(): Promise<void> {
    await Promise.resolve();
  }
  async del(): Promise<void> {
    await Promise.resolve();
  }
}

/** Redis-кеш с JSON-сериализацией. Ошибки кеша не валят запрос — логируются и игнорируются. */
export class RedisCache implements Cache {
  private readonly redis: Redis;

  constructor(
    url: string,
    private readonly logger: Logger
  ) {
    this.redis = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: true });
    this.redis.on('error', err => {
      this.logger.warn({ err }, 'Redis error');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      this.logger.warn({ err, key }, 'cache get failed');
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn({ err, key }, 'cache set failed');
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (err) {
      this.logger.warn({ err, key }, 'cache del failed');
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
