/**
 * Leaderboard Update Job
 * Recalculates leaderboard rankings
 */

import { Job } from 'bull';
import { prisma } from '../../database/client';
import { logger } from '../../logger';
import { cacheService } from '../../cache/cache.service';
import { startOfDay, endOfDay, subDays } from '@viraz/shared';

export interface LeaderboardJobData {
  type?: 'global' | 'weekly' | 'monthly' | 'brand';
  brandId?: string;
  limit?: number;
}

export class LeaderboardJob {
  static async process(job: Job<LeaderboardJobData>) {
    const { type = 'global', brandId, limit = 100 } = job.data;
    
    logger.info(`🔄 Starting leaderboard update job (type: ${type})`);

    try {
      let leaderboardData = [];

      switch (type) {
        case 'global':
          leaderboardData = await this.calculateGlobalLeaderboard(limit);
          break;
        case 'weekly':
          leaderboardData = await this.calculateWeeklyLeaderboard(limit);
          break;
        case 'monthly':
          leaderboardData = await this.calculateMonthlyLeaderboard(limit);
          break;
        case 'brand':
          if (!brandId) throw new Error('Brand ID required for brand leaderboard');
          leaderboardData = await this.calculateBrandLeaderboard(brandId, limit);
          break;
      }

      // Cache leaderboard data
      const cacheKey = type === 'brand' ? `leaderboard:brand:${brandId}` : `leaderboard:${type}`;
      await cacheService.cacheLeaderboard(cacheKey, leaderboardData, 3600); // 1 hour TTL

      // Store in database for history
      await this.storeLeaderboardData(type, brandId, leaderboardData);

      logger.info(`✅ Leaderboard update job completed`, {
        type,
        entries: leaderboardData.length,
      });

      return {
        type,
        entries: leaderboardData.length,
      };

    } catch (error) {
      logger.error('❌ Leaderboard update job failed:', error);
      throw error;
    }
  }

  private static async calculateGlobalLeaderboard(limit: number) {
    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        username: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
          },
        },
        statistics: {
          select: {
            totalCapEarned: true,
            totalEngagements: true,
          },
        },
      },
      orderBy: {
        statistics: {
          totalCapEarned: 'desc',
        },
      },
      take: limit,
    });

    return users.map((user, index) => ({
      rank: index + 1,
      userId: user.id,
      username: user.username,
      displayName: user.profile?.displayName,
      avatarUrl: user.profile?.avatarUrl,
      score: user.statistics?.totalCapEarned || 0,
      engagements: user.statistics?.totalEngagements || 0,
    }));
  }

  private static async calculateWeeklyLeaderboard(limit: number) {
    const startDate = startOfDay(subDays(new Date(), 7));
    const endDate = endOfDay(new Date());

    const weeklyEarnings = await prisma.capEarning.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
      take: limit,
    });

    const userIds = weeklyEarnings.map(e => e.userId);
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
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

    return weeklyEarnings.map((earning, index) => {
      const user = userMap.get(earning.userId);
      return {
        rank: index + 1,
        userId: earning.userId,
        username: user?.username,
        displayName: user?.profile?.displayName,
        avatarUrl: user?.profile?.avatarUrl,
        score: earning._sum.amount || 0,
        period: 'weekly',
      };
    });
  }

  private static async calculateMonthlyLeaderboard(limit: number) {
    const startDate = startOfDay(subDays(new Date(), 30));
    const endDate = endOfDay(new Date());

    const monthlyEarnings = await prisma.capEarning.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
      take: limit,
    });

    const userIds = monthlyEarnings.map(e => e.userId);
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
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

    return monthlyEarnings.map((earning, index) => {
      const user = userMap.get(earning.userId);
      return {
        rank: index + 1,
        userId: earning.userId,
        username: user?.username,
        displayName: user?.profile?.displayName,
        avatarUrl: user?.profile?.avatarUrl,
        score: earning._sum.amount || 0,
        period: 'monthly',
      };
    });
  }

  private static async calculateBrandLeaderboard(brandId: string, limit: number) {
    const brandEngagements = await prisma.userEngagement.groupBy({
      by: ['userId'],
      where: {
        targetType: 'brand',
        targetId: brandId,
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          _all: 'desc',
        },
      },
      take: limit,
    });

    const userIds = brandEngagements.map(e => e.userId);
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
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

    return brandEngagements.map((engagement, index) => {
      const user = userMap.get(engagement.userId);
      return {
        rank: index + 1,
        userId: engagement.userId,
        username: user?.username,
        displayName: user?.profile?.displayName,
        avatarUrl: user?.profile?.avatarUrl,
        score: engagement._count._all,
        brandId,
      };
    });
  }

  private static async storeLeaderboardData(
    type: string,
    brandId: string | undefined,
    data: any[]
  ) {
    const periodStart = type === 'weekly' ? subDays(new Date(), 7) :
                       type === 'monthly' ? subDays(new Date(), 30) :
                       new Date(0); // Beginning of time for global
    const periodEnd = new Date();

    await prisma.leaderboardEntry.createMany({
      data: data.map(entry => ({
        leaderboardId: `${type}_${brandId || 'global'}`,
        userId: entry.userId,
        score: entry.score,
        rank: entry.rank,
        metadata: entry,
        periodStart,
        periodEnd,
      })),
    });
  }
}

export default LeaderboardJob;