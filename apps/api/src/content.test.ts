import { createServer, type Server } from 'node:http';

import { UserRepository, type Database } from '@china-ru/db';
import { createTestDb } from '@china-ru/db/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from './app';
import { loadConfig } from './config';
import { createLogger } from './logger';

let db: Database;
let close: () => Promise<void>;
let server: Server;

async function makeAdmin(email: string) {
  const agent = request.agent(server);
  const res = await agent.post('/api/v1/auth/register').send({ email, password: 'secret123' });
  const userId = (res.body as { data: { user: { id: string } } }).data.user.id;
  await new UserRepository(db).update(userId, { role: 'admin' });
  return agent;
}

beforeAll(async () => {
  const handle = await createTestDb();
  db = handle.db;
  close = handle.close;
  server = createServer(createApp({ db, config: loadConfig(), logger: createLogger('test') }));
  await new Promise<void>(resolve => {
    server.listen(0, resolve);
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close(err => (err ? reject(err) : resolve()));
  });
  await close();
});

describe('content factory', () => {
  it('configures an agent, generates a draft, publishes it → visible publicly', async () => {
    const admin = await makeAdmin('admin-content@x.test');

    // Агент раздела «Гороскоп».
    const upsert = await admin.put('/api/v1/admin/content/agents/horoscope').send({
      name: 'Астролог',
      persona: 'Ты — эксперт по китайскому гороскопу.',
      topics: ['Год Лошади 2026: что ждать'],
      enabled: true,
    });
    expect(upsert.status).toBe(200);
    expect(upsert.body.data.section).toBe('horoscope');

    const agents = await admin.get('/api/v1/admin/content/agents');
    expect(agents.body.data).toHaveLength(1);

    // Генерация статьи (stub-режим: ИИ не настроен) → черновик.
    const gen = await admin
      .post('/api/v1/admin/content/agents/horoscope/generate')
      .send({ topic: 'Совместимость Крысы и Дракона' });
    expect(gen.status).toBe(201);
    expect(gen.body.data.status).toBe('draft');
    expect(gen.body.data.source).toBe('ai');
    const articleId = gen.body.data.id as string;
    const slug = gen.body.data.slug as string;

    // Пока черновик — публично не виден.
    const before = await request(server).get('/api/v1/content/articles?section=horoscope');
    expect(before.body.data.items).toHaveLength(0);
    const hidden = await request(server).get(`/api/v1/content/articles/${slug}`);
    expect(hidden.status).toBe(404);

    // Публикация.
    const publish = await admin.post(`/api/v1/admin/content/articles/${articleId}/publish`);
    expect(publish.status).toBe(200);
    expect(publish.body.data.status).toBe('published');
    expect(publish.body.data.publishedAt).not.toBeNull();

    // Теперь видно в блоке новостей и по slug.
    const after = await request(server).get('/api/v1/content/articles?section=horoscope&limit=4');
    expect(after.body.data.items).toHaveLength(1);
    expect(after.body.data.items[0].slug).toBe(slug);

    const detail = await request(server).get(`/api/v1/content/articles/${slug}`);
    expect(detail.status).toBe(200);
    expect(typeof detail.body.data.body).toBe('string');

    // Фильтр другого раздела не возвращает горскоп-статью.
    const auto = await request(server).get('/api/v1/content/articles?section=auto');
    expect(auto.body.data.items).toHaveLength(0);
  });

  it('rejects generation for an unconfigured section and blocks non-admins', async () => {
    const admin = await makeAdmin('admin-content2@x.test');
    const noAgent = await admin.post('/api/v1/admin/content/agents/stocks/generate').send({});
    expect(noAgent.status).toBe(400);

    const anon = await request(server).put('/api/v1/admin/content/agents/auto').send({
      name: 'X',
      persona: 'Y',
    });
    expect(anon.status).toBe(401);
  });

  it('creates and publishes a manual article', async () => {
    const admin = await makeAdmin('admin-content3@x.test');
    const created = await admin.post('/api/v1/admin/content/articles').send({
      section: 'travel',
      title: 'Топ-5 направлений Китая 2026',
      body: '# Заголовок\n\nТекст статьи о путешествиях.',
      status: 'published',
    });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('published');

    const list = await request(server).get('/api/v1/content/articles?section=travel');
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0].title).toBe('Топ-5 направлений Китая 2026');
  });
});
