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

async function makeUser(
  email: string,
  promote: 'admin' | null = null
): Promise<{ agent: request.Agent; userId: string }> {
  const agent = request.agent(server);
  const res = await agent.post('/api/v1/auth/register').send({ email, password: 'secret123' });
  const userId = (res.body as { data: { user: { id: string } } }).data.user.id;
  if (promote === 'admin') await new UserRepository(db).update(userId, { role: 'admin' });
  return { agent, userId };
}

async function publicIdOf(userId: string): Promise<number> {
  const user = await new UserRepository(db).findById(userId);
  if (!user) throw new Error('user not found');
  return user.publicId;
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

describe('social: content moderation', () => {
  it('rejects external links and profanity with 422', async () => {
    const { agent } = await makeUser('spammer@x.test');
    const link = await agent.post('/api/v1/social/posts').send({ body: 'Скидки на https://my-spam.ru' });
    expect(link.status).toBe(422);
    expect(link.body.error.fields.body).toContain('Ссылки');

    const swear = await agent.post('/api/v1/social/posts').send({ body: 'ты мудак конечно' });
    expect(swear.status).toBe(422);
  });
});

describe('social: follows', () => {
  it('follows a user and surfaces their posts in the following feed', async () => {
    const { agent: a } = await makeUser('follower@x.test');
    const { agent: b, userId: bId } = await makeUser('followed@x.test');
    await b.post('/api/v1/social/posts').send({ body: 'Пост от того, на кого подписались' });

    const follow = await a.post(`/api/v1/social/users/${bId}/follow`);
    expect(follow.status).toBe(200);
    expect(follow.body.data).toEqual({ following: true, followersCount: 1 });

    const feed = await a.get('/api/v1/social/feed/following');
    expect(feed.status).toBe(200);
    expect(feed.body.data.items.length).toBeGreaterThanOrEqual(1);

    const unfollow = await a.delete(`/api/v1/social/users/${bId}/follow`);
    expect(unfollow.body.data).toEqual({ following: false, followersCount: 0 });
  });

  it('refuses self-follow', async () => {
    const { agent, userId } = await makeUser('selffollow@x.test');
    const res = await agent.post(`/api/v1/social/users/${userId}/follow`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('self_follow');
  });
});

describe('social: mentions', () => {
  it('notifies a user mentioned by @publicId', async () => {
    const { agent: author } = await makeUser('mention-author@x.test');
    const { agent: mentioned, userId: mId } = await makeUser('mentioned@x.test');
    const pid = await publicIdOf(mId);

    const post = await author.post('/api/v1/social/posts').send({ body: `Спасибо, @${pid}!` });
    expect(post.status).toBe(201);

    const notifs = await mentioned.get('/api/v1/account/notifications');
    expect(notifs.status).toBe(200);
    const mention = notifs.body.data.items.find((n: { type: string }) => n.type === 'mention');
    expect(mention).toBeTruthy();

    const unread = await mentioned.get('/api/v1/account/notifications/unread');
    expect(unread.body.data.unread).toBeGreaterThanOrEqual(1);
  });
});

describe('social: reports', () => {
  it('reports a post, notifies admins, and lets an admin resolve it', async () => {
    // Админ должен существовать ДО подачи жалобы — иначе некого уведомлять.
    const { agent: admin } = await makeUser('reports-admin@x.test', 'admin');
    const { agent: author } = await makeUser('reported-author@x.test');
    const post = await author.post('/api/v1/social/posts').send({ body: 'Спорный пост' });
    const postId = post.body.data.id as string;

    const { agent: reporter } = await makeUser('reporter@x.test');
    const report = await reporter
      .post('/api/v1/social/reports')
      .send({ targetType: 'post', targetId: postId, reason: 'спам' });
    expect(report.status).toBe(201);
    const reportId = report.body.data.id as string;

    const queue = await admin.get('/api/v1/admin/social/reports?status=pending');
    expect(queue.status).toBe(200);
    expect(queue.body.data.total).toBeGreaterThanOrEqual(1);

    const adminNotifs = await admin.get('/api/v1/account/notifications');
    const reportNotif = adminNotifs.body.data.items.find((n: { type: string }) => n.type === 'report');
    expect(reportNotif).toBeTruthy();

    const resolve = await admin
      .post(`/api/v1/admin/social/reports/${reportId}/resolve`)
      .send({ status: 'resolved' });
    expect(resolve.status).toBe(200);
    expect(resolve.body.data.status).toBe('resolved');
  });
});
