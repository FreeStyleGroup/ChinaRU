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

/** Транспорт писем. Реализации: ConsoleMailer (dev/test), SMTP (prod, позже). */
export interface Mailer {
  sendVerificationEmail(msg: VerificationEmail): Promise<void>;
  sendPasswordResetEmail(msg: PasswordResetEmail): Promise<void>;
}

/** Заглушка: логирует письма вместо отправки (если SMTP не настроен). */
export class ConsoleMailer implements Mailer {
  constructor(private readonly logger: Logger) {}

  async sendVerificationEmail(msg: VerificationEmail): Promise<void> {
    this.logger.info({ to: msg.to, token: msg.token }, '[mail] verification email');
    await Promise.resolve();
  }

  async sendPasswordResetEmail(msg: PasswordResetEmail): Promise<void> {
    this.logger.info({ to: msg.to, token: msg.token }, '[mail] password reset email');
    await Promise.resolve();
  }
}
