import {
  schema,
  type Database,
  type ReferralRepository,
  type User,
  type UserRepository,
} from '@china-ru/db';
import { LEGAL_DOCS } from '@china-ru/shared';
import { and, eq, isNull } from 'drizzle-orm';

import {
  ConflictError,
  ForbiddenError,
  GoneError,
  NotFoundError,
  UnauthorizedError,
} from '../../http/errors';
import { toUserDto } from '../dto';

import type { Mailer } from './mailer';
import type { PasswordService } from './password.service';
import type { TokenPair, TokenService } from './token.service';
import type { ChangePasswordInput, LoginInput, RegisterInput, UserDto } from '@china-ru/shared';

const { emailVerifications, passwordResets, users } = schema;

const VERIFY_TTL_MS = 24 * 3_600_000;
const RESET_TTL_MS = 60 * 60_000;

export interface AuthServiceDeps {
  db: Database;
  users: UserRepository;
  tokens: TokenService;
  passwords: PasswordService;
  mailer: Mailer;
  registrationOpen: boolean;
  /** Привязка пригласившего при регистрации по реф-ссылке (MLM). */
  referrals?: ReferralRepository;
}

/** Контекст запроса (для аудита refresh-токенов и выбора TTL). */
export interface RequestContext {
  userAgent?: string | null;
  ip?: string | null;
  mobile?: boolean;
}

export class AuthService {
  constructor(private readonly deps: AuthServiceDeps) {}

  async register(
    input: RegisterInput,
    ctx: RequestContext
  ): Promise<{ user: UserDto; tokens: TokenPair }> {
    if (!this.deps.registrationOpen) {
      throw new ForbiddenError('Регистрация временно закрыта', 'registration_closed');
    }
    const existing = await this.deps.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('Пользователь с таким email уже зарегистрирован', 'email_taken');
    }

    const passwordHash = await this.deps.passwords.hash(input.password);
    // Согласие на обработку ПД проверено схемой (pdConsent === true); фиксируем,
    // когда и на какой опубликованный текст оно дано — это ответ оператора на
    // вопрос «на каком основании обрабатываются данные» (ч. 3 ст. 9 152-ФЗ).
    const created = await this.deps.users.create({
      email: input.email,
      passwordHash,
      name: input.name ?? null,
      locale: input.locale ?? 'ru',
      pdConsentAt: new Date(),
      pdConsentDoc: LEGAL_DOCS.pdConsent,
    });

    if (input.ref !== undefined && this.deps.referrals) {
      const referrer = await this.deps.referrals.findByPublicId(input.ref);
      if (referrer) await this.deps.referrals.linkReferrer(created.id, referrer.id);
    }

