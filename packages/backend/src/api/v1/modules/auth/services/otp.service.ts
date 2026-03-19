/**
 * OTP Service
 * Handles One-Time Password generation and verification
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { smsService } from '../../../../../lib/sms/sms.service';
import { emailService } from '../../../../../lib/email/email.service';
import { generateRandomCode } from '@viraz/shared';
import { authenticator } from 'otplib';

export interface OTPConfig {
  length?: number;
  expiresIn?: number; // seconds
  digits?: boolean;
}

export interface OTPVerification {
  valid: boolean;
  attempts?: number;
  maxAttempts?: number;
  expiresAt?: Date;
}

export class OTPService {
  private defaultConfig: OTPConfig = {
    length: 6,
    expiresIn: 300, // 5 minutes
    digits: true,
  };

  /**
   * Generate OTP
   */
  generateOTP(config: OTPConfig = {}): string {
    const { length = 6, digits = true } = { ...this.defaultConfig, ...config };
    
    if (digits) {
      return generateRandomCode(length);
    } else {
      // Alphanumeric OTP
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let otp = '';
      for (let i = 0; i < length; i++) {
        otp += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return otp;
    }
  }

  /**
   * Generate TOTP secret
   */
  generateTOTPSecret(): string {
    return authenticator.generateSecret();
  }

  /**
   * Generate TOTP URI for QR code
   */
  generateTOTPURI(secret: string, email: string, issuer: string = 'VIRAZ'): string {
    return authenticator.keyuri(email, issuer, secret);
  }

  /**
   * Verify TOTP token
   */
  verifyTOTP(token: string, secret: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch (error) {
      logger.error('TOTP verification error:', error);
      return false;
    }
  }

  /**
   * Send OTP via SMS
   */
  async sendSMSOTP(phoneNumber: string, userId?: string): Promise<string> {
    const otp = this.generateOTP();
    const expiresIn = this.defaultConfig.expiresIn!;

    // Store OTP in Redis
    const key = `otp:sms:${phoneNumber}`;
    await redis.setex(key, expiresIn, JSON.stringify({
      otp,
      attempts: 0,
      userId,
    }));

    // Send SMS
    await smsService.send(
      phoneNumber,
      `Your VIRAZ verification code is: ${otp}. Valid for ${expiresIn / 60} minutes.`,
      'verification'
    );

    logger.info(`SMS OTP sent to ${phoneNumber}`);
    return otp;
  }

  /**
   * Send OTP via Email
   */
  async sendEmailOTP(email: string, userId?: string): Promise<string> {
    const otp = this.generateOTP();
    const expiresIn = this.defaultConfig.expiresIn!;

    // Store OTP in Redis
    const key = `otp:email:${email}`;
    await redis.setex(key, expiresIn, JSON.stringify({
      otp,
      attempts: 0,
      userId,
    }));

    // Send Email
    await emailService.send({
      to: email,
      subject: 'Your Verification Code',
      template: 'otp',
      data: {
        otp,
        expiresIn: expiresIn / 60,
      },
    });

    logger.info(`Email OTP sent to ${email}`);
    return otp;
  }

  /**
   * Verify SMS OTP
   */
  async verifySMSOTP(phoneNumber: string, otp: string): Promise<OTPVerification> {
    const key = `otp:sms:${phoneNumber}`;
    const data = await redis.get(key);

    if (!data) {
      return { valid: false };
    }

    const stored = JSON.parse(data);
    stored.attempts = (stored.attempts || 0) + 1;

    // Check max attempts (3 attempts max)
    if (stored.attempts > 3) {
      await redis.del(key);
      return { valid: false, attempts: stored.attempts, maxAttempts: 3 };
    }

    // Verify OTP
    const valid = stored.otp === otp;

    if (valid) {
      await redis.del(key);
      
      // Mark phone as verified if userId provided
      if (stored.userId) {
        await prisma.user.update({
          where: { id: stored.userId },
          data: { phoneVerified: true },
        });
      }
    } else {
      // Update attempt count
      await redis.setex(key, await redis.ttl(key), JSON.stringify(stored));
    }

    return {
      valid,
      attempts: stored.attempts,
      maxAttempts: 3,
    };
  }

  /**
   * Verify Email OTP
   */
  async verifyEmailOTP(email: string, otp: string): Promise<OTPVerification> {
    const key = `otp:email:${email}`;
    const data = await redis.get(key);

    if (!data) {
      return { valid: false };
    }

    const stored = JSON.parse(data);
    stored.attempts = (stored.attempts || 0) + 1;

    // Check max attempts (3 attempts max)
    if (stored.attempts > 3) {
      await redis.del(key);
      return { valid: false, attempts: stored.attempts, maxAttempts: 3 };
    }

    // Verify OTP
    const valid = stored.otp === otp;

    if (valid) {
      await redis.del(key);
      
      // Mark email as verified if userId provided
      if (stored.userId) {
        await prisma.user.update({
          where: { id: stored.userId },
          data: { emailVerified: true },
        });
      }
    } else {
      // Update attempt count
      await redis.setex(key, await redis.ttl(key), JSON.stringify(stored));
    }

    return {
      valid,
      attempts: stored.attempts,
      maxAttempts: 3,
    };
  }

  /**
   * Generate backup codes
   */
  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(generateRandomCode(8));
    }
    return codes;
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { backupCodes: true },
    });

    if (!user?.backupCodes) {
      return false;
    }

    const codes = user.backupCodes as string[];
    const index = codes.indexOf(code);

    if (index !== -1) {
      // Remove used code
      codes.splice(index, 1);
      await prisma.user.update({
        where: { id: userId },
        data: { backupCodes: codes },
      });
      return true;
    }

    return false;
  }

  /**
   * Get remaining attempts for OTP
   */
  async getRemainingAttempts(identifier: string, type: 'sms' | 'email'): Promise<number> {
    const key = `otp:${type}:${identifier}`;
    const data = await redis.get(key);
    
    if (!data) {
      return 3;
    }

    const stored = JSON.parse(data);
    return Math.max(0, 3 - (stored.attempts || 0));
  }

  /**
   * Resend OTP
   */
  async resendOTP(identifier: string, type: 'sms' | 'email', userId?: string): Promise<string> {
    // Delete old OTP
    const key = `otp:${type}:${identifier}`;
    await redis.del(key);

    // Send new OTP
    if (type === 'sms') {
      return this.sendSMSOTP(identifier, userId);
    } else {
      return this.sendEmailOTP(identifier, userId);
    }
  }

  /**
   * Generate time-based OTP (for 2FA)
   */
  generateTimeBasedOTP(secret: string): string {
    return authenticator.generate(secret);
  }

  /**
   * Verify time-based OTP (for 2FA)
   */
  verifyTimeBasedOTP(token: string, secret: string): boolean {
    return authenticator.verify({ token, secret });
  }
}

export const otpService = new OTPService();