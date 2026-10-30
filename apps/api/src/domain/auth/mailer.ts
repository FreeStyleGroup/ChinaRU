import { createTransport } from 'nodemailer';

import { passwordResetMail, verificationMail, type MailContent } from './mail-templates';

import type { Logger } from 'pino';

export interface VerificationEmail {
  to: string;
  name: string | null;
  token: string;
}

export interface PasswordResetEmail {
  to: string;
  name: string | null;
  token: string;
}

/**
 * Транспорт писем. Доставка — «по возможности»: сбой отправки логируется и не
 * роняет вызвавшую операцию. Регистрация к этому моменту уже записана, а запрос
 * сброса пароля обязан отвечать одинаково при любом исходе (анти-энумерация);
 * письмо подтверждения можно запросить повторно из кабинета.
 */
export interface Mailer {
  sendVerificationEmail(msg: VerificationEmail): Promise<void>;
  sendPasswordResetEmail(msg: PasswordResetEmail): Promise<void>;
}

/**
 * Без SMTP письма не отправляются. В разработке и тестах токен пишется в лог,
 * чтобы пройти сценарий руками; в production — нет: одноразовый токен из лога
 * позволяет подтвердить чужой адрес или сменить чужой пароль.
 */
export class ConsoleMailer implements Mailer {
  constructor(
    private readonly logger: Logger,
    private readonly exposeTokens: boolean
  ) {}

  async sendVerificationEmail(msg: VerificationEmail): Promise<void> {
    this.log('verification', msg.to, msg.token);
    await Promise.resolve();
  }

  async sendPasswordResetEmail(msg: PasswordResetEmail): Promise<void> {
    this.log('password_reset', msg.to, msg.token);
    await Promise.resolve();
  }

  private log(kind: string, to: string, token: string): void {
    if (this.exposeTokens) {
      this.logger.info({ kind, to, token }, '[mail] письмо не отправлено: SMTP не настроен');
    } else {
      this.logger.warn({ kind }, '[mail] письмо не отправлено: SMTP не настроен');
    }
  }
}

export interface SmtpSettings {
  host: string;
  port: number;
  /** true — TLS с первого байта (порт 465); false — STARTTLS (порт 587). */
  secure: boolean;
  user: string;
  password: string;
  /** Отправитель, например `China.ru <no-reply@china-ru.ru>`. */
  from: string;
}

/** Отправка через SMTP-сервер почты домена (nodemailer, MIT-0). */
export class SmtpMailer implements Mailer {
  private readonly transport;

  constructor(
    private readonly settings: SmtpSettings,
    /** Адрес витрины — ссылки в письмах ведут на её страницы. */
    private readonly webUrl: string,
    private readonly logger: Logger
  ) {
    this.transport = createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      // Без secure требуем STARTTLS: пароль и токены не уходят открытым текстом.
      requireTLS: !settings.secure,
      ...(settings.user ? { auth: { user: settings.user, pass: settings.password } } : {}),
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    });
  }

  async sendVerificationEmail(msg: VerificationEmail): Promise<void> {
    await this.deliver('verification', msg.to, verificationMail(this.webUrl, msg));
  }

  async sendPasswordResetEmail(msg: PasswordResetEmail): Promise<void> {
    await this.deliver('password_reset', msg.to, passwordResetMail(this.webUrl, msg));
  }

  private async deliver(kind: string, to: string, content: MailContent): Promise<void> {
    try {
      await this.transport.sendMail({ from: this.settings.from, to, ...content });
      this.logger.info({ kind }, '[mail] письмо отправлено');
    } catch (error) {
      // Адрес и токен в журнал не пишем; причины сбоя достаточно для разбора.
      // Ответ сервера («550 … <адрес> rejected») может повторять адрес — вырезаем.
      const reason = (error instanceof Error ? error.message : String(error))
        .split(to)
        .join('<получатель>');
      this.logger.error({ kind, err: reason }, '[mail] письмо не отправлено');
    }
  }
}
