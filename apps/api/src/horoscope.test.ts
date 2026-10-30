import { createServer, type Server } from 'node:http';

import { type Database } from '@china-ru/db';
import { createTestDb } from '@china-ru/db/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from './app';
import { loadConfig } from './config';
import { createLogger } from './logger';

let db: Database;
let close: () => Promise<void>;
let server: Server;

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

describe('cabinet horoscope forecast', () => {
  it('requires a birthday, then returns the sign + daily facets', async () => {
    const agent = request.agent(server);
    await agent.post('/api/v1/auth/register').send({ pdConsent: true, email: 'horo@x.test', password: 'secret123' });

    // Без даты рождения — 400.
    const noBirthday = await agent.get('/api/v1/account/horoscope');
    expect(noBirthday.status).toBe(400);
    expect(noBirthday.body.error.code).toBe('birthday_required');

    // 1990 → год Лошади.
    await agent.patch('/api/v1/account/profile').send({ birthday: '1990-05-15' });
    const res = await agent.get('/api/v1/account/horoscope');
    expect(res.status).toBe(200);
    expect(res.body.data.sign.ru).toBe('Лошадь');
    expect(res.body.data.sign.key).toBe('horse');
    expect(typeof res.body.data.facets.love).toBe('string');
    expect(res.body.data.facets.love.length).toBeGreaterThan(0);
    // Без ключа ИИ — детерминированный прогноз.
    expect(res.body.data.generated).toBe(false);
  });
});
