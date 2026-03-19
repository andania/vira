/**
 * Achievement Service
 * Handles user achievements and badge management
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { notificationService } from '../../notifications/services/notification.service';
import { rewardService } from '../../engagement/services/reward.service';

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  requirementType: string;
  requirementValue: number;
  rewardCap: number;
  rewardBadge?: string;
  iconUrl?: string;
}

export interface UserAchievement {
  achievementId: string;
  progress: number;
  completed: boolean;
  completedAt?: Date;
  rewardClaimed: boolean;
}

export class AchievementService {
  /**
   * Get all achievements
   */
  async getAllAchievements(): Promise<Achievement[]> {
    try {
      const cacheKey = 'achievements:all';
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const achievements = await prisma.achievement.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      await redis.setex(cacheKey, 3600, JSON.stringify(achievements));
      return achievements;
    } catch (error) {
      logger.error('Error getting all achievements:', error);
      throw error;
    }
  }

  /**
   * Get user's achievements
   */
  async getUserAchievements(userId: string) {
    try {
      const [allAchievements, userAchievements] = await Promise.all([
        this.getAllAchievements(),
        prisma.userAchievement.findMany({
          where: { userId },
        }),
      ]);

      const userAchievementMap = new Map(
        userAchievements.map(ua => [ua.achievementId, ua])
      );

      return allAchievements.map(achievement => ({
        ...achievement,
        progress: userAchievementMap.get(achievement.id)?.progress || 0,
        completed: userAchievementMap.get(achievement.id)?.completed || false,
        completedAt: userAchievementMap.get(achievement.id)?.completedAt,
        rewardClaimed: userAchievementMap.get(achievement.id)?.rewardClaimed || false,
      }));
    } catch (error) {
      logger.error('Error getting user achievements:', error);
      throw error;
    }
  }

  /**
   * Check and update achievement progress
   */
  async checkAchievements(userId: string, type: string, value: number = 1) {
    try {
      const achievements = await this.getAchievementsByType(type);
      const userAchievements = await prisma.userAchievement.findMany({
        where: { userId },
      });

      const userAchievementMap = new Map(
        userAchievements.map(ua => [ua.achievementId, ua])
      );

      for (const achievement of achievements) {
        let currentProgress = userAchievementMap.get(achievement.id)?.progress || 0;
        let completed = userAchievementMap.get(achievement.id)?.completed || false;

        if (!completed) {
          currentProgress += value;
          
          // Check if achievement is now complete
          if (currentProgress >= achievement.requirementValue) {
            await this.completeAchievement(userId, achievement.id);
          } else {
            // Update progress
            await prisma.userAchievement.upsert({
              where: {
                userId_achievementId: {
                  userId,
                  achievementId: achievement.id,
                },
              },
              update: { progress: currentProgress },
              create: {
                userId,
                achievementId: achievement.id,
                progress: currentProgress,
                completed: false,
              },
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error checking achievements:', error);
      throw error;
    }
  }

  /**
   * Complete an achievement
   */
  async completeAchievement(userId: string, achievementId: string) {
    try {
      const achievement = await prisma.achievement.findUnique({
        where: { id: achievementId },
      });

      if (!achievement) {
        throw new Error('Achievement not found');
      }

      await prisma.$transaction(async (tx) => {
        // Update user achievement
        await tx.userAchievement.upsert({
          where: {
            userId_achievementId: {
              userId,
              achievementId,
            },
          },
          update: {
            completed: true,
            completedAt: new Date(),
            progress: achievement.requirementValue,
          },
          create: {
            userId,
            achievementId,
            completed: true,
            completedAt: new Date(),
            progress: achievement.requirementValue,
          },
        });

        // Award CAP reward
        if (achievement.rewardCap > 0) {
          await rewardService.awardReward({
            userId,
            action: 'achievement',
            targetType: 'achievement',
            targetId: achievementId,
            amount: achievement.rewardCap,
          });
        }

        // Award badge if applicable
        if (achievement.rewardBadge) {
          await tx.userBadge.create({
            data: {
              userId,
              badgeId: achievement.rewardBadge,
            },
          });
        }
      });

      // Send notification
      await notificationService.create({
        userId,
        type: 'ACHIEVEMENT',
        title: '🏆 Achievement Unlocked!',
        body: `You earned the "${achievement.name}" achievement!`,
        data: {
          screen: 'profile',
          action: 'achievements',
          id: achievementId,
        },
      });

      logger.info(`User ${userId} completed achievement: ${achievement.name}`);
    } catch (error) {
      logger.error('Error completing achievement:', error);
      throw error;
    }
  }

  /**
   * Get achievements by type
   */
  async getAchievementsByType(type: string): Promise<Achievement[]> {
    try {
      const cacheKey = `achievements:type:${type}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const achievements = await prisma.achievement.findMany({
        where: {
          requirementType: type,
          isActive: true,
        },
      });

      await redis.setex(cacheKey, 3600, JSON.stringify(achievements));
      return achievements;
    } catch (error) {
      logger.error('Error getting achievements by type:', error);
      throw error;
    }
  }

  /**
   * Get achievement progress
   */
  async getAchievementProgress(userId: string, achievementId: string): Promise<number> {
    try {
      const userAchievement = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId,
            achievementId,
          },
        },
      });

      return userAchievement?.progress || 0;
    } catch (error) {
      logger.error('Error getting achievement progress:', error);
      throw error;
    }
  }

  /**
   * Claim achievement reward
   */
  async claimReward(userId: string, achievementId: string) {
    try {
      const userAchievement = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId,
            achievementId,
          },
        },
        include: {
          achievement: true,
        },
      });

      if (!userAchievement || !userAchievement.completed) {
        throw new Error('Achievement not completed');
      }

      if (userAchievement.rewardClaimed) {
        throw new Error('Reward already claimed');
      }

      await prisma.$transaction(async (tx) => {
        // Mark as claimed
        await tx.userAchievement.update({
          where: {
            userId_achievementId: {
              userId,
              achievementId,
            },
          },
          data: { rewardClaimed: true },
        });

        // Award CAP
        if (userAchievement.achievement.rewardCap > 0) {
          await rewardService.awardReward({
            userId,
            action: 'achievement_claim',
            targetType: 'achievement',
            targetId: achievementId,
            amount: userAchievement.achievement.rewardCap,
          });
        }
      });

      return { success: true };
    } catch (error) {
      logger.error('Error claiming achievement reward:', error);
      throw error;
    }
  }

  /**
   * Get achievement statistics
   */
  async getAchievementStats(userId: string) {
    try {
      const [total, completed, inProgress] = await Promise.all([
        prisma.achievement.count({ where: { isActive: true } }),
        prisma.userAchievement.count({
          where: {
            userId,
            completed: true,
          },
        }),
        prisma.userAchievement.count({
          where: {
            userId,
            completed: false,
            progress: { gt: 0 },
          },
        }),
      ]);

      const recentAchievements = await prisma.userAchievement.findMany({
        where: {
          userId,
          completed: true,
        },
        orderBy: { completedAt: 'desc' },
        take: 5,
        include: {
          achievement: true,
        },
      });

      return {
        total,
        completed,
        inProgress,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
        recentAchievements: recentAchievements.map(ua => ({
          id: ua.achievement.id,
          name: ua.achievement.name,
          completedAt: ua.completedAt,
        })),
      };
    } catch (error) {
      logger.error('Error getting achievement stats:', error);
      throw error;
    }
  }

  /**
   * Get top achievers
   */
  async getTopAchievers(limit: number = 10) {
    try {
      const topUsers = await prisma.userAchievement.groupBy({
        by: ['userId'],
        where: { completed: true },
        _count: true,
        orderBy: {
          _count: {
            userId: 'desc',
          },
        },
        take: limit,
      });

      const userIds = topUsers.map(u => u.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          username: true,
          profile: {
            select: {
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });

      const userMap = new Map(users.map(u => [u.id, u]));

      return topUsers.map((user, index) => ({
        rank: index + 1,
        userId: user.userId,
        username: userMap.get(user.userId)?.username,
        displayName: userMap.get(user.userId)?.profile?.displayName,
        avatarUrl: userMap.get(user.userId)?.profile?.avatarUrl,
        achievementCount: user._count,
      }));
    } catch (error) {
      logger.error('Error getting top achievers:', error);
      throw error;
    }
  }
}

export const achievementService = new AchievementService();