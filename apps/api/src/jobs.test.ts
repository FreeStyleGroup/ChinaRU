import { createServer, type Server } from 'node:http';

import { SellerRepository, UserRepository, type Database } from '@china-ru/db';
import { createTestDb } from '@china-ru/db/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from './app';
import { loadConfig } from './config';
import { createLogger } from './logger';

let db: Database;
let close: () => Promise<void>;
let server: Server;

async function makeAgent(email: string, promote: 'admin' | 'seller' | null) {
  const agent = request.agent(server);
  const res = await agent.post('/api/v1/auth/register').send({ email, password: 'secret123' });
  const userId = (res.body as { data: { user: { id: string } } }).data.user.id;
  if (promote === 'admin') {
    await new UserRepository(db).update(userId, { role: 'admin' });
  } else if (promote === 'seller') {
    await new SellerRepository(db).create({
      userId,
      companyName: 'Verified Co',
      verifyStatus: 'verified',
    });
    await new UserRepository(db).update(userId, { role: 'seller' });
  }
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

describe('resume moderation', () => {
  it('upserts a resume as pending, then admin publishes it', async () => {
    const seeker = await makeAgent('seeker@x.test', null);
    const create = await seeker
      .put('/api/v1/account/resume')
      .send({ position: 'Менеджер ВЭД', category: 'trade', hskLevel: 3 });
    expect(create.status).toBe(200);
    expect(create.body.data.moderationStatus).toBe('pending');
    expect(create.body.data.publishedAt).toBeNull();

    const own = await seeker.get('/api/v1/account/resume');
    expect(own.body.data.position).toBe('Менеджер ВЭД');

    const admin = await makeAgent('admin-jobs@x.test', 'admin');
    const list = await admin.get('/api/v1/admin/resumes?status=pending');
    expect(list.status).toBe(200);
    expect(list.body.data.total).toBeGreaterThanOrEqual(1);
    const id = list.body.data.items[0].id as string;

    const moderate = await admin
      .post(`/api/v1/admin/resumes/${id}/moderate`)
      .send({ status: 'published' });
    expect(moderate.status).toBe(200);
    expect(moderate.body.data.moderationStatus).toBe('published');
    expect(moderate.body.data.publishedAt).not.toBeNull();
  });

  it('requires a reason to reject', async () => {
    const seeker = await makeAgent('seeker2@x.test', null);
    await seeker.put('/api/v1/account/resume').send({ position: 'Логист' });
    const admin = await makeAgent('admin-jobs2@x.test', 'admin');
    const list = await admin.get('/api/v1/admin/resumes?status=pending');
    const id = list.body.data.items[0].id as string;
    const bad = await admin.post(`/api/v1/admin/resumes/${id}/moderate`).send({ status: 'rejected' });
    expect(bad.status).toBe(422);
  });
});

describe('vacancy moderation', () => {
  it('blocks non-sellers, accepts a seller vacancy as pending, admin publishes it → visible in /jobs', async () => {
    const buyer = await makeAgent('buyer-vac@x.test', null);
    const blocked = await buyer
      .post('/api/v1/seller/vacancies')
      .send({ title: 'Frontend', description: 'React', workType: 'full_time' });
    expect(blocked.status).toBe(403);

    const seller = await makeAgent('seller-vac@x.test', 'seller');
    const create = await seller.post('/api/v1/seller/vacancies').send({
      title: 'Frontend Developer',
      description: 'React 19 + TS',
      workType: 'full_time',
      category: 'it',
      city: 'Шанхай',
    });
    expect(create.status).toBe(200);
    expect(create.body.data.moderationStatus).toBe('pending');

    // Пока на модерации — в публичном листинге не появляется.
    const before = await request(server).get('/api/v1/jobs');
    expect(before.body.data.total).toBe(0);

    const admin = await makeAgent('admin-vac@x.test', 'admin');
    const list = await admin.get('/api/v1/admin/vacancies?status=pending');
    const id = list.body.data.items[0].id as string;
    const moderate = await admin
      .post(`/api/v1/admin/vacancies/${id}/moderate`)
      .send({ status: 'published' });
    expect(moderate.body.data.moderationStatus).toBe('published');

    const after = await request(server).get('/api/v1/jobs');
    expect(after.body.data.total).toBe(1);
    expect(after.body.data.items[0].title).toBe('Frontend Developer');
  });
});
