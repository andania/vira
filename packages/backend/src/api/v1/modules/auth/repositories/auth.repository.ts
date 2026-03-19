/**
 * Auth Repository
 * Handles database operations for authentication
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

export class AuthRepository extends BaseRepository<any, any, any> {
  protected modelName = 'user';
  protected prismaModel = prisma.user;

  /**
   * Find user by email with relations
   */
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        preferences: true,
        wallet: true,
      },
    });
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
      include: {
        profile: true,
      },
    });
  }

  /**
   * Find user by phone
   */
  async findByPhone(phone: string) {
    return prisma.user.findUnique({
      where: { phone },
    });
  }

  /**
   * Create user with profile in transaction
   */
  async createUserWithProfile(data: {
    username: string;
    email: string;
    phone?: string;
    password: string;
    accountType: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: data.username,
          email: data.email,
          phone: data.phone,
          password: data.password,
          accountType: data.accountType as any,
          status: 'PENDING',
        },
      });

      await tx.userProfile.create({
        data: {
          userId: user.id,
          displayName: data.username,
        },
      });

      await tx.userPreference.create({
        data: {
          userId: user.id,
        },
      });

      await tx.capWallet.create({
        data: {
          userId: user.id,
          balance: 0,
          lifetimeEarned: 0,
          lifetimeSpent: 0,
        },
      });

      if (data.accountType === 'SPONSOR') {
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
  }

  /**
   * Update last login
   */
  async updateLastLogin(userId: string, ipAddress?: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });
  }

  /**
   * Get login history
   */
  async getLoginHistory(userId: string, limit: number = 50) {
    return prisma.userSession.findMany({
      where: { userId },
      orderBy: { lastActivity: 'desc' },
      take: limit,
    });
  }

  /**
   * Get failed login attempts
   */
  async getFailedAttempts(email: string, since: Date) {
    return prisma.loginAttempt.count({
      where: {
        email,
        success: false,
        createdAt: { gte: since },
      },
    });
  }

  /**
   * Record login attempt
   */
  async recordLoginAttempt(email: string, success: boolean, ipAddress?: string) {
    return prisma.loginAttempt.create({
      data: {
        email,
        success,
        ipAddress,
      },
    });
  }

  /**
   * Create email verification
   */
  async createEmailVerification(userId: string, email: string, token: string) {
    return prisma.emailVerification.create({
      data: {
        userId,
        email,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  }

  /**
   * Find email verification by token
   */
  async findEmailVerification(token: string) {
    return prisma.emailVerification.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
        verified: false,
      },
    });
  }

  /**
   * Create phone verification
   */
  async createPhoneVerification(userId: string, phone: string, code: string) {
    return prisma.phoneVerification.create({
      data: {
        userId,
        phone,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
  }

  /**
   * Find phone verification
   */
  async findPhoneVerification(userId: string, code: string) {
    return prisma.phoneVerification.findFirst({
      where: {
        userId,
        code,
        expiresAt: { gt: new Date() },
        verified: false,
      },
    });
  }

  /**
   * Create password reset
   */
  async createPasswordReset(userId: string, token: string) {
    return prisma.passwordReset.create({
      data: {
        userId,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
  }

  /**
   * Find password reset by token
   */
  async findPasswordReset(token: string) {
    return prisma.passwordReset.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
        used: false,
      },
    });
  }

  /**
   * Use password reset
   */
  async usePasswordReset(id: string) {
    return prisma.passwordReset.update({
      where: { id },
      data: {
        used: true,
        usedAt: new Date(),
      },
    });
  }

  /**
   * Create OAuth account
   */
  async createOAuthAccount(data: {
    userId: string;
    provider: string;
    providerUserId: string;
    providerEmail?: string;
  }) {
    return prisma.oAuthAccount.create({
      data,
    });
  }

  /**
   * Find OAuth account
   */
  async findOAuthAccount(provider: string, providerUserId: string) {
    return prisma.oAuthAccount.findFirst({
      where: {
        provider,
        providerUserId,
      },
      include: {
        user: true,
      },
    });
  }

  /**
   * Get user's OAuth accounts
   */
  async getUserOAuthAccounts(userId: string) {
    return prisma.oAuthAccount.findMany({
      where: { userId },
      select: {
        provider: true,
        providerEmail: true,
        createdAt: true,
      },
    });
  }

  /**
   * Delete OAuth account
   */
  async deleteOAuthAccount(userId: string, provider: string) {
    return prisma.oAuthAccount.deleteMany({
      where: {
        userId,
        provider,
      },
    });
  }

  /**
   * Get active sessions count
   */
  async getActiveSessionsCount(userId: string): Promise<number> {
    return prisma.userSession.count({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
  }

  /**
   * Cleanup expired verifications
   */
  async cleanupExpiredVerifications() {
    const now = new Date();
    
    await prisma.$transaction([
      prisma.emailVerification.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      prisma.phoneVerification.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      prisma.passwordReset.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
    ]);
  }
}

export const authRepository = new AuthRepository();