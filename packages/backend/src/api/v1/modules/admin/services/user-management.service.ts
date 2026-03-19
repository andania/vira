/**
 * User Management Service
 * Handles admin operations for user management
 */

import { prisma } from '../../../../../core/database/client';
import { logger } from '../../../../../core/logger';
import { notificationService } from '../../notifications/services/notification.service';
import { walletService } from '../../wallet/services/wallet.service';
import { subDays } from '@viraz/shared';

export interface UserFilter {
  status?: string;
  accountType?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class UserManagementService {
  /**
   * Get all users with filtering and pagination
   */
  async getUsers(filters: UserFilter = {}) {
    try {
      const {
        status,
        accountType,
        search,
        startDate,
        endDate,
        limit = 50,
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = filters;

      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (accountType) {
        where.accountType = accountType;
      }

      if (search) {
        where.OR = [
          { username: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { profile: { displayName: { contains: search, mode: 'insensitive' } } },
        ];
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy,
          take: limit,
          skip: offset,
          include: {
            profile: true,
            statistics: true,
            wallet: {
              select: {
                balance: true,
                isFrozen: true,
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      return { users, total };
    } catch (error) {
      logger.error('Error getting users:', error);
      throw error;
    }
  }

  /**
   * Get user details by ID
   */
  async getUserDetails(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          preferences: true,
          statistics: true,
          wallet: true,
          sessions: {
            orderBy: { lastActivity: 'desc' },
            take: 10,
          },
          devices: true,
          reports: {
            where: { status: 'pending' },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get additional stats
      const [totalSpent, totalEarned, recentActivity] = await Promise.all([
        prisma.capTransaction.aggregate({
          where: {
            wallet: { userId },
            type: 'SPEND',
          },
          _sum: { amount: true },
        }),
        prisma.capTransaction.aggregate({
          where: {
            wallet: { userId },
            type: 'EARN',
          },
          _sum: { amount: true },
        }),
        prisma.userEngagement.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      ]);

      return {
        ...user,
        stats: {
          totalSpent: Math.abs(totalSpent._sum.amount || 0),
          totalEarned: totalEarned._sum.amount || 0,
          recentActivity,
        },
      };
    } catch (error) {
      logger.error('Error getting user details:', error);
      throw error;
    }
  }

  /**
   * Update user status
   */
  async updateUserStatus(userId: string, status: string, reason?: string) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { status },
      });

      // Send notification
      await notificationService.create({
        userId,
        type: 'SYSTEM',
        title: 'Account Status Updated',
        body: `Your account status has been changed to ${status}${reason ? ': ' + reason : ''}`,
        data: {
          screen: 'profile',
          action: 'settings',
        },
      });

      logger.info(`User ${userId} status updated to ${status}`);
      return user;
    } catch (error) {
      logger.error('Error updating user status:', error);
      throw error;
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: string) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { accountType: role as any },
      });

      logger.info(`User ${userId} role updated to ${role}`);
      return user;
    } catch (error) {
      logger.error('Error updating user role:', error);
      throw error;
    }
  }

  /**
   * Verify user
   */
  async verifyUser(userId: string, type: string) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          [`${type}Verified`]: true,
        },
      });

      await notificationService.create({
        userId,
        type: 'SYSTEM',
        title: '✓ Verification Successful',
        body: `Your ${type} has been verified successfully.`,
        data: {
          screen: 'profile',
          action: 'verification',
        },
      });

      logger.info(`User ${userId} ${type} verified`);
      return user;
    } catch (error) {
      logger.error('Error verifying user:', error);
      throw error;
    }
  }

  /**
   * Suspend user
   */
  async suspendUser(userId: string, reason: string, duration?: number) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          status: 'SUSPENDED',
        },
      });

      // Invalidate all sessions
      await prisma.userSession.updateMany({
        where: { userId },
        data: { isActive: false },
      });

      await notificationService.create({
        userId,
        type: 'SYSTEM',
        priority: 'high',
        title: '⚠️ Account Suspended',
        body: `Your account has been suspended. Reason: ${reason}${duration ? ` for ${duration} days` : ''}`,
        data: {
          screen: 'support',
          action: 'contact',
        },
      });

      // Schedule unsuspension if duration provided
      if (duration) {
        // This would be handled by a background job
        logger.info(`User ${userId} will be unsuspended in ${duration} days`);
      }

      logger.info(`User ${userId} suspended: ${reason}`);
      return user;
    } catch (error) {
      logger.error('Error suspending user:', error);
      throw error;
    }
  }

  /**
   * Unsuspend user
   */
  async unsuspendUser(userId: string) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE' },
      });

      await notificationService.create({
        userId,
        type: 'SYSTEM',
        title: '✓ Account Reactivated',
        body: 'Your account has been reactivated. You can now log in.',
        data: {
          screen: 'login',
          action: 'auth',
        },
      });

      logger.info(`User ${userId} unsuspended`);
      return user;
    } catch (error) {
      logger.error('Error unsuspending user:', error);
      throw error;
    }
  }

  /**
   * Ban user
   */
  async banUser(userId: string, reason: string, permanent: boolean = true) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          status: 'BANNED',
        },
      });

      // Freeze wallet
      await walletService.freezeWallet(userId, `Account banned: ${reason}`);

      // Invalidate all sessions
      await prisma.userSession.updateMany({
        where: { userId },
        data: { isActive: false },
      });

      // Add to blacklist
      await prisma.blacklistedUser.create({
        data: {
          userId,
          reason,
          blacklistedAt: new Date(),
        },
      });

      logger.info(`User ${userId} banned: ${reason}`);
      return user;
    } catch (error) {
      logger.error('Error banning user:', error);
      throw error;
    }
  }

  /**
   * Delete user (GDPR)
   */
  async deleteUser(userId: string) {
    try {
      // Anonymize user data instead of hard delete for GDPR compliance
      await prisma.$transaction(async (tx) => {
        // Anonymize user
        await tx.user.update({
          where: { id: userId },
          data: {
            username: `deleted_${Date.now()}`,
            email: `deleted_${Date.now()}@deleted.com`,
            phone: null,
            password: 'DELETED',
            status: 'DELETED',
            deletedAt: new Date(),
          },
        });

        // Anonymize profile
        await tx.userProfile.updateMany({
          where: { userId },
          data: {
            firstName: 'Deleted',
            lastName: 'User',
            displayName: 'Deleted User',
            avatarUrl: null,
            bio: null,
          },
        });

        // Delete sensitive data
        await tx.userDevice.deleteMany({ where: { userId } });
        await tx.userSession.deleteMany({ where: { userId } });
        await tx.userToken.deleteMany({ where: { userId } });
      });

      logger.info(`User ${userId} deleted (anonymized)`);
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Get user reports
   */
  async getUserReports(userId: string, limit: number = 50, offset: number = 0) {
    try {
      const [reports, total] = await Promise.all([
        prisma.report.findMany({
          where: { reportedUserId: userId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          include: {
            reporter: {
              select: {
                username: true,
                profile: {
                  select: {
                    displayName: true,
                  },
                },
              },
            },
          },
        }),
        prisma.report.count({ where: { reportedUserId: userId } }),
      ]);

      return { reports, total };
    } catch (error) {
      logger.error('Error getting user reports:', error);
      throw error;
    }
  }

  /**
   * Get user growth chart data
   */
  async getUserGrowth(days: number = 30) {
    try {
      const data = [];
      const today = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const count = await prisma.user.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        });

        data.push({
          date: date.toISOString().split('T')[0],
          count,
        });
      }

      return data;
    } catch (error) {
      logger.error('Error getting user growth:', error);
      throw error;
    }
  }

  /**
   * Export user data (GDPR)
   */
  async exportUserData(userId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          preferences: true,
          statistics: true,
          wallet: {
            include: {
              transactions: {
                take: 1000,
                orderBy: { createdAt: 'desc' },
              },
            },
          },
          engagements: {
            take: 1000,
            orderBy: { createdAt: 'desc' },
          },
          comments: {
            take: 1000,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return user;
    } catch (error) {
      logger.error('Error exporting user data:', error);
      throw error;
    }
  }

  /**
   * Get user statistics summary
   */
  async getUserStatsSummary() {
    try {
      const [
        total,
        active,
        newToday,
        byStatus,
        byType,
        verified,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: {
            lastActiveAt: { gte: subDays(new Date(), 7) },
          },
        }),
        prisma.user.count({
          where: {
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),
        prisma.user.groupBy({
          by: ['status'],
          _count: true,
        }),
        prisma.user.groupBy({
          by: ['accountType'],
          _count: true,
        }),
        prisma.user.count({
          where: {
            emailVerified: true,
          },
        }),
      ]);

      return {
        total,
        active,
        newToday,
        byStatus: byStatus.reduce((acc, curr) => {
          acc[curr.status] = curr._count;
          return acc;
        }, {} as Record<string, number>),
        byType: byType.reduce((acc, curr) => {
          acc[curr.accountType] = curr._count;
          return acc;
        }, {} as Record<string, number>),
        verified,
        verificationRate: total > 0 ? (verified / total) * 100 : 0,
      };
    } catch (error) {
      logger.error('Error getting user stats summary:', error);
      throw error;
    }
  }
}

export const userManagementService = new UserManagementService();