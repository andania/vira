/**
 * Rank Repository
 * Handles database operations for user ranks
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

export class RankRepository extends BaseRepository<any, any, any> {
  protected modelName = 'userLevel';
  protected prismaModel = prisma.userLevel;

  /**
   * Get user's current level
   */
  async getUserLevel(userId: string) {
    return prisma.userLevel.findUnique({
      where: { userId },
      include: {
        currentLevel: true,
      },
    });
  }

  /**
   * Create or update user level
   */
  async upsertUserLevel(userId: string, levelId: string, totalCap: number) {
    return prisma.userLevel.upsert({
      where: { userId },
      update: {
        currentLevelId: levelId,
        totalCapEarned: totalCap,
        updatedAt: new Date(),
      },
      create: {
        userId,
        currentLevelId: levelId,
        totalCapEarned: totalCap,
      },
    });
  }

  /**
   * Add level history entry
   */
  async addLevelHistory(userId: string, oldLevelId: string, newLevelId: string) {
    return prisma.levelHistory.create({
      data: {
        userId,
        oldLevelId,
        newLevelId,
      },
    });
  }

  /**
   * Get level history for user
   */
  async getLevelHistory(userId: string, limit: number = 10) {
    return prisma.levelHistory.findMany({
      where: { userId },
      orderBy: { changedAt: 'desc' },
      take: limit,
      include: {
        oldLevel: true,
        newLevel: true,
      },
    });
  }

  /**
   * Get all levels
   */
  async getAllLevels() {
    return prisma.level.findMany({
      orderBy: { levelNumber: 'asc' },
    });
  }

  /**
   * Get level by number
   */
  async getLevelByNumber(levelNumber: number) {
    return prisma.level.findUnique({
      where: { levelNumber },
    });
  }

  /**
   * Get users by level
   */
  async getUsersByLevel(levelId: string, limit: number = 100, offset: number = 0) {
    return prisma.userLevel.findMany({
      where: { currentLevelId: levelId },
      include: {
        user: {
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
        },
      },
      take: limit,
      skip: offset,
      orderBy: { totalCapEarned: 'desc' },
    });
  }

  /**
   * Get level statistics
   */
  async getLevelStats() {
    const levels = await prisma.level.findMany({
      orderBy: { levelNumber: 'asc' },
    });

    const stats = [];

    for (const level of levels) {
      const count = await prisma.userLevel.count({
        where: { currentLevelId: level.id },
      });

      stats.push({
        level: level.levelNumber,
        name: level.name,
        userCount: count,
      });
    }

    return stats;
  }

  /**
   * Get next level for user
   */
  async getNextLevel(currentLevelId: string) {
    const currentLevel = await prisma.level.findUnique({
      where: { id: currentLevelId },
    });

    if (!currentLevel) return null;

    return prisma.level.findUnique({
      where: { levelNumber: currentLevel.levelNumber + 1 },
    });
  }
}

export const rankRepository = new RankRepository();