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
  const res = await agent.post('/api/v1/auth/register').send({ pdConsent: true, email, password: 'secret123' });
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

describe('public resume database', () => {
  it('hides pending resumes, exposes published ones with candidate data and filters', async () => {
    const seeker = await makeAgent('seeker-pub@x.test', null);
    const create = await seeker
      .put('/api/v1/account/resume')
      .send({ position: 'Переводчик китайского', category: 'translation', hskLevel: 5 });
    expect(create.status).toBe(200);
    const resumeId = create.body.data.id as string;

    // Пока на модерации — в публичной базе резюме не появляется.
    const before = await request(server).get('/api/v1/jobs/resumes');
    expect(before.body.data.items.some((r: { id: string }) => r.id === resumeId)).toBe(false);

    // Деталь скрытого резюме недоступна публично.
    const hidden = await request(server).get(`/api/v1/jobs/resumes/${resumeId}`);
    expect(hidden.status).toBe(404);

    const admin = await makeAgent('admin-pub@x.test', 'admin');
    await admin.post(`/api/v1/admin/resumes/${resumeId}/moderate`).send({ status: 'published' });

    // После публикации видно в базе с данными кандидата.
    const after = await request(server).get('/api/v1/jobs/resumes?category=translation');
    const found = after.body.data.items.find((r: { id: string }) => r.id === resumeId);
    expect(found).toBeTruthy();
    expect(found.position).toBe('Переводчик китайского');
    expect(found.candidatePublicId).toBeGreaterThanOrEqual(100001);
    expect(found.candidateVerified).toBe(false);

    // Фильтр по другой категории не возвращает это резюме.
    const other = await request(server).get('/api/v1/jobs/resumes?category=it');
    expect(other.body.data.items.some((r: { id: string }) => r.id === resumeId)).toBe(false);

    // Деталь доступна публично.
    const detail = await request(server).get(`/api/v1/jobs/resumes/${resumeId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.hskLevel).toBe(5);
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
    expect(after.body.data.items[0].companyName).toBe('Verified Co');
  });
});

describe('job applications', () => {
  it('seeker applies once, company sees applicant and accepts; seeker sees it', async () => {
    // Компания публикует вакансию.
    const seller = await makeAgent('seller-app@x.test', 'seller');
    const create = await seller.post('/api/v1/seller/vacancies').send({
      title: 'ML Engineer',
      description: 'PyTorch',
      workType: 'remote',
      category: 'it',
    });
    const vacancyId = create.body.data.id as string;
    const admin = await makeAgent('admin-app@x.test', 'admin');
    await admin.post(`/api/v1/admin/vacancies/${vacancyId}/moderate`).send({ status: 'published' });

    // Соискатель откликается.
    const seeker = await makeAgent('seeker-app@x.test', null);
    const apply = await seeker
      .post(`/api/v1/jobs/${vacancyId}/apply`)
      .send({ coverLetter: 'Готов приступить' });
    expect(apply.status).toBe(201);

    // Повторный отклик запрещён.
    const again = await seeker.post(`/api/v1/jobs/${vacancyId}/apply`).send({});
    expect(again.status).toBe(409);

    // У соискателя отклик виден.
    const mine = await seeker.get('/api/v1/account/applications');
    expect(mine.body.data).toHaveLength(1);
    expect(mine.body.data[0].vacancyTitle).toBe('ML Engineer');
    expect(mine.body.data[0].companyName).toBe('Verified Co');

    // Компания видит отклик и принимает его.
    const applicants = await seller.get(`/api/v1/seller/vacancies/${vacancyId}/applicants`);
    expect(applicants.body.data).toHaveLength(1);
    const appId = applicants.body.data[0].id as string;
    expect(applicants.body.data[0].coverLetter).toBe('Готов приступить');

    const decide = await seller
      .put(`/api/v1/seller/applications/${appId}`)
      .send({ status: 'accepted' });
    expect(decide.status).toBe(200);
    expect(decide.body.data.status).toBe('accepted');

    // Чужой не может смотреть отклики на эту вакансию.
    const intruder = await makeAgent('intruder-app@x.test', 'seller');
    const denied = await intruder.get(`/api/v1/seller/vacancies/${vacancyId}/applicants`);
    expect(denied.status).toBe(403);
  });
});
