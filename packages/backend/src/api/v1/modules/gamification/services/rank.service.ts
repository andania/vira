/**
 * Rank Service
 * Handles user rank progression and level management
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { notificationService } from '../../notifications/services/notification.service';
import { RANK_LEVELS, RANK_REQUIREMENTS, RANK_DISPLAY_NAMES, RANK_BADGES } from '@viraz/shared';

export interface RankInfo {
  level: number;
  name: string;
  displayName: string;
  badge: string;
  minCap: number;
  maxCap?: number;
  progress: {
    current: number;
    next: number;
    percentage: number;
  };
  benefits: {
    capMultiplier: number;
    dailyCapLimit: number;
    withdrawalLimit: number;
  };
}

export class RankService {
  /**
   * Get user's current rank
   */
  async getUserRank(userId: string): Promise<RankInfo> {
    try {
      // Try cache first
      const cacheKey = `rank:${userId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get user's total CAP earned
      const userStats = await prisma.userStatistics.findUnique({
        where: { userId },
      });

      const totalCapEarned = userStats?.totalCapEarned || 0;

      // Determine rank based on total CAP
      let currentRank = this.determineRank(totalCapEarned);
      let nextRank = this.getNextRank(currentRank.level);

      // Calculate progress to next rank
      const progress = this.calculateProgress(totalCapEarned, currentRank, nextRank);

      const rankInfo: RankInfo = {
        level: currentRank.level,
        name: currentRank.name,
        displayName: RANK_DISPLAY_NAMES[currentRank.name as keyof typeof RANK_DISPLAY_NAMES],
        badge: RANK_BADGES[currentRank.name as keyof typeof RANK_BADGES],
        minCap: currentRank.minCap,
        maxCap: currentRank.maxCap,
        progress,
        benefits: this.getRankBenefits(currentRank.name),
      };

      // Cache for 1 hour
      await redis.setex(cacheKey, 3600, JSON.stringify(rankInfo));

      return rankInfo;
    } catch (error) {
      logger.error('Error getting user rank:', error);
      throw error;
    }
  }

  /**
   * Determine rank based on CAP earned
   */
  private determineRank(totalCap: number): { level: number; name: string; minCap: number; maxCap?: number } {
    const ranks = [
      { level: 1, name: 'explorer', minCap: 0, maxCap: 999 },
      { level: 2, name: 'engager', minCap: 1000, maxCap: 4999 },
      { level: 3, name: 'contributor', minCap: 5000, maxCap: 24999 },
      { level: 4, name: 'influencer', minCap: 25000, maxCap: 99999 },
      { level: 5, name: 'brand_ambassador', minCap: 100000, maxCap: 499999 },
      { level: 6, name: 'viraz_champion', minCap: 500000 },
    ];

    for (let i = ranks.length - 1; i >= 0; i--) {
      if (totalCap >= ranks[i].minCap) {
        return ranks[i];
      }
    }

    return ranks[0];
  }

  /**
   * Get next rank
   */
  private getNextRank(currentLevel: number): { level: number; name: string; minCap: number; maxCap?: number } | null {
    const ranks = [
      { level: 1, name: 'explorer', minCap: 0, maxCap: 999 },
      { level: 2, name: 'engager', minCap: 1000, maxCap: 4999 },
      { level: 3, name: 'contributor', minCap: 5000, maxCap: 24999 },
      { level: 4, name: 'influencer', minCap: 25000, maxCap: 99999 },
      { level: 5, name: 'brand_ambassador', minCap: 100000, maxCap: 499999 },
      { level: 6, name: 'viraz_champion', minCap: 500000 },
    ];

    if (currentLevel < ranks.length) {
      return ranks[currentLevel];
    }

    return null;
  }

  /**
   * Calculate progress to next rank
   */
  private calculateProgress(
    totalCap: number,
    currentRank: any,
    nextRank: any | null
  ): { current: number; next: number; percentage: number } {
    if (!nextRank) {
      return {
        current: totalCap,
        next: currentRank.minCap,
        percentage: 100,
      };
    }

    const current = totalCap - currentRank.minCap;
    const required = nextRank.minCap - currentRank.minCap;
    const percentage = Math.min(Math.floor((current / required) * 100), 100);

    return {
      current,
      next: required,
      percentage,
    };
  }

  /**
   * Get rank benefits
   */
  private getRankBenefits(rankName: string): {
    capMultiplier: number;
    dailyCapLimit: number;
    withdrawalLimit: number;
  } {
    const benefits = {
      explorer: {
        capMultiplier: 1.0,
        dailyCapLimit: 200,
        withdrawalLimit: 50,
      },
      engager: {
        capMultiplier: 1.1,
        dailyCapLimit: 500,
        withdrawalLimit: 100,
      },
      contributor: {
        capMultiplier: 1.2,
        dailyCapLimit: 1000,
        withdrawalLimit: 250,
      },
      influencer: {
        capMultiplier: 1.35,
        dailyCapLimit: 2000,
        withdrawalLimit: 500,
      },
      brand_ambassador: {
        capMultiplier: 1.5,
        dailyCapLimit: 5000,
        withdrawalLimit: 1000,
      },
      viraz_champion: {
        capMultiplier: 2.0,
        dailyCapLimit: 10000,
        withdrawalLimit: 2500,
      },
    };

    return benefits[rankName as keyof typeof benefits] || benefits.explorer;
  }

  /**
   * Check for rank up and award
   */
  async checkRankUp(userId: string, newCapEarned: number): Promise<RankInfo | null> {
    try {
      const oldRank = await this.getUserRank(userId);
      
      // Get updated total CAP
      const userStats = await prisma.userStatistics.findUnique({
        where: { userId },
      });

      const totalCap = userStats?.totalCapEarned || 0;
      const newRank = this.determineRank(totalCap);

      if (newRank.level > oldRank.level) {
        // User has ranked up
        const rankInfo = await this.getUserRank(userId);

        // Award bonus CAP for ranking up
        const bonusCap = this.getRankUpBonus(newRank.level);
        
        await prisma.$transaction(async (tx) => {
          // Award bonus CAP
          await tx.capTransaction.create({
            data: {
              walletId: (await tx.capWallet.findUnique({ where: { userId } }))!.id,
              type: 'BONUS',
              amount: bonusCap,
              description: `Rank up bonus: reached ${newRank.name}`,
              status: 'COMPLETED',
            },
          });

          // Record rank history
          await tx.userRankHistory.create({
            data: {
              userId,
              oldRank: oldRank.name,
              newRank: newRank.name,
              changedAt: new Date(),
            },
          });
        });

        // Send notification
        await notificationService.create({
          userId,
          type: 'ACHIEVEMENT',
          title: '⬆️ Level Up!',
          body: `Congratulations! You reached ${rankInfo.displayName} rank and earned ${bonusCap} bonus CAP!`,
          data: {
            screen: 'profile',
            action: 'rank',
          },
        });

        // Invalidate cache
        await redis.del(`rank:${userId}`);

        return rankInfo;
      }

      return null;
    } catch (error) {
      logger.error('Error checking rank up:', error);
      throw error;
    }
  }

  /**
   * Get rank up bonus CAP
   */
  private getRankUpBonus(level: number): number {
    const bonuses = {
      2: 100,
      3: 250,
      4: 500,
      5: 1000,
      6: 2500,
    };

    return bonuses[level as keyof typeof bonuses] || 0;
  }

  /**
   * Get leaderboard by rank
   */
  async getLeaderboardByRank(limit: number = 100) {
    try {
      const users = await prisma.userStatistics.findMany({
        orderBy: {
          totalCapEarned: 'desc',
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

      return users.map((stats, index) => ({
        rank: index + 1,
        userId: stats.userId,
        username: stats.user?.username,
        displayName: stats.user?.profile?.displayName,
        avatarUrl: stats.user?.profile?.avatarUrl,
        totalCapEarned: stats.totalCapEarned,
        userRank: this.determineRank(stats.totalCapEarned).name,
      }));
    } catch (error) {
      logger.error('Error getting leaderboard by rank:', error);
      throw error;
    }
  }

  /**
   * Get rank statistics
   */
  async getRankStats() {
    try {
      const users = await prisma.userStatistics.findMany({
        select: {
          totalCapEarned: true,
        },
      });

      const rankCounts = {
        explorer: 0,
        engager: 0,
        contributor: 0,
        influencer: 0,
        brand_ambassador: 0,
        viraz_champion: 0,
      };

      for (const user of users) {
        const rank = this.determineRank(user.totalCapEarned).name;
        rankCounts[rank as keyof typeof rankCounts]++;
      }

      return rankCounts;
    } catch (error) {
      logger.error('Error getting rank stats:', error);
      throw error;
    }
  }
}

export const rankService = new RankService();