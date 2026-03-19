/**
 * Leaderboard Repository
 * Handles database operations for leaderboards
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

export class LeaderboardRepository extends BaseRepository<any, any, any> {
  protected modelName = 'leaderboardEntry';
  protected prismaModel = prisma.leaderboardEntry;

  /**
   * Get leaderboard entries
   */
  async getLeaderboardEntries(leaderboardId: string, limit: number = 100, offset: number = 0) {
    return prisma.leaderboardEntry.findMany({
      where: { leaderboardId },
      orderBy: { rank: 'asc' },
      take: limit,
      skip: offset,
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
    });
  }

  /**
   * Create leaderboard entries
   */
  async createEntries(entries: any[]) {
    return prisma.leaderboardEntry.createMany({
      data: entries,
      skipDuplicates: true,
    });
  }

  /**
   * Clear leaderboard
   */
  async clearLeaderboard(leaderboardId: string) {
    return prisma.leaderboardEntry.deleteMany({
      where: { leaderboardId },
    });
  }

  /**
   * Get user's rank in leaderboard
   */
  async getUserRank(userId: string, leaderboardId: string) {
    return prisma.leaderboardEntry.findUnique({
      where: {
        leaderboardId_userId: {
          leaderboardId,
          userId,
        },
      },
    });
  }

  /**
   * Get top users by metric
   */
  async getTopUsersByMetric(metric: string, limit: number = 100) {
    // This would depend on the metric (earnings, engagements, etc.)
    // Simplified version for now
    return prisma.userStatistics.findMany({
      orderBy: {
        [metric]: 'desc',
      },
      take: limit,
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
    });
  }

  /**
   * Get leaderboard metadata
   */
  async getLeaderboardMetadata(leaderboardId: string) {
    return prisma.leaderboard.findUnique({
      where: { id: leaderboardId },
    });
  }

  /**
   * Create leaderboard
   */
  async createLeaderboard(data: any) {
    return prisma.leaderboard.create({
      data,
    });
  }

  /**
   * Update leaderboard
   */
  async updateLeaderboard(id: string, data: any) {
    return prisma.leaderboard.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete leaderboard
   */
  async deleteLeaderboard(id: string) {
    return prisma.leaderboard.delete({
      where: { id },
    });
  }

  /**
   * Get all leaderboards
   */
  async getAllLeaderboards() {
    return prisma.leaderboard.findMany({
      where: { isActive: true },
    });
  }

  /**
   * Get leaderboard statistics
   */
  async getLeaderboardStats(leaderboardId: string) {
    const [totalEntries, topScore, averageScore] = await Promise.all([
      prisma.leaderboardEntry.count({
        where: { leaderboardId },
      }),
      prisma.leaderboardEntry.aggregate({
        where: { leaderboardId },
        _max: { score: true },
      }),
      prisma.leaderboardEntry.aggregate({
        where: { leaderboardId },
        _avg: { score: true },
      }),
    ]);

    return {
      totalEntries,
      topScore: topScore._max.score || 0,
      averageScore: averageScore._avg.score || 0,
    };
  }
}

export const leaderboardRepository = new LeaderboardRepository();