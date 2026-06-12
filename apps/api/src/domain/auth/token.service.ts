import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { schema, type Database } from '@china-ru/db';
import { eq } from 'drizzle-orm';
import jwt, { type SignOptions } from 'jsonwebtoken';

import type { UserRole } from '@china-ru/shared';
import type { Logger } from 'pino';

const { refreshTokens } = schema;

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshRowId: string;
}

export interface TokenServiceOptions {
  accessSecret: string;
  refreshSecret: string;
  accessTtl: string;
  refreshTtl: string;
  refreshTtlMobile: string;
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** "15m" | "30d" | "12h" | "3600" → секунды. */
export function parseTtlToSeconds(ttl: string): number {
  const match = /^(\d+)([smhd])?$/.exec(ttl.trim());
  if (!match) throw new Error(`Invalid TTL format: ${ttl}`);
  const value = Number(match[1]);
  switch (match[2] ?? 's') {
    case 'm':
      return value * 60;
    case 'h':
      return value * 3_600;
    case 'd':
      return value * 86_400;
    default:
      return value;
  }
}

interface IssueOptions {
  userId: string;
  role: UserRole;
  userAgent?: string | null;
  ip?: string | null;
  /** Мобильный клиент → длинный refresh TTL. */
  mobile?: boolean;
  /** При ротации — id предыдущей строки, помечаемой replacedBy. */
  replacesId?: string;
}

/**
 * JWT-токены + ротация refresh с защитой от повторного использования.
 * Refresh хранится в БД как sha256-хеш; jti в JWT = PK строки.
 */
export class TokenService {
  readonly accessTtlSec: number;
  readonly refreshTtlSec: number;
  readonly refreshTtlMobileSec: number;

  constructor(
    private readonly db: Database,
    private readonly opts: TokenServiceOptions,
    private readonly logger: Logger
  ) {
    this.accessTtlSec = parseTtlToSeconds(opts.accessTtl);
    this.refreshTtlSec = parseTtlToSeconds(opts.refreshTtl);
    this.refreshTtlMobileSec = parseTtlToSeconds(opts.refreshTtlMobile);
  }

  async issuePair(o: IssueOptions): Promise<TokenPair> {
    const refreshRowId = randomUUID();
    const refreshTtlSec = o.mobile ? this.refreshTtlMobileSec : this.refreshTtlSec;

    const accessPayload: AccessTokenPayload = { sub: o.userId, role: o.role, type: 'access' };
    const refreshPayload: RefreshTokenPayload = {
      sub: o.userId,
      jti: refreshRowId,
      type: 'refresh',
    };

    const accessSign: SignOptions = { expiresIn: this.accessTtlSec };
    const refreshSign: SignOptions = { expiresIn: refreshTtlSec };

    const accessToken = jwt.sign(accessPayload, this.opts.accessSecret, accessSign);
    const refreshToken = jwt.sign(refreshPayload, this.opts.refreshSecret, refreshSign);

    await this.db.insert(refreshTokens).values({
      id: refreshRowId,
      userId: o.userId,
      tokenHash: sha256(refreshToken),
      userAgent: o.userAgent ?? null,
      ip: o.ip ?? null,
      expiresAt: new Date(Date.now() + refreshTtlSec * 1000),
    });

    if (o.replacesId) {
      await this.db
        .update(refreshTokens)
        .set({ revokedAt: new Date(), replacedById: refreshRowId })
        .where(eq(refreshTokens.id, o.replacesId));
    }

    return { accessToken, refreshToken, refreshRowId };
  }

  verifyAccess(token: string): AccessTokenPayload {
    const decoded = jwt.verify(token, this.opts.accessSecret) as AccessTokenPayload;
    if (decoded.type !== 'access') throw new Error('Wrong token type');
    return decoded;
  }

  async verifyRefresh(token: string): Promise<RefreshTokenPayload & { rowId: string }> {
    const decoded = jwt.verify(token, this.opts.refreshSecret) as RefreshTokenPayload;
    if (decoded.type !== 'refresh') throw new Error('Wrong token type');

    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.id, decoded.jti))
      .limit(1);

    if (!row) throw new Error('Refresh row not found');
    if (row.tokenHash !== sha256(token)) throw new Error('Token hash mismatch');
    if (row.revokedAt) {
      // Предъявлен уже отозванный refresh → вероятная кража. Рвём всю цепочку юзера.
      this.logger.warn({ userId: row.userId, jti: decoded.jti }, 'Refresh token reuse detected');
      await this.revokeAllForUser(row.userId);
      throw new Error('Refresh token already revoked (chain revoked)');
    }
    if (row.expiresAt < new Date()) throw new Error('Refresh token expired');
    return { ...decoded, rowId: row.id };
  }

  async revoke(rowId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, rowId));
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.userId, userId));
  }

  /** Непрозрачный токен для verify-email / reset-password (32 байта → 64 hex). */
  generateOpaqueToken(): { plain: string; hash: string } {
    const plain = randomBytes(32).toString('hex');
    return { plain, hash: sha256(plain) };
  }

  hashOpaque(plain: string): string {
    return sha256(plain);
  }
}
