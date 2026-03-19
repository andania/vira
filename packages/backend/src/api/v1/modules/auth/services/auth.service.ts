/**
 * Auth Service
 * Handles authentication, registration, and session management
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { config } from '../../../../../config';
import { emailService } from '../../../../../lib/email/email.service';
import { smsService } from '../../../../../lib/sms/sms.service';
import { notificationService } from '../../notifications/services/notification.service';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { generateRandomCode, validateEmail, validatePhone, validatePassword } from '@viraz/shared';

export interface RegisterData {
  username: string;
  email: string;
  phone?: string;
  password: string;
  accountType: 'user' | 'sponsor';
  agreeToTerms: boolean;
}

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterData) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: data.email },
            { username: data.username },
            ...(data.phone ? [{ phone: data.phone }] : []),
          ],
        },
      });

      if (existingUser) {
        if (existingUser.email === data.email) {
          throw new Error('Email already registered');
        }
        if (existingUser.username === data.username) {
          throw new Error('Username already taken');
        }
        if (data.phone && existingUser.phone === data.phone) {
          throw new Error('Phone number already registered');
        }
      }

      // Validate password strength
      const passwordValidation = validatePassword(data.password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors[0]);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, config.bcryptRounds);

      // Create user in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            username: data.username,
            email: data.email,
            phone: data.phone,
            password: hashedPassword,
            accountType: data.accountType === 'sponsor' ? 'SPONSOR' : 'USER',
            status: 'PENDING',
            emailVerified: false,
            phoneVerified: false,
          },
        });

        // Create profile
        await tx.userProfile.create({
          data: {
            userId: user.id,
            displayName: data.username,
          },
        });

        // Create preferences
        await tx.userPreference.create({
          data: {
            userId: user.id,
            notificationPush: true,
            notificationEmail: true,
            notificationSms: false,
          },
        });

        // Create wallet
        await tx.capWallet.create({
          data: {
            userId: user.id,
            balance: 0,
            lifetimeEarned: 0,
            lifetimeSpent: 0,
          },
        });

        // If sponsor, create sponsor record
        if (data.accountType === 'sponsor') {
          await tx.sponsor.create({
            data: {
              id: user.id,
              companyName: data.username,
              verificationStatus: 'PENDING',
              subscriptionTier: 'basic',
              creditLimit: 0,
            },
          });
        }

        return user;
      });

      // Generate verification tokens
      const emailToken = uuidv4();
      const phoneCode = data.phone ? generateRandomCode(6) : null;

      // Store verification tokens
      await prisma.emailVerification.create({
        data: {
          userId: result.id,
          email: result.email,
          token: emailToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      if (data.phone && phoneCode) {
        await prisma.phoneVerification.create({
          data: {
            userId: result.id,
            phone: data.phone,
            code: phoneCode,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          },
        });
      }

      // Send verification emails/SMS
      await emailService.send({
        to: result.email,
        subject: 'Verify Your Email - VIRAZ',
        template: 'verification',
        data: {
          name: data.username,
          code: emailToken,
          link: `${process.env.FRONTEND_URL}/verify-email?token=${emailToken}`,
        },
      });

      if (data.phone && phoneCode) {
        await smsService.send(
          data.phone,
          `Your VIRAZ verification code is: ${phoneCode}`,
          'verification'
        );
      }

      logger.info(`User registered: ${result.id} (${data.email})`);

      return {
        id: result.id,
        email: result.email,
        username: result.username,
        requiresVerification: true,
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(data: LoginData, ipAddress?: string, userAgent?: string) {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email: data.email },
        include: {
          profile: true,
        },
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if account is locked
      const failedAttempts = await redis.get(`failed:login:${user.id}`);
      if (failedAttempts && parseInt(failedAttempts) >= config.maxLoginAttempts) {
        throw new Error('Account temporarily locked. Try again later.');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(data.password, user.password);
      if (!isValidPassword) {
        // Increment failed attempts
        await redis.incr(`failed:login:${user.id}`);
        await redis.expire(`failed:login:${user.id}`, config.loginLockoutTime / 1000);
        
        throw new Error('Invalid email or password');
      }

      // Check user status
      if (user.status !== 'ACTIVE') {
        if (user.status === 'PENDING') {
          throw new Error('Please verify your email before logging in');
        }
        throw new Error(`Account is ${user.status.toLowerCase()}`);
      }

      // Reset failed attempts
      await redis.del(`failed:login:${user.id}`);

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // Calculate expiry
      const accessExpiry = data.rememberMe ? '7d' : config.jwtAccessExpiry;
      const refreshExpiry = data.rememberMe ? '30d' : config.jwtRefreshExpiry;

      // Create session
      const session = await prisma.userSession.create({
        data: {
          userId: user.id,
          sessionToken: uuidv4(),
          refreshToken,
          ipAddress,
          userAgent,
          expiresAt: new Date(Date.now() + this.parseExpiry(refreshExpiry)),
          lastActivity: new Date(),
          isActive: true,
        },
      });

      // Store refresh token in Redis
      await redis.setex(
        `refresh:${refreshToken}`,
        this.parseExpiry(refreshExpiry) / 1000,
        user.id
      );

      // Check for suspicious login
      await this.checkSuspiciousLogin(user.id, ipAddress, userAgent);

      logger.info(`User logged in: ${user.id}`);

      return {
        accessToken,
        refreshToken,
        expiresIn: this.parseExpiry(accessExpiry) / 1000,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          accountType: user.accountType,
          displayName: user.profile?.displayName,
          avatarUrl: user.profile?.avatarUrl,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
        },
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token exists in Redis
      const userId = await redis.get(`refresh:${refreshToken}`);
      if (!userId) {
        throw new Error('Invalid refresh token');
      }

      // Find session
      const session = await prisma.userSession.findFirst({
        where: {
          refreshToken,
          expiresAt: { gt: new Date() },
          isActive: true,
        },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      });

      if (!session) {
        await redis.del(`refresh:${refreshToken}`);
        throw new Error('Session expired');
      }

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(session.user);
      const newRefreshToken = this.generateRefreshToken(session.user);

      // Update session
      await prisma.userSession.update({
        where: { id: session.id },
        data: {
          refreshToken: newRefreshToken,
          expiresAt: new Date(Date.now() + this.parseExpiry(config.jwtRefreshExpiry)),
          lastActivity: new Date(),
        },
      });

      // Update Redis
      await redis.del(`refresh:${refreshToken}`);
      await redis.setex(
        `refresh:${newRefreshToken}`,
        this.parseExpiry(config.jwtRefreshExpiry) / 1000,
        userId
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: this.parseExpiry(config.jwtAccessExpiry) / 1000,
      };
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(refreshToken: string) {
    try {
      // Remove from Redis
      await redis.del(`refresh:${refreshToken}`);

      // Invalidate session
      await prisma.userSession.updateMany({
        where: { refreshToken },
        data: { isActive: false },
      });
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string) {
    try {
      // Get all sessions
      const sessions = await prisma.userSession.findMany({
        where: { userId, isActive: true },
      });

      // Remove all refresh tokens from Redis
      for (const session of sessions) {
        await redis.del(`refresh:${session.refreshToken}`);
      }

      // Invalidate all sessions
      await prisma.userSession.updateMany({
        where: { userId },
        data: { isActive: false },
      });

      logger.info(`User ${userId} logged out from all devices`);
    } catch (error) {
      logger.error('Logout all error:', error);
      throw error;
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string) {
    try {
      const verification = await prisma.emailVerification.findFirst({
        where: {
          token,
          expiresAt: { gt: new Date() },
          verified: false,
        },
      });

      if (!verification) {
        throw new Error('Invalid or expired verification token');
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: verification.userId },
          data: { emailVerified: true },
        }),
        prisma.emailVerification.update({
          where: { id: verification.id },
          data: { verified: true, verifiedAt: new Date() },
        }),
      ]);

      // Check if user is fully verified
      await this.checkUserVerificationStatus(verification.userId);

      logger.info(`Email verified for user ${verification.userId}`);
    } catch (error) {
      logger.error('Email verification error:', error);
      throw error;
    }
  }

  /**
   * Verify phone with OTP
   */
  async verifyPhone(userId: string, code: string) {
    try {
      const verification = await prisma.phoneVerification.findFirst({
        where: {
          userId,
          code,
          expiresAt: { gt: new Date() },
          verified: false,
        },
      });

      if (!verification) {
        throw new Error('Invalid or expired verification code');
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { phoneVerified: true },
        }),
        prisma.phoneVerification.update({
          where: { id: verification.id },
          data: { verified: true, verifiedAt: new Date() },
        }),
      ]);

      // Check if user is fully verified
      await this.checkUserVerificationStatus(userId);

      logger.info(`Phone verified for user ${userId}`);
    } catch (error) {
      logger.error('Phone verification error:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Don't reveal if user exists
        return;
      }

      // Generate reset token
      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      // Send reset email
      await emailService.send({
        to: email,
        subject: 'Reset Your Password - VIRAZ',
        template: 'password-reset',
        data: {
          name: user.username,
          link: `${process.env.FRONTEND_URL}/reset-password?token=${token}`,
        },
      });

      logger.info(`Password reset requested for ${email}`);
    } catch (error) {
      logger.error('Password reset request error:', error);
      throw error;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string) {
    try {
      const reset = await prisma.passwordReset.findFirst({
        where: {
          token,
          expiresAt: { gt: new Date() },
          used: false,
        },
      });

      if (!reset) {
        throw new Error('Invalid or expired reset token');
      }

      // Validate password
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors[0]);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, config.bcryptRounds);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: reset.userId },
          data: { password: hashedPassword },
        }),
        prisma.passwordReset.update({
          where: { id: reset.id },
          data: { used: true, usedAt: new Date() },
        }),
      ]);

      // Invalidate all sessions
      await prisma.userSession.updateMany({
        where: { userId: reset.userId },
        data: { isActive: false },
      });

      // Send confirmation email
      const user = await prisma.user.findUnique({
        where: { id: reset.userId },
      });

      if (user) {
        await emailService.send({
          to: user.email,
          subject: 'Password Changed Successfully',
          template: 'password-changed',
          data: {
            name: user.username,
          },
        });
      }

      logger.info(`Password reset for user ${reset.userId}`);
    } catch (error) {
      logger.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Change password (authenticated)
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors[0]);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, config.bcryptRounds);

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      // Invalidate all sessions except current
      await prisma.userSession.updateMany({
        where: {
          userId,
          isActive: true,
        },
        data: { isActive: false },
      });

      // Send notification
      await notificationService.create({
        userId,
        type: 'SYSTEM',
        title: '🔐 Password Changed',
        body: 'Your password was successfully changed. If you did not request this, please contact support immediately.',
        data: {
          screen: 'security',
          action: 'alerts',
        },
      });

      logger.info(`Password changed for user ${userId}`);
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Generate access token
   */
  private generateAccessToken(user: any): string {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.accountType,
      type: 'access',
    };

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtAccessExpiry,
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
    });
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(user: any): string {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.accountType,
      type: 'refresh',
    };

    return jwt.sign(payload, config.jwtRefreshSecret, {
      expiresIn: config.jwtRefreshExpiry,
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
    });
  }

  /**
   * Parse expiry string to milliseconds
   */
  private parseExpiry(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 15 * 60 * 1000; // 15 minutes default
    }
  }

  /**
   * Check for suspicious login
   */
  private async checkSuspiciousLogin(userId: string, ipAddress?: string, userAgent?: string) {
    try {
      // Get previous logins
      const previousLogins = await prisma.userSession.findMany({
        where: { userId },
        orderBy: { lastActivity: 'desc' },
        take: 5,
      });

      if (previousLogins.length === 0) return;

      const lastLogin = previousLogins[0];

      // Check for different IP
      if (ipAddress && lastLogin.ipAddress && lastLogin.ipAddress !== ipAddress) {
        // Get geolocation for both IPs
        const [oldLocation, newLocation] = await Promise.all([
          this.getGeoLocation(lastLogin.ipAddress),
          this.getGeoLocation(ipAddress),
        ]);

        // If locations are far apart and time difference is small, it's suspicious
        if (oldLocation && newLocation && oldLocation.country !== newLocation.country) {
          const timeDiff = Date.now() - new Date(lastLogin.lastActivity).getTime();
          if (timeDiff < 60 * 60 * 1000) { // Less than 1 hour
            await notificationService.create({
              userId,
              type: 'SYSTEM',
              priority: 'high',
              title: '⚠️ Suspicious Login Detected',
              body: `New login from ${newLocation.city}, ${newLocation.country}`,
              data: {
                screen: 'security',
                action: 'alerts',
              },
            });
          }
        }
      }

      // Check for different user agent
      if (userAgent && lastLogin.userAgent && lastLogin.userAgent !== userAgent) {
        const timeDiff = Date.now() - new Date(lastLogin.lastActivity).getTime();
        if (timeDiff < 15 * 60 * 1000) { // Less than 15 minutes
          await notificationService.create({
            userId,
            type: 'SYSTEM',
            priority: 'medium',
            title: '👤 New Device Detected',
            body: 'A login from a new device was detected',
            data: {
              screen: 'security',
              action: 'devices',
            },
          });
        }
      }
    } catch (error) {
      logger.error('Error checking suspicious login:', error);
    }
  }

  /**
   * Get geolocation from IP
   */
  private async getGeoLocation(ip: string): Promise<{ city: string; country: string } | null> {
    try {
      // Try cache first
      const cached = await redis.get(`geo:${ip}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Use IP geolocation service (mock for now)
      const result = {
        city: 'Unknown',
        country: 'Unknown',
      };

      await redis.setex(`geo:${ip}`, 86400, JSON.stringify(result));
      return result;
    } catch (error) {
      logger.error('Error getting geolocation:', error);
      return null;
    }
  }

  /**
   * Check user verification status
   */
  private async checkUserVerificationStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true, phoneVerified: true },
    });

    if (user?.emailVerified && (user.phoneVerified || !user.phone)) {
      // User is fully verified, activate account
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE' },
      });

      // Send welcome email
      const userData = await prisma.user.findUnique({
        where: { id: userId },
      });

      await emailService.send({
        to: userData?.email,
        subject: 'Welcome to VIRAZ!',
        template: 'welcome',
        data: {
          name: userData?.username,
        },
      });

      logger.info(`User ${userId} fully verified and activated`);
    }
  }

  /**
   * Get active sessions
   */
  async getActiveSessions(userId: string) {
    return prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivity: 'desc' },
    });
  }

  /**
   * Revoke session
   */
  async revokeSession(sessionId: string, userId: string) {
    const session = await prisma.userSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    await prisma.userSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    await redis.del(`refresh:${session.refreshToken}`);
  }
}

export const authService = new AuthService();