import crypto from 'crypto';
import { getDb, users, emailVerifications, passwordResets } from '@china-ru/db';
import { ApiError } from '../../middleware/errorHandler';
import { HTTP_STATUS, ERROR_CODES } from '@china-ru/shared';
import type { RegisterRequest, UserDto } from '@china-ru/shared';
import { tokenService } from './token.service';
import { passwordService } from './password.service';
import { emailService } from './email.service';
import { eq } from 'drizzle-orm';

export const authService = {
  register: async (data: RegisterRequest): Promise<{ user: UserDto; accessToken: string; refreshToken: string }> => {
    const db = getDb();

    // Check if email exists
    const existing = await db.select().from(users).where(eq(users.emailNormalized, data.email.toLowerCase())).limit(1);

    if (existing.length) {
      throw new ApiError(HTTP_STATUS.CONFLICT, ERROR_CODES.EMAIL_TAKEN, 'Email already registered');
    }

    // Hash password
    const passwordHash = await passwordService.hash(data.password);

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        emailNormalized: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        role: data.role as any,
        locale: data.locale || 'ru',
      })
      .returning();

    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationHash = crypto.createHash('sha256').update(verificationToken).digest('hex');

    await db.insert(emailVerifications).values({
      userId: user.id,
      email: user.email,
      tokenHash: verificationHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Send verification email
    await emailService.sendVerificationEmail(user.email, verificationToken);

    // Issue tokens
    const tokens = await tokenService.issuePair(user.id, user.role);

    const userDto: UserDto = {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      name: user.name,
      avatar: user.avatar || undefined,
      role: user.role,
      status: user.status,
      locale: user.locale,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    return { user: userDto, ...tokens };
  },

  login: async (email: string, password: string): Promise<{ user: UserDto; accessToken: string; refreshToken: string }> => {
    const db = getDb();

    const [user] = await db.select().from(users).where(eq(users.emailNormalized, email.toLowerCase())).limit(1);

    if (!user) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    if (!user.passwordHash) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS, 'This account uses social login');
    }

    // Verify password
    const isValid = await passwordService.verify(password, user.passwordHash);

    if (!isValid) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    if (user.status === 'banned') {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN, 'This account has been banned');
    }

    // Update last login
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    // Issue tokens
    const tokens = await tokenService.issuePair(user.id, user.role);

    const userDto: UserDto = {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      name: user.name,
      avatar: user.avatar || undefined,
      role: user.role,
      status: user.status,
      locale: user.locale,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    return { user: userDto, ...tokens };
  },

  verifyEmail: async (token: string) => {
    const db = getDb();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const [emailVerif] = await db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.tokenHash, tokenHash))
      .limit(1);

    if (!emailVerif) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_TOKEN, 'Invalid or expired verification token');
    }

    if (emailVerif.usedAt) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_TOKEN, 'Token already used');
    }

    // Mark email as verified
    await db.update(users).set({ emailVerified: true, status: 'active' }).where(eq(users.id, emailVerif.userId));

    // Mark token as used
    await db.update(emailVerifications).set({ usedAt: new Date() }).where(eq(emailVerifications.id, emailVerif.id));

    return { success: true };
  },

  forgotPassword: async (email: string) => {
    const db = getDb();

    const [user] = await db.select().from(users).where(eq(users.emailNormalized, email.toLowerCase())).limit(1);

    // Always return success to prevent email enumeration
    if (!user) return { success: true };

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    await db.insert(passwordResets).values({
      userId: user.id,
      email: user.email,
      tokenHash: resetHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    await emailService.sendPasswordResetEmail(user.email, resetToken);

    return { success: true };
  },

  resetPassword: async (token: string, newPassword: string) => {
    const db = getDb();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const [resetRecord] = await db
      .select()
      .from(passwordResets)
      .where(eq(passwordResets.tokenHash, tokenHash))
      .limit(1);

    if (!resetRecord) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_TOKEN, 'Invalid or expired reset token');
    }

    if (resetRecord.usedAt) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_TOKEN, 'Token already used');
    }

    // Hash new password
    const passwordHash = await passwordService.hash(newPassword);

    // Update user password
    await db.update(users).set({ passwordHash }).where(eq(users.id, resetRecord.userId));

    // Mark token as used
    await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, resetRecord.id));

    // Revoke all other sessions
    await tokenService.revokeAllForUser(resetRecord.userId);

    return { success: true };
  },
};
