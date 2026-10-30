import { createServer, type Server } from 'node:http';

import { UserRepository, type Database } from '@china-ru/db';
import { createTestDb } from '@china-ru/db/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from './app';
import { loadConfig } from './config';
import { createLogger } from './logger';

import type { Mailer } from './domain/auth/mailer';

/** Транспорт писем для теста: запоминает токены вместо отправки. */
class CapturingMailer implements Mailer {
  readonly tokens = new Map<string, string>();
  readonly resetTokens = new Map<string, string>();

  async sendVerificationEmail(msg: { to: string; token: string }): Promise<void> {
    this.tokens.set(msg.to, msg.token);
    await Promise.resolve();
  }

  async sendPasswordResetEmail(msg: { to: string; token: string }): Promise<void> {
    this.resetTokens.set(msg.to, msg.token);
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
  server = createServer(
    createApp({ db, config: loadConfig(), logger: createLogger('test'), mailer })
  );
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

  it('присылает письмо повторно, пока адрес не подтверждён', async () => {
    const email = 'resend@x.test';
    const agent = request.agent(server);
    await agent
      .post('/api/v1/auth/register')
      .send({ pdConsent: true, email, password: 'secret12345' });
    const first = mailer.tokens.get(email);

    const resend = await agent.post('/api/v1/auth/verify-email/resend');
    expect(resend.status).toBe(200);
    expect(resend.body.data).toEqual({ alreadyVerified: false });
    const second = mailer.tokens.get(email);
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);

    const verify = await request(server).post('/api/v1/auth/verify-email').send({ token: second });
    expect(verify.status).toBe(200);

    // Подтверждённому — больше не шлём.
    const again = await agent.post('/api/v1/auth/verify-email/resend');
    expect(again.body.data).toEqual({ alreadyVerified: true });
    expect(mailer.tokens.get(email)).toBe(second);
  });

  it('повторная отправка — только вошедшему', async () => {
    const res = await request(server).post('/api/v1/auth/verify-email/resend');
    expect(res.status).toBe(401);
  });
});

describe('восстановление пароля', () => {
  it('меняет пароль по ссылке из письма; ссылка одноразовая', async () => {
    const email = 'forgot@x.test';
    await request(server)
      .post('/api/v1/auth/register')
      .send({ pdConsent: true, email, password: 'oldpass123' });

    const ask = await request(server).post('/api/v1/auth/password-reset/request').send({ email });
    expect(ask.status).toBe(200);
    const token = mailer.resetTokens.get(email);
    expect(token).toBeTruthy();

    const confirm = await request(server)
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token, password: 'newpass456' });
    expect(confirm.status).toBe(200);

    const oldLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password: 'oldpass123' });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password: 'newpass456' });
    expect(newLogin.status).toBe(200);

    const reuse = await request(server)
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token, password: 'another789' });
    expect(reuse.status).toBe(404);
    expect(reuse.body.error.code).toBe('invalid_token');
  });

  it('для незнакомого адреса отвечает так же и письма не шлёт', async () => {
    const res = await request(server)
      .post('/api/v1/auth/password-reset/request')
      .send({ email: 'nobody-here@x.test' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ requested: true });
    expect(mailer.resetTokens.has('nobody-here@x.test')).toBe(false);
  });
});
