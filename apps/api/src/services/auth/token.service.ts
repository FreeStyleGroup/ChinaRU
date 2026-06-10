import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config$ } from '../../config';
import { getDb } from '@china-ru/db';
import type { AccessTokenPayload, RefreshTokenPayload } from '@china-ru/shared';

export const tokenService = {
  issuePair: async (userId: string, userRole: string) => {
    const accessPayload: AccessTokenPayload = {
      sub: userId,
      email: '', // will be filled from DB
      role: userRole as any,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 min
    };

    const refreshPayload: RefreshTokenPayload = {
      sub: userId,
      jti: crypto.randomUUID(),
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
    };

    const accessToken = jwt.sign(accessPayload, config$.JWT_ACCESS_SECRET);
    const refreshToken = jwt.sign(refreshPayload, config$.JWT_REFRESH_SECRET);

    // Store refresh token hash in DB
    const db = getDb();
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await db.insert(require('@china-ru/db').refreshTokens).values({
      userId,
      tokenHash,
      expiresAt: new Date(refreshPayload.exp * 1000),
    });

    return { accessToken, refreshToken };
  },

  verifyAccess: (token: string): AccessTokenPayload => {
    return jwt.verify(token, config$.JWT_ACCESS_SECRET) as AccessTokenPayload;
  },

  verifyRefresh: async (token: string): Promise<RefreshTokenPayload> => {
    const payload = jwt.verify(token, config$.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const db = getDb();
    const refreshTokens = require('@china-ru/db').refreshTokens;

    // Check if token exists and not revoked
    const record = await db
      .select()
      .from(refreshTokens)
      .where(() => {
        const { eq } = require('drizzle-orm');
        return eq(refreshTokens.tokenHash, tokenHash);
      })
      .limit(1);

    if (!record.length) {
      throw new Error('Invalid refresh token');
    }

    if (record[0].revokedAt) {
      throw new Error('Refresh token revoked');
    }

    return payload;
  },

  revoke: async (tokenId: string) => {
    const db = getDb();
    const refreshTokens = require('@china-ru/db').refreshTokens;

    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(() => {
        const { eq } = require('drizzle-orm');
        return eq(refreshTokens.id, tokenId);
      });
  },

  revokeAllForUser: async (userId: string) => {
    const db = getDb();
    const refreshTokens = require('@china-ru/db').refreshTokens;

    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(() => {
        const { eq } = require('drizzle-orm');
        return eq(refreshTokens.userId, userId);
      });
  },
};
