import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';

import type { AppConfig } from '../config';
import type { Logger } from 'pino';

/** Загруженный из хранилища файл (тело + MIME). */
export interface StoredFile {
  body: Buffer;
  contentType: string;
}

/**
 * Объектное хранилище файлов. Раздача идёт через прокси-роуты API (с проверкой
 * прав), поэтому интерфейс намеренно минимален: положить / прочитать / удалить.
 * Реализации взаимозаменяемы (как `Cache`): `MemoryStorage` для dev/тестов без
 * Docker, `S3Storage` (SeaweedFS или любое S3) в проде.
 */
export interface Storage {
  /** Идемпотентная подготовка (создание бакета). Безопасно вызывать многократно. */
  init(): Promise<void>;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Содержимое по ключу либо `null`, если объекта нет. */
  get(key: string): Promise<StoredFile | null>;
  delete(key: string): Promise<void>;
}

/** In-process хранилище (dev/тесты): файлы живут в памяти процесса. */
export class MemoryStorage implements Storage {
  private readonly objects = new Map<string, StoredFile>();

  init(): Promise<void> {
    return Promise.resolve();
  }

  put(key: string, body: Buffer, contentType: string): Promise<void> {
    this.objects.set(key, { body, contentType });
    return Promise.resolve();
  }

  get(key: string): Promise<StoredFile | null> {
    return Promise.resolve(this.objects.get(key) ?? null);
  }

  delete(key: string): Promise<void> {
    this.objects.delete(key);
    return Promise.resolve();
  }
}

/** S3-совместимое хранилище (SeaweedFS в проде). */
export class S3Storage implements Storage {
  private readonly client: S3Client;

  constructor(
    private readonly cfg: AppConfig['storage'],
    private readonly logger: Logger
  ) {
    const options: S3ClientConfig = {
      region: cfg.region,
      forcePathStyle: cfg.forcePathStyle,
      ...(cfg.endpoint ? { endpoint: cfg.endpoint } : {}),
      ...(cfg.accessKey && cfg.secretKey
        ? { credentials: { accessKeyId: cfg.accessKey, secretAccessKey: cfg.secretKey } }
        : {}),
    };
    this.client = new S3Client(options);
  }

  async init(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.cfg.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.cfg.bucket }));
        this.logger.info({ bucket: this.cfg.bucket }, 'storage: bucket created');
      } catch (createErr) {
        this.logger.error({ err: createErr }, 'storage: failed to ensure bucket');
      }
    }
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
  }

  async get(key: string): Promise<StoredFile | null> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.cfg.bucket, Key: key })
      );
      if (!res.Body) return null;
      const bytes = await res.Body.transformToByteArray();
      return { body: Buffer.from(bytes), contentType: res.ContentType ?? 'application/octet-stream' };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
  }
}

/** Выбирает реализацию хранилища по конфигу (`s3` → S3-совместимое, иначе память). */
export function createStorage(config: AppConfig, logger: Logger): Storage {
  if (config.storage.driver === 's3') return new S3Storage(config.storage, logger);
  return new MemoryStorage();
}
