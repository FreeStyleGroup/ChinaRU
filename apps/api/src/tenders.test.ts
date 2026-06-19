import { createServer, type Server } from 'node:http';

import { SellerRepository, TenderRepository, UserRepository, type Database } from '@china-ru/db';
import { createTestDb } from '@china-ru/db/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from './app';
import { loadConfig } from './config';
import { createLogger } from './logger';

let db: Database;
let close: () => Promise<void>;
let server: Server;

/** Дата в будущем (для срока приёма заявок). */
function future(days = 1): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

async function makeUser(email: string): Promise<{ agent: request.Agent; userId: string }> {
  const agent = request.agent(server);
  const res = await agent.post('/api/v1/auth/register').send({ email, password: 'secret123' });
  const userId = (res.body as { data: { user: { id: string } } }).data.user.id;
  return { agent, userId };
}

/** Верифицированная (по умолчанию) компания с заданным названием. */
async function makeCompany(
  email: string,
  companyName: string,
  verifyStatus: 'verified' | 'pending' = 'verified'
): Promise<{ agent: request.Agent; userId: string; sellerId: string }> {
  const { agent, userId } = await makeUser(email);
  const seller = await new SellerRepository(db).create({ userId, companyName, verifyStatus });
  await new UserRepository(db).update(userId, { role: 'seller' });
  return { agent, userId, sellerId: seller.id };
}

const draft = {
  title: 'Поставка холодильного оборудования',
  description: 'Закупка промышленных холодильных камер для склада в Москве, требования в извещении.',
  method: 'open_tender' as const,
  law: 'commercial' as const,
  region: 'Москва',
  startPrice: '5000000.00',
  submissionDeadline: future(2),
};

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

describe('tenders: создание и доступ', () => {
  it('только верифицированная компания может создать тендер', async () => {
    const { agent: plain } = await makeUser('plain@t.test');
    const asUser = await plain.post('/api/v1/tenders').send(draft);
    expect(asUser.status).toBe(403);
    expect(asUser.body.error.code).toBe('seller_required');

    const { agent: pending } = await makeCompany('pending@t.test', 'Pending LLC', 'pending');
    const asPending = await pending.post('/api/v1/tenders').send(draft);
    expect(asPending.status).toBe(403);
    expect(asPending.body.error.code).toBe('seller_not_verified');

    const { agent: customer } = await makeCompany('cust1@t.test', 'Холод-Трейд');
    const created = await customer.post('/api/v1/tenders').send(draft);
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('draft');
    expect(created.body.data.registryNumber).toBeGreaterThanOrEqual(100001);
    expect(created.body.data.customer.companyName).toBe('Холод-Трейд');
  });

  it('черновик не виден в публичном реестре, опубликованный — виден', async () => {
    const { agent: customer } = await makeCompany('cust2@t.test', 'Реестр-Ко');
    const created = await customer.post('/api/v1/tenders').send(draft);
    const id = created.body.data.id as string;

    const draftList = await request(server).get('/api/v1/tenders');
    const draftIds = draftList.body.data.items.map((t: { id: string }) => t.id);
    expect(draftIds).not.toContain(id);

    // Чужой пользователь не видит черновик и по прямой ссылке.
    const { agent: stranger } = await makeUser('stranger@t.test');
    const hidden = await stranger.get(`/api/v1/tenders/${id}`);
    expect(hidden.status).toBe(404);

    const pub = await customer.post(`/api/v1/tenders/${id}/publish`);
    expect(pub.status).toBe(200);
    expect(pub.body.data.status).toBe('published');

    const pubList = await request(server).get('/api/v1/tenders');
    const pubIds = pubList.body.data.items.map((t: { id: string }) => t.id);
    expect(pubIds).toContain(id);
  });

  it('блокирует внешние ссылки в описании (антиспам, 422)', async () => {
    const { agent: customer } = await makeCompany('spam@t.test', 'Спам-Ко');
    const res = await customer
      .post('/api/v1/tenders')
      .send({ ...draft, description: 'Подробности на нашем сайте https://my-shop.example купите там' });
    expect(res.status).toBe(422);
  });
});

describe('tenders: подача заявок', () => {
  it('участник подаёт заявку; заказчик не может подать на свой тендер; дубль → 409', async () => {
    const { agent: customer } = await makeCompany('cust3@t.test', 'Заказчик-3');
    const created = await customer.post('/api/v1/tenders').send(draft);
    const id = created.body.data.id as string;
    await customer.post(`/api/v1/tenders/${id}/publish`);

    // Заказчик не участвует в своём тендере.
    const own = await customer.post(`/api/v1/tenders/${id}/bids`).send({ price: '100.00' });
    expect(own.status).toBe(403);
    expect(own.body.error.code).toBe('own_tender');

    const { agent: bidder } = await makeCompany('bid3@t.test', 'Участник-3');
    const bid = await bidder.post(`/api/v1/tenders/${id}/bids`).send({ price: '4800000.00', comment: 'Готовы поставить за 30 дней' });
    expect(bid.status).toBe(201);
    expect(bid.body.data.bidder.companyName).toBe('Участник-3');
    expect(bid.body.data.status).toBe('submitted');

    // Счётчик заявок вырос.
    const detail = await customer.get(`/api/v1/tenders/${id}`);
    expect(detail.body.data.bidCount).toBe(1);

    // Повторная заявка — конфликт.
    const dup = await bidder.post(`/api/v1/tenders/${id}/bids`).send({ price: '4700000.00' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('bid_exists');

    // Отзыв и повторная подача.
    const myBidId = bid.body.data.id as string;
    const wd = await bidder.post(`/api/v1/tender-bids/${myBidId}/withdraw`);
    expect(wd.body.data.status).toBe('withdrawn');
    const resubmit = await bidder.post(`/api/v1/tenders/${id}/bids`).send({ price: '4750000.00' });
    expect(resubmit.status).toBe(201);
    expect(resubmit.body.data.status).toBe('submitted');
  });

  it('нельзя подать заявку после истечения срока', async () => {
    const { agent: customer } = await makeCompany('cust4@t.test', 'Заказчик-4');
    const created = await customer.post('/api/v1/tenders').send(draft);
    const id = created.body.data.id as string;
    await customer.post(`/api/v1/tenders/${id}/publish`);
    // Сдвигаем срок в прошлое напрямую через репозиторий.
    await new TenderRepository(db).update(id, { submissionDeadline: new Date(Date.now() - 1000) });

    const { agent: bidder } = await makeCompany('bid4@t.test', 'Участник-4');
    const late = await bidder.post(`/api/v1/tenders/${id}/bids`).send({ price: '100.00' });
    expect(late.status).toBe(400);
    expect(late.body.error.code).toBe('deadline_passed');
  });

  it('заявки видны только заказчику', async () => {
    const { agent: customer } = await makeCompany('cust5@t.test', 'Заказчик-5');
    const created = await customer.post('/api/v1/tenders').send(draft);
    const id = created.body.data.id as string;
    await customer.post(`/api/v1/tenders/${id}/publish`);
    const { agent: bidder } = await makeCompany('bid5@t.test', 'Участник-5');
    await bidder.post(`/api/v1/tenders/${id}/bids`).send({ price: '4000000.00' });

    const asCustomer = await customer.get(`/api/v1/tenders/${id}/bids`);
    expect(asCustomer.status).toBe(200);
    expect(asCustomer.body.data.length).toBe(1);

    const asBidder = await bidder.get(`/api/v1/tenders/${id}/bids`);
    expect(asBidder.status).toBe(403);
    expect(asBidder.body.error.code).toBe('not_tender_owner');
  });
});

describe('tenders: рассмотрение и подведение итогов', () => {
  it('полный цикл: публикация → заявки → рассмотрение → победитель', async () => {
    const { agent: customer } = await makeCompany('cust6@t.test', 'Заказчик-6');
    const created = await customer.post('/api/v1/tenders').send(draft);
    const id = created.body.data.id as string;
    await customer.post(`/api/v1/tenders/${id}/publish`);

    const { agent: bidA } = await makeCompany('bidA@t.test', 'Альфа');
    const { agent: bidB } = await makeCompany('bidB@t.test', 'Бета');
    const a = await bidA.post(`/api/v1/tenders/${id}/bids`).send({ price: '4500000.00' });
    const b = await bidB.post(`/api/v1/tenders/${id}/bids`).send({ price: '4200000.00' });
    const bidAId = a.body.data.id as string;
    const bidBId = b.body.data.id as string;

    // До рассмотрения подвести итоги нельзя.
    const tooEarly = await customer.post(`/api/v1/tenders/${id}/award`).send({ bidId: bidBId });
    expect(tooEarly.status).toBe(400);
    expect(tooEarly.body.error.code).toBe('tender_not_in_review');

    // Закрываем приём → рассмотрение.
    const closed = await customer.post(`/api/v1/tenders/${id}/close`);
    expect(closed.body.data.status).toBe('review');

    // Победителем может стать только допущенная заявка.
    const notAdmitted = await customer.post(`/api/v1/tenders/${id}/award`).send({ bidId: bidBId });
    expect(notAdmitted.status).toBe(400);
    expect(notAdmitted.body.error.code).toBe('bid_not_admitted');

    // Допускаем обе.
    await customer.post(`/api/v1/tender-bids/${bidAId}/review`).send({ status: 'admitted' });
    await customer.post(`/api/v1/tender-bids/${bidBId}/review`).send({ status: 'admitted' });

    // Определяем победителя (Бета — дешевле).
    const award = await customer.post(`/api/v1/tenders/${id}/award`).send({ bidId: bidBId, comment: 'Лучшая цена' });
    expect(award.status).toBe(200);
    expect(award.body.data.status).toBe('awarded');
    expect(award.body.data.awardedBidId).toBe(bidBId);

    // Статусы заявок: победитель — won, проигравший — lost.
    const bids = await customer.get(`/api/v1/tenders/${id}/bids`);
    const byId = new Map(bids.body.data.map((x: { id: string; status: string }) => [x.id, x.status]));
    expect(byId.get(bidBId)).toBe('won');
    expect(byId.get(bidAId)).toBe('lost');

    // Победитель видит результат в «моих заявках» и получил уведомление.
    const myBids = await bidB.get('/api/v1/account/tender-bids');
    expect(myBids.body.data.items[0].status).toBe('won');
    const notif = await bidB.get('/api/v1/account/notifications');
    expect(notif.body.data.items.some((n: { type: string }) => n.type === 'tender')).toBe(true);

    // Завершение договора.
    const done = await customer.post(`/api/v1/tenders/${id}/complete`);
    expect(done.body.data.status).toBe('completed');
  });

  it('отмена тендера уведомляет участников', async () => {
    const { agent: customer } = await makeCompany('cust7@t.test', 'Заказчик-7');
    const created = await customer.post('/api/v1/tenders').send(draft);
    const id = created.body.data.id as string;
    await customer.post(`/api/v1/tenders/${id}/publish`);
    const { agent: bidder } = await makeCompany('bid7@t.test', 'Участник-7');
    await bidder.post(`/api/v1/tenders/${id}/bids`).send({ price: '3000000.00' });

    const cancel = await customer.post(`/api/v1/tenders/${id}/cancel`).send({ reason: 'Изменились требования' });
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.status).toBe('cancelled');
    expect(cancel.body.data.cancelReason).toBe('Изменились требования');

    const notif = await bidder.get('/api/v1/account/notifications');
    expect(notif.body.data.items.some((n: { type: string }) => n.type === 'tender')).toBe(true);
  });
});