    await this.sendVerificationEmail(created);
    const tokens = await this.issueFor(created, ctx);
    return { user: toUserDto(created), tokens };
  }

  async login(
    input: LoginInput,
    ctx: RequestContext
  ): Promise<{ user: UserDto; tokens: TokenPair }> {
    const user = await this.deps.users.findByEmail(input.email);
    // Намеренно одинаковый ответ для «нет юзера» и «неверный пароль» — анти-энумерация.
    if (!user) {
      throw new UnauthorizedError('Неверный email или пароль', 'invalid_credentials');
    }
    if (user.status === 'banned') {
      throw new ForbiddenError('Учётная запись заблокирована', 'banned');
    }
    const valid = await this.deps.passwords.verify(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Неверный email или пароль', 'invalid_credentials');
    }
    const tokens = await this.issueFor(user, ctx);
    return { user: toUserDto(user), tokens };
  }

  async refresh(
    refreshToken: string,
    ctx: RequestContext
  ): Promise<{ user: UserDto; tokens: TokenPair }> {
    const decoded = await this.deps.tokens.verifyRefresh(refreshToken);
    const user = await this.deps.users.findById(decoded.sub);
    if (!user) throw new UnauthorizedError('Сессия недействительна', 'invalid_session');
    if (user.status === 'banned')
      throw new ForbiddenError('Учётная запись заблокирована', 'banned');

    const tokens = await this.deps.tokens.issuePair({
      userId: user.id,
      role: user.role,
      userAgent: ctx.userAgent ?? null,
      ip: ctx.ip ?? null,
      mobile: ctx.mobile ?? false,
      replacesId: decoded.rowId,
    });
    return { user: toUserDto(user), tokens };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    try {
      const decoded = await this.deps.tokens.verifyRefresh(refreshToken);
      await this.deps.tokens.revoke(decoded.rowId);
    } catch {
      // Невалидный refresh — просто очистим cookies на стороне контроллера.
    }
  }

  async getById(userId: string): Promise<UserDto | null> {
    const user = await this.deps.users.findById(userId);
    return user ? toUserDto(user) : null;
  }

  async verifyEmail(token: string): Promise<void> {
    const hash = this.deps.tokens.hashOpaque(token);
    const [row] = await this.deps.db
      .select()
      .from(emailVerifications)
      .where(and(eq(emailVerifications.tokenHash, hash), isNull(emailVerifications.consumedAt)))
      .limit(1);
    if (!row) throw new NotFoundError('Неверная или уже использованная ссылка', 'invalid_token');
    if (row.expiresAt < new Date()) throw new GoneError('Срок ссылки истёк', 'token_expired');

    await this.deps.db.transaction(async tx => {
      await tx
        .update(emailVerifications)
        .set({ consumedAt: new Date() })
        .where(eq(emailVerifications.id, row.id));
      await tx.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, row.userId));
      // Подтверждённая почта переводит учётку из «ожидает подтверждения» в активные.
      // Заблокированного не трогаем: подтверждение почты не снимает бан.
      await tx
        .update(users)
        .set({ status: 'active' })
        .where(and(eq(users.id, row.userId), eq(users.status, 'pending_verify')));
    });
  }

  /** Запрос сброса. Молчим, если email не найден — анти-энумерация. */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.deps.users.findByEmail(email);
    if (!user) return;
    const { plain, hash } = this.deps.tokens.generateOpaqueToken();
    await this.deps.db.insert(passwordResets).values({
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    });
    await this.deps.mailer.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      token: plain,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hash = this.deps.tokens.hashOpaque(token);
    const [row] = await this.deps.db
      .select()
      .from(passwordResets)
      .where(and(eq(passwordResets.tokenHash, hash), isNull(passwordResets.consumedAt)))
      .limit(1);
    if (!row) throw new NotFoundError('Неверная или уже использованная ссылка', 'invalid_token');
    if (row.expiresAt < new Date()) throw new GoneError('Срок ссылки истёк', 'token_expired');

    const passwordHash = await this.deps.passwords.hash(newPassword);
    await this.deps.db.transaction(async tx => {
      await tx
        .update(passwordResets)
        .set({ consumedAt: new Date() })
        .where(eq(passwordResets.id, row.id));
      await tx.update(users).set({ passwordHash }).where(eq(users.id, row.userId));
    });
    // Безопасность: смена пароля рвёт все активные сессии.
    await this.deps.tokens.revokeAllForUser(row.userId);
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.deps.users.findById(userId);
    if (!user) throw new NotFoundError('Пользователь не найден', 'user_not_found');
    const valid = await this.deps.passwords.verify(input.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Текущий пароль неверен', 'invalid_credentials');
    const passwordHash = await this.deps.passwords.hash(input.newPassword);
    await this.deps.users.update(userId, { passwordHash });
    await this.deps.tokens.revokeAllForUser(userId);
  }

  private async issueFor(user: User, ctx: RequestContext): Promise<TokenPair> {
    return this.deps.tokens.issuePair({
      userId: user.id,
      role: user.role,
      userAgent: ctx.userAgent ?? null,
      ip: ctx.ip ?? null,
      mobile: ctx.mobile ?? false,
    });
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    if (user.emailVerifiedAt) return;
    const { plain, hash } = this.deps.tokens.generateOpaqueToken();
    await this.deps.db.insert(emailVerifications).values({
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
    });
    await this.deps.mailer.sendVerificationEmail({ to: user.email, name: user.name, token: plain });
  }
}
