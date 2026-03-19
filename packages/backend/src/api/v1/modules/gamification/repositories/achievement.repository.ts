/**
 * Achievement Repository
 * Handles database operations for achievements
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

export class AchievementRepository extends BaseRepository<any, any, any> {
  protected modelName = 'achievement';
  protected prismaModel = prisma.achievement;

  /**
   * Get all achievements
   */
  async getAllAchievements(activeOnly: boolean = true) {
    return prisma.achievement.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Get achievements by category
   */
  async getAchievementsByCategory(category: string) {
    return prisma.achievement.findMany({
      where: {
        category,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Get achievements by requirement type
   */
  async getAchievementsByRequirementType(requirementType: string) {
    return prisma.achievement.findMany({
      where: {
        requirementType,
        isActive: true,
      },
    });
  }

  /**
   * Get user achievements
   */
  async getUserAchievements(userId: string) {
    return prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
    });
  }

  /**
   * Get user achievement
   */
  async getUserAchievement(userId: string, achievementId: string) {
    return prisma.userAchievement.findUnique({
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
  }

  /**
   * Create or update user achievement
   */
  async upsertUserAchievement(
    userId: string,
    achievementId: string,
    data: {
      progress?: number;
      completed?: boolean;
      completedAt?: Date;
      rewardClaimed?: boolean;
    }
  ) {
    return prisma.userAchievement.upsert({
      where: {
        userId_achievementId: {
          userId,
          achievementId,
        },
      },
      update: data,
      create: {
        userId,
        achievementId,
        ...data,
      },
    });
  }

  /**
   * Get completed achievements for user
   */
  async getCompletedAchievements(userId: string) {
    return prisma.userAchievement.findMany({
      where: {
        userId,
        completed: true,
      },
      include: {
        achievement: true,
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  /**
   * Get in-progress achievements for user
   */
  async getInProgressAchievements(userId: string) {
    return prisma.userAchievement.findMany({
      where: {
        userId,
        completed: false,
        progress: { gt: 0 },
      },
      include: {
        achievement: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Count user achievements
   */
  async countUserAchievements(userId: string, completed?: boolean) {
    return prisma.userAchievement.count({
      where: {
        userId,
        ...(completed !== undefined ? { completed } : {}),
      },
    });
  }

  /**
   * Get achievement statistics
   */
  async getAchievementStats() {
    const [total, active, byCategory] = await Promise.all([
      prisma.achievement.count(),
      prisma.achievement.count({ where: { isActive: true } }),
      prisma.achievement.groupBy({
        by: ['category'],
        _count: true,
      }),
    ]);

    return {
      total,
      active,
      byCategory: byCategory.reduce((acc, curr) => {
        acc[curr.category] = curr._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Get most earned achievements
   */
  async getMostEarnedAchievements(limit: number = 10) {
    const achievements = await prisma.userAchievement.groupBy({
      by: ['achievementId'],
      where: { completed: true },
      _count: true,
      orderBy: {
        _count: {
          achievementId: 'desc',
        },
      },
      take: limit,
    });

    const achievementIds = achievements.map(a => a.achievementId);
    
    return prisma.achievement.findMany({
      where: { id: { in: achievementIds } },
    });
  }
}

export const achievementRepository = new AchievementRepository();