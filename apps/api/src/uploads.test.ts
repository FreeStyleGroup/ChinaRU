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

// Минимальный валидный PNG (1×1) и PDF — для multipart-загрузок.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);
const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n', 'utf8');

async function makeUser(
  email: string,
  promote: 'admin' | null = null
): Promise<{ agent: request.Agent; userId: string }> {
  const agent = request.agent(server);
  const res = await agent.post('/api/v1/auth/register').send({ pdConsent: true, email, password: 'secret123' });
  const userId = (res.body as { data: { user: { id: string } } }).data.user.id;
  if (promote === 'admin') await new UserRepository(db).update(userId, { role: 'admin' });
  return { agent, userId };
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

describe('avatar upload', () => {
  it('uploads an image, exposes it on the user and serves it via the public proxy', async () => {
    const { agent, userId } = await makeUser('avatar@x.test');
    const up = await agent
      .post('/api/v1/account/avatar')
      .attach('file', PNG, { filename: 'a.png', contentType: 'image/png' });
    expect(up.status).toBe(200);
    expect(up.body.data.avatarUrl).toContain(`/api/v1/files/avatars/${userId}`);

    const served = await request(server).get(`/api/v1/files/avatars/${userId}`);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toContain('image/png');
    expect(Buffer.from(served.body as Buffer).equals(PNG)).toBe(true);
  });

  it('rejects a non-image file', async () => {
    const { agent } = await makeUser('avatar2@x.test');
    const up = await agent
      .post('/api/v1/account/avatar')
      .attach('file', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(up.status).toBe(400);
    expect(up.body.error.code).toBe('unsupported_type');
  });

  it('404s for a user without an avatar', async () => {
    const { userId } = await makeUser('avatar3@x.test');
    const served = await request(server).get(`/api/v1/files/avatars/${userId}`);
    expect(served.status).toBe(404);
  });
});

describe('resume documents + rating', () => {
  it('requires a resume before uploading a document', async () => {
    const { agent } = await makeUser('doc-noresume@x.test');
    const up = await agent
      .post('/api/v1/account/resume/documents')
      .field('type', 'diploma')
      .attach('file', PDF, { filename: 'd.pdf', contentType: 'application/pdf' });
    expect(up.status).toBe(404);
    expect(up.body.error.code).toBe('resume_required');
  });

  it('uploads, lists, downloads, verifies (rating up) and deletes (rating down)', async () => {
    const { agent } = await makeUser('doc-owner@x.test');
    await agent.put('/api/v1/account/resume').send({ position: 'Инженер', category: 'engineering' });

    const up = await agent
      .post('/api/v1/account/resume/documents')
      .field('type', 'hsk_certificate')
      .attach('file', PDF, { filename: 'hsk.pdf', contentType: 'application/pdf' });
    expect(up.status).toBe(201);
    expect(up.body.data.verified).toBe(false);
    expect(up.body.data.type).toBe('hsk_certificate');
    const docId = up.body.data.id as string;

    const list = await agent.get('/api/v1/account/resume/documents');
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);

    const download = await agent.get(`/api/v1/account/resume/documents/${docId}/download`);
    expect(download.status).toBe(200);
    expect(Buffer.from(download.body as Buffer).equals(PDF)).toBe(true);

    // Админ видит документы резюме и подтверждает → рейтинг растёт.
    const own = await agent.get('/api/v1/account/resume');
    const resumeId = own.body.data.id as string;
    const { agent: admin } = await makeUser('doc-admin@x.test', 'admin');
    const adminDocs = await admin.get(`/api/v1/admin/resumes/${resumeId}/documents`);
    expect(adminDocs.status).toBe(200);
    expect(adminDocs.body.data).toHaveLength(1);

    const verify = await admin
      .post(`/api/v1/admin/resume-documents/${docId}/verify`)
      .send({ verified: true });
    expect(verify.status).toBe(200);
    expect(verify.body.data.verified).toBe(true);

    const afterVerify = await agent.get('/api/v1/account/resume');
    expect(afterVerify.body.data.rating).toBe('0.50');

    const del = await agent.delete(`/api/v1/account/resume/documents/${docId}`);
    expect(del.status).toBe(200);
    const afterDelete = await agent.get('/api/v1/account/resume');
    expect(afterDelete.body.data.rating).toBe('0.00');
    const emptyList = await agent.get('/api/v1/account/resume/documents');
    expect(emptyList.body.data).toHaveLength(0);
  });

  it("does not let another user download someone else's document", async () => {
    const { agent: owner } = await makeUser('doc-owner2@x.test');
    await owner.put('/api/v1/account/resume').send({ position: 'Логист' });
    const up = await owner
      .post('/api/v1/account/resume/documents')
      .field('type', 'diploma')
      .attach('file', PDF, { filename: 'd.pdf', contentType: 'application/pdf' });
    const docId = up.body.data.id as string;

    const { agent: other } = await makeUser('doc-intruder@x.test');
    const steal = await other.get(`/api/v1/account/resume/documents/${docId}/download`);
    expect(steal.status).toBe(404);
  });
});
