/**
 * User Service
 * Handles user profile management, preferences, and account operations
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { cacheService } from '../../../../../core/cache/cache.service';
import { notificationService } from '../../../notifications/services/notification.service';
import { ApiErrorCode, validateUsername, validateEmail, validatePhone } from '@viraz/shared';

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  gender?: string;
  birthDate?: Date;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  website?: string;
  occupation?: string;
  company?: string;
  education?: string;
  interests?: string[];
}

export interface UpdatePreferencesData {
  notificationPush?: boolean;
  notificationEmail?: boolean;
  notificationSms?: boolean;
  notificationMarketing?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  contentLanguage?: string[];
  contentCategories?: string[];
  contentSensitivity?: boolean;
  theme?: 'light' | 'dark' | 'system';
  autoplayVideos?: boolean;
  dataSaverMode?: boolean;
}

export class UserService {
  /**
   * Get user by ID with profile
   */
  async getUserById(userId: string) {
    try {
      // Try cache first
      const cached = await cacheService.getUser(userId);
      if (cached) {
        return cached;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          preferences: true,
          statistics: true,
          wallet: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Remove sensitive data
      const { password, ...safeUser } = user;

      // Cache for 1 hour
      await cacheService.cacheUser(userId, safeUser, { ttl: 3600 });

      return safeUser;
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw error;
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { username },
        include: {
          profile: true,
          statistics: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const { password, ...safeUser } = user;
      return safeUser;
    } catch (error) {
      logger.error('Error getting user by username:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: UpdateProfileData) {
    try {
      const profile = await prisma.userProfile.upsert({
        where: { userId },
        update: data,
        create: {
          userId,
          ...data,
        },
      });

      // Invalidate cache
      await cacheService.invalidateUser(userId);

      logger.info(`Profile updated for user ${userId}`);
      return profile;
    } catch (error) {
      logger.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, data: UpdatePreferencesData) {
    try {
      const preferences = await prisma.userPreference.upsert({
        where: { userId },
        update: data,
        create: {
          userId,
          ...data,
        },
      });

      // Invalidate cache
      await cacheService.invalidateUser(userId);

      logger.info(`Preferences updated for user ${userId}`);
      return preferences;
    } catch (error) {
      logger.error('Error updating preferences:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(userId: string) {
    try {
      let stats = await prisma.userStatistics.findUnique({
        where: { userId },
      });

      if (!stats) {
        // Calculate stats on demand
        stats = await this.calculateUserStatistics(userId);
      }

      return stats;
    } catch (error) {
      logger.error('Error getting user statistics:', error);
      throw error;
    }
  }

  /**
   * Calculate user statistics
   */
  private async calculateUserStatistics(userId: string) {
    const [
      totalCapEarned,
      totalCapSpent,
      totalAdsWatched,
      totalRoomsJoined,
      totalComments,
      totalLikesGiven,
      totalShares,
      totalSuggestions,
      totalFollowers,
      totalFollowing,
    ] = await Promise.all([
      prisma.capTransaction.aggregate({
        where: { wallet: { userId }, type: 'EARN' },
        _sum: { amount: true },
      }),
      prisma.capTransaction.aggregate({
        where: { wallet: { userId }, type: 'SPEND' },
        _sum: { amount: true },
      }),
      prisma.contentView.count({
        where: { userId, targetType: 'ad' },
      }),
      prisma.roomParticipant.count({
        where: { userId },
      }),
      prisma.comment.count({
        where: { userId },
      }),
      prisma.like.count({
        where: { userId },
      }),
      prisma.share.count({
        where: { userId },
      }),
      prisma.suggestion.count({
        where: { userId },
      }),
      prisma.userFollow.count({
        where: { followingId: userId },
      }),
      prisma.userFollow.count({
        where: { followerId: userId },
      }),
    ]);

    // Calculate streak
    const lastActivity = await prisma.userActivityLog.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    let dailyStreak = 0;
    if (lastActivity) {
      const daysSinceLastActivity = Math.floor(
        (Date.now() - lastActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastActivity <= 1) {
        dailyStreak = await this.calculateStreak(userId);
      }
    }

    const stats = await prisma.userStatistics.upsert({
      where: { userId },
      update: {
        totalCapEarned: totalCapEarned._sum.amount || 0,
        totalCapSpent: totalCapSpent._sum.amount || 0,
        totalAdsWatched,
        totalRoomsJoined,
        totalComments,
        totalLikesGiven,
        totalShares,
        totalSuggestions,
        totalFollowers,
        totalFollowing,
        dailyStreak,
        engagementRate: await this.calculateEngagementRate(userId),
      },
      create: {
        userId,
        totalCapEarned: totalCapEarned._sum.amount || 0,
        totalCapSpent: totalCapSpent._sum.amount || 0,
        totalAdsWatched,
        totalRoomsJoined,
        totalComments,
        totalLikesGiven,
        totalShares,
        totalSuggestions,
        totalFollowers,
        totalFollowing,
        dailyStreak,
        engagementRate: await this.calculateEngagementRate(userId),
      },
    });

    return stats;
  }

  /**
   * Calculate user engagement rate
   */
  private async calculateEngagementRate(userId: string): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalViews, totalEngagements] = await Promise.all([
      prisma.contentView.count({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.userEngagement.count({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    if (totalViews === 0) return 0;
    return (totalEngagements / totalViews) * 100;
  }

  /**
   * Calculate user streak
   */
  private async calculateStreak(userId: string): Promise<number> {
    const activities = await prisma.userActivityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { createdAt: true },
    });

    if (activities.length === 0) return 0;

    let streak = 1;
    let currentDate = activities[0].createdAt;

    for (let i = 1; i < activities.length; i++) {
      const prevDate = activities[i].createdAt;
      const dayDiff = Math.floor(
        (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (dayDiff === 1) {
        streak++;
        currentDate = prevDate;
      } else if (dayDiff > 1) {
        break;
      }
    }

    return streak;
  }

  /**
   * Update last active timestamp
   */
  async updateLastActive(userId: string) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: new Date() },
      });

      await prisma.userActivityLog.create({
        data: {
          userId,
          activityType: 'active',
        },
      });
    } catch (error) {
      logger.error('Error updating last active:', error);
    }
  }

  /**
   * Search users
   */
  async searchUsers(query: string, limit: number = 20, offset: number = 0) {
    try {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { profile: { displayName: { contains: query, mode: 'insensitive' } } },
          ],
          status: 'ACTIVE',
        },
        select: {
          id: true,
          username: true,
          email: true,
          profile: {
            select: {
              displayName: true,
              avatarUrl: true,
            },
          },
          statistics: {
            select: {
              totalFollowers: true,
              totalCapEarned: true,
            },
          },
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      });

      const total = await prisma.user.count({
        where: {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { profile: { displayName: { contains: query, mode: 'insensitive' } } },
          ],
          status: 'ACTIVE',
        },
      });

      return {
        users,
        total,
        limit,
        offset,
      };
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateAccount(userId: string, reason?: string) {
    try {
      await prisma.$transaction(async (tx) => {
        // Update user status
        await tx.user.update({
          where: { id: userId },
          data: {
            status: 'DEACTIVATED',
            deactivatedAt: new Date(),
            deactivationReason: reason,
          },
        });

        // Invalidate all sessions
        await tx.userSession.updateMany({
          where: { userId },
          data: { isActive: false },
        });

        // Clear Redis sessions
        const socketIds = await redis.smembers(`user:sockets:${userId}`);
        for (const socketId of socketIds) {
          await redis.del(`socket:${socketId}`);
        }
        await redis.del(`user:sockets:${userId}`);
        await redis.del(`user:status:${userId}`);
      });

      // Invalidate cache
      await cacheService.invalidateUser(userId);

      logger.info(`User ${userId} deactivated: ${reason || 'No reason provided'}`);

      // Send notification
      await notificationService.create({
        userId,
        type: 'SYSTEM',
        title: 'Account Deactivated',
        body: 'Your account has been deactivated. You can reactivate by logging in again.',
        data: { screen: 'auth' },
      });

    } catch (error) {
      logger.error('Error deactivating account:', error);
      throw error;
    }
  }

  /**
   * Delete user account (permanent)
   */
  async deleteAccount(userId: string, password: string) {
    try {
      // Verify password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        throw new Error('Invalid password');
      }

      // Soft delete (will be permanently deleted by cleanup job after 30 days)
      await prisma.user.update({
        where: { id: userId },
        data: { deletedAt: new Date() },
      });

      // Invalidate all sessions
      await prisma.userSession.updateMany({
        where: { userId },
        data: { isActive: false },
      });

      // Clear Redis
      const socketIds = await redis.smembers(`user:sockets:${userId}`);
      for (const socketId of socketIds) {
        await redis.del(`socket:${socketId}`);
      }
      await redis.del(`user:sockets:${userId}`);
      await redis.del(`user:status:${userId}`);

      // Invalidate cache
      await cacheService.invalidateUser(userId);

      logger.info(`User ${userId} marked for deletion`);

    } catch (error) {
      logger.error('Error deleting account:', error);
      throw error;
    }
  }

  /**
   * Check if username is available
   */
  async isUsernameAvailable(username: string): Promise<boolean> {
    if (!validateUsername(username)) {
      return false;
    }

    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    return !existing;
  }

  /**
   * Check if email is available
   */
  async isEmailAvailable(email: string): Promise<boolean> {
    if (!validateEmail(email)) {
      return false;
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    return !existing;
  }

  /**
   * Get user activity feed
   */
  async getUserActivity(userId: string, limit: number = 50, offset: number = 0) {
    try {
      const activities = await prisma.userActivityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      const total = await prisma.userActivityLog.count({
        where: { userId },
      });

      return {
        activities,
        total,
        limit,
        offset,
      };
    } catch (error) {
      logger.error('Error getting user activity:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
export default userService;