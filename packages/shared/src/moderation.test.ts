import { describe, expect, it } from 'vitest';

import { inspectContent } from './moderation';

describe('content moderation', () => {
  it('passes clean B2B text', () => {
    for (const text of [
      'Ищем поставщика электроники из Шэньчжэня, пишите в личные сообщения.',
      'Наша команда расширяется — нужен логист со знанием HSK 4.',
      'Записался на педикюр и купил батон хлеба, отличная погода в России.',
      'Героиня нашего кейса — компания из Гуанчжоу.',
      'Регистрируйтесь у нас на China.ru — это наш портал.',
    ]) {
      expect(inspectContent(text).ok, text).toBe(true);
    }
  });

  it('blocks external links and bare domains', () => {
    expect(inspectContent('Заходите на https://my-shop.ru за скидками').violations).toContain('links');
    expect(inspectContent('пишите на www.spam.com').violations).toContain('links');
    expect(inspectContent('наш сайт example.shop там всё есть').violations).toContain('links');
    expect(inspectContent('переходи на t.me/spamchannel').violations).toContain('links');
  });

  it('blocks profanity, including obfuscation', () => {
    expect(inspectContent('ты полный мудак').violations).toContain('profanity');
    expect(inspectContent('х у й тебе').violations).toContain('profanity');
    expect(inspectContent('cyка, что за дела').violations).toContain('profanity');
  });

  it('blocks banned stop-words (porn/drugs/spam), ru and lat', () => {
    expect(inspectContent('смотри порно бесплатно').violations).toContain('banned');
    expect(inspectContent('free porno here').violations).toContain('banned');
    expect(inspectContent('продаю кокаин').violations).toContain('banned');
    expect(inspectContent('лучшее casino онлайн').violations).toContain('banned');
  });

  it('does not flag popcorn / common words as banned', () => {
    expect(inspectContent('popcorn and a thorn').violations).not.toContain('banned');
  });
});
