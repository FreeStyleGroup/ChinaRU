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

async function makeUser(
  email: string,
  promote: 'admin' | 'seller' | null = null
): Promise<{ agent: request.Agent; userId: string }> {
  const agent = request.agent(server);
  const res = await agent.post('/api/v1/auth/register').send({ pdConsent: true, email, password: 'secret123' });
  const userId = (res.body as { data: { user: { id: string } } }).data.user.id;
  if (promote === 'admin') await new UserRepository(db).update(userId, { role: 'admin' });
  if (promote === 'seller') {
    await new SellerRepository(db).create({
      userId,
      companyName: 'ACME Trading',
      verifyStatus: 'verified',
    });
    await new UserRepository(db).update(userId, { role: 'seller' });
  }
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

describe('social: posting', () => {
  it('lets a user post and shows it in the feed as a user-authored post', async () => {
    const { agent, userId } = await makeUser('poster@x.test');
    const created = await agent.post('/api/v1/social/posts').send({ body: 'Привет, China.ru!' });
    expect(created.status).toBe(201);
    expect(created.body.data.author.kind).toBe('user');
    expect(created.body.data.author.userId).toBe(userId);

    const feed = await request(server).get('/api/v1/social/feed');
    expect(feed.status).toBe(200);
    const ids = feed.body.data.items.map((p: { id: string }) => p.id);
    expect(ids).toContain(created.body.data.id);
  });

  it('lets a verified company post on its behalf, and blocks non-companies', async () => {
    const { agent } = await makeUser('company@x.test', 'seller');
    const asCompany = await agent
      .post('/api/v1/social/posts')
      .send({ body: 'Поставки оборудования из Китая', asCompany: true });
    expect(asCompany.status).toBe(201);
    expect(asCompany.body.data.author.kind).toBe('company');
    expect(asCompany.body.data.author.companyName).toBe('ACME Trading');

    const { agent: plain } = await makeUser('notcompany@x.test');
    const denied = await plain
      .post('/api/v1/social/posts')
      .send({ body: 'Я не компания', asCompany: true });
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('seller_not_verified');
  });
});

describe('social: likes & comments', () => {
  it('toggles a like and reflects it for the viewer', async () => {
    const { agent } = await makeUser('liker@x.test');
    const post = await agent.post('/api/v1/social/posts').send({ body: 'Лайкни меня' });
    const id = post.body.data.id as string;

    const like = await agent.post(`/api/v1/social/posts/${id}/like`);
    expect(like.body.data).toEqual({ liked: true, likeCount: 1 });

    const seen = await agent.get(`/api/v1/social/posts/${id}`);
    expect(seen.body.data.liked).toBe(true);
    expect(seen.body.data.likeCount).toBe(1);

    const unlike = await agent.post(`/api/v1/social/posts/${id}/like`);
    expect(unlike.body.data).toEqual({ liked: false, likeCount: 0 });
  });

  it('adds and removes comments with a live counter', async () => {
    const { agent } = await makeUser('commenter@x.test');
    const post = await agent.post('/api/v1/social/posts').send({ body: 'Обсудим?' });
    const id = post.body.data.id as string;

    const comment = await agent.post(`/api/v1/social/posts/${id}/comments`).send({ body: 'Согласен' });
    expect(comment.status).toBe(201);
    const commentId = comment.body.data.id as string;

    const list = await agent.get(`/api/v1/social/posts/${id}/comments`);
    expect(list.body.data.total).toBe(1);
    const afterAdd = await agent.get(`/api/v1/social/posts/${id}`);
    expect(afterAdd.body.data.commentCount).toBe(1);

    await agent.delete(`/api/v1/social/comments/${commentId}`);
    const afterDel = await agent.get(`/api/v1/social/posts/${id}`);
    expect(afterDel.body.data.commentCount).toBe(0);
  });
});

describe('social: ads & moderation', () => {
  it('injects an admin-created ad into the feed', async () => {
    const { agent } = await makeUser('busyposter@x.test');
    for (let i = 0; i < 5; i += 1) {
      await agent.post('/api/v1/social/posts').send({ body: `Пост №${i}` });
    }
    const { agent: admin } = await makeUser('social-admin@x.test', 'admin');
    const ad = await admin
      .post('/api/v1/admin/social/ads')
      .send({ body: 'Реклама: логистика под ключ', advertiser: 'LogiPro', adUrl: 'https://logipro.example' });
    expect(ad.status).toBe(201);
    expect(ad.body.data.isAd).toBe(true);
    expect(ad.body.data.author.kind).toBe('ad');

    const feed = await request(server).get('/api/v1/social/feed?pageSize=20');
    const ads = feed.body.data.items.filter((p: { isAd: boolean }) => p.isAd);
    expect(ads.length).toBeGreaterThanOrEqual(1);
    expect(ads[0].author.kind).toBe('ad');
  });

  it('hides a post (gone from feed + 404), then unhides it', async () => {
    const { agent } = await makeUser('moderated@x.test');
    const post = await agent.post('/api/v1/social/posts').send({ body: 'Скрой меня' });
    const id = post.body.data.id as string;

    const { agent: admin } = await makeUser('mod-admin@x.test', 'admin');
    const hide = await admin.post(`/api/v1/admin/social/posts/${id}/hide`);
    expect(hide.status).toBe(200);

    const gone = await request(server).get(`/api/v1/social/posts/${id}`);
    expect(gone.status).toBe(404);

    await admin.post(`/api/v1/admin/social/posts/${id}/unhide`);
    const back = await request(server).get(`/api/v1/social/posts/${id}`);
    expect(back.status).toBe(200);
  });

  it("does not let a user delete someone else's post", async () => {
    const { agent: owner } = await makeUser('owner-post@x.test');
    const post = await owner.post('/api/v1/social/posts').send({ body: 'Мой пост' });
    const id = post.body.data.id as string;
    const { agent: other } = await makeUser('intruder-post@x.test');
    const del = await other.delete(`/api/v1/social/posts/${id}`);
    expect(del.status).toBe(403);
  });
});
