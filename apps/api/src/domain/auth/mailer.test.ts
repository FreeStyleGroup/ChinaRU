import { describe, expect, it } from 'vitest';

import { passwordResetMail, tokenLink, verificationMail } from './mail-templates';
import { ConsoleMailer, SmtpMailer } from './mailer';

import type { Logger } from 'pino';

const WEB = 'https://po.example.ru';

/** Логгер-заглушка: запоминает, что записано. */
function recordingLogger(): { logger: Logger; lines: unknown[] } {
  const lines: unknown[] = [];
  const write = (obj: unknown, msg?: string): void => {
    lines.push({ obj, msg });
  };
  return { logger: { info: write, warn: write, error: write } as unknown as Logger, lines };
}

describe('шаблоны писем', () => {
  it('ссылка ведёт на витрину этого экземпляра, токен закодирован', () => {
    const link = tokenLink(WEB, '/verify-email', 'a+b/c=');
    const url = new URL(link);
    expect(url.origin).toBe(WEB);
    expect(url.pathname).toBe('/verify-email');
    expect(url.searchParams.get('token')).toBe('a+b/c=');
  });

  it('письмо подтверждения: тема, ссылка в тексте и в HTML', () => {
    const mail = verificationMail(WEB, {
      to: 'u@x.test',
      name: 'Иван',
      token: 'tok1234567890abcd',
    });
    expect(mail.subject).toBe('Подтвердите адрес электронной почты');
    expect(mail.text).toContain('Здравствуйте, Иван!');
    expect(mail.text).toContain(`${WEB}/verify-email?token=tok1234567890abcd`);
    expect(mail.html).toContain(`href="${WEB}/verify-email?token=tok1234567890abcd"`);
  });

  it('имя пользователя в HTML экранируется', () => {
    const mail = passwordResetMail(WEB, {
      to: 'u@x.test',
      name: '<img src=x onerror=alert(1)>',
      token: 'tok1234567890abcd',
    });
    expect(mail.html).not.toContain('<img');
    expect(mail.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(mail.text).toContain(`${WEB}/reset-password?token=tok1234567890abcd`);
  });

  it('без имени — нейтральное обращение', () => {
    const mail = passwordResetMail(WEB, { to: 'u@x.test', name: null, token: 'tok1234567890abcd' });
    expect(mail.text.startsWith('Здравствуйте!')).toBe(true);
  });
});

describe('ConsoleMailer', () => {
  it('в production не пишет токен в журнал', async () => {
    const { logger, lines } = recordingLogger();
    await new ConsoleMailer(logger, false).sendPasswordResetEmail({
      to: 'u@x.test',
      name: null,
      token: 'secret-token-123456',
    });
    expect(JSON.stringify(lines)).not.toContain('secret-token-123456');
    expect(JSON.stringify(lines)).not.toContain('u@x.test');
  });

  it('SmtpMailer: недоступный сервер не роняет вызов, адрес и токен в журнал не попадают', async () => {
    const { logger, lines } = recordingLogger();
    const mailer = new SmtpMailer(
      { host: '127.0.0.1', port: 1, secure: false, user: '', password: '', from: 'n@x.test' },
      WEB,
      logger
    );
    await expect(
      mailer.sendVerificationEmail({ to: 'u@x.test', name: null, token: 'smtp-token-123456789' })
    ).resolves.toBeUndefined();
    const logged = JSON.stringify(lines);
    expect(logged).toContain('не отправлено');
    expect(logged).not.toContain('smtp-token-123456789');
    expect(logged).not.toContain('u@x.test');
  });

  it('в разработке пишет токен, чтобы пройти сценарий руками', async () => {
    const { logger, lines } = recordingLogger();
    await new ConsoleMailer(logger, true).sendVerificationEmail({
      to: 'u@x.test',
      name: null,
      token: 'dev-token-123456789',
    });
    expect(JSON.stringify(lines)).toContain('dev-token-123456789');
  });
});
