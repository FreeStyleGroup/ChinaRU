import { createServer, type Server } from 'node:http';

import { UserRepository, type Database } from '@china-ru/db';
import { createTestDb } from '@china-ru/db/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from './app';
import { loadConfig } from './config';
import { createLogger } from './logger';

import type { Mailer } from './domain/auth/mailer';

/** Транспорт писем для теста: запоминает токен подтверждения вместо отправки. */
class CapturingMailer implements Mailer {
  readonly tokens = new Map<string, string>();

  async sendVerificationEmail(msg: { to: string; token: string }): Promise<void> {
    this.tokens.set(msg.to, msg.token);
    await Promise.resolve();
  }

  async sendPasswordResetEmail(): Promise<void> {
    await Promise.resolve();
  }
}

let db: Database;
let close: () => Promise<void>;
let server: Server;
const mailer = new CapturingMailer();

beforeAll(async () => {
  const handle = await createTestDb();
  db = handle.db;
  close = handle.close;
  server = createServer(createApp({ db, config: loadConfig(), logger: createLogger('test'), mailer }));
  await new Promise<void>(resolve => {
    server.listen(0, resolve);
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close(err => {
      if (err) reject(err);
      else resolve();
    });
  });
  await close();
});

describe('подтверждение почты', () => {
  it('переводит учётку из «ожидает подтверждения» в активные', async () => {
    const email = 'verify-me@x.test';
    const reg = await request(server)
      .post('/api/v1/auth/register')
      .send({ pdConsent: true, email, password: 'secret12345', name: 'Тест' });
    expect(reg.status).toBe(201);

    const users = new UserRepository(db);
    expect((await users.findByEmail(email))?.status).toBe('pending_verify');

    const token = mailer.tokens.get(email);
    expect(token).toBeTruthy();
    const res = await request(server).post('/api/v1/auth/verify-email').send({ token });
    expect(res.status).toBeLessThan(300);

    const after = await users.findByEmail(email);
    expect(after?.status).toBe('active');
    expect(after?.emailVerifiedAt).not.toBeNull();
  });

  it('не снимает блокировку', async () => {
    const email = 'banned@x.test';
    await request(server)
      .post('/api/v1/auth/register')
      .send({ pdConsent: true, email, password: 'secret12345', name: 'Тест' });
    const users = new UserRepository(db);
    const user = await users.findByEmail(email);
    if (!user) throw new Error('user not created');
    await users.update(user.id, { status: 'banned' });

    await request(server)
      .post('/api/v1/auth/verify-email')
      .send({ token: mailer.tokens.get(email) });

    expect((await users.findByEmail(email))?.status).toBe('banned');
  });
});
