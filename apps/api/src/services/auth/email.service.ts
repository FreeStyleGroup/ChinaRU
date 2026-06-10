import nodemailer from 'nodemailer';
import { config$ } from '../../config';
import { logger } from '../../utils/logger';

const transporter = nodemailer.createTransport({
  host: config$.SMTP_HOST,
  port: config$.SMTP_PORT,
  secure: config$.SMTP_SECURE,
  auth: {
    user: config$.SMTP_USER,
    pass: config$.SMTP_PASSWORD,
  },
});

export const emailService = {
  sendVerificationEmail: async (email: string, token: string) => {
    const verificationUrl = `${process.env.API_URL || 'http://localhost:3001'}/api/v1/auth/verify-email?token=${token}`;

    try {
      await transporter.sendMail({
        from: config$.MAIL_FROM,
        to: email,
        subject: 'Verify your China-RU account',
        html: `
          <h1>Welcome to China-RU!</h1>
          <p>Click the link below to verify your email:</p>
          <a href="${verificationUrl}">${verificationUrl}</a>
          <p>This link expires in 24 hours.</p>
        `,
      });
    } catch (error) {
      logger.error(error, 'Failed to send verification email');
      throw error;
    }
  },

  sendPasswordResetEmail: async (email: string, token: string) => {
    const resetUrl = `${process.env.API_URL || 'http://localhost:3001'}/reset-password?token=${token}`;

    try {
      await transporter.sendMail({
        from: config$.MAIL_FROM,
        to: email,
        subject: 'Reset your China-RU password',
        html: `
          <h1>Password Reset</h1>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>This link expires in 1 hour.</p>
        `,
      });
    } catch (error) {
      logger.error(error, 'Failed to send password reset email');
      throw error;
    }
  },
};
