/**
 * Leaderboard Service
 * Handles leaderboard generation and rankings
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { rankService } from './rank.service';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface LeaderboardConfig {
  type: 'global' | 'weekly' | 'monthly' | 'brand' | 'category';
  period?: 'daily' | 'weekly' | 'monthly' | 'allTime';
  brandId?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export class LeaderboardService {
  /**
   * Get leaderboard based on configuration
   */
  async getLeaderboard(config: LeaderboardConfig): Promise<LeaderboardEntry[]> {
    try {
      const { type, period = 'allTime', brandId, category, limit = 100, offset = 0 } = config;

      // Generate cache key
      const cacheKey = `leaderboard:${type}:${period}:${brandId || ''}:${category || ''}:${limit}:${offset}`;
      
      // Try cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      let entries: LeaderboardEntry[] = [];

      switch (type) {
        case 'global':
          entries = await this.getGlobalLeaderboard(period, limit, offset);
          break;
        case 'weekly':
          entries = await this.getWeeklyLeaderboard(limit, offset);
          break;
        case 'monthly':
          entries = await this.getMonthlyLeaderboard(limit, offset);
          break;
        case 'brand':
          if (!brandId) throw new Error('Brand ID required for brand leaderboard');
          entries = await this.getBrandLeaderboard(brandId, period, limit, offset);
          break;
        case 'category':
          if (!category) throw new Error('Category required for category leaderboard');
          entries = await this.getCategoryLeaderboard(category, period, limit, offset);
          break;
      }

      // Cache for 1 hour
      await redis.setex(cacheKey, 3600, JSON.stringify(entries));

      return entries;
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get global leaderboard (all-time CAP earnings)
   */
  private async getGlobalLeaderboard(period: string, limit: number, offset: number): Promise<LeaderboardEntry[]> {
    let dateFilter = {};
    
    if (period !== 'allTime') {
      const startDate = this.getPeriodStartDate(period);
      dateFilter = { createdAt: { gte: startDate } };
    }

    const topEarners = await prisma.capEarning.groupBy({
      by: ['userId'],
      where: dateFilter,
      _sum: {
        finalAmount: true,
      },
      orderBy: {
        _sum: {
          finalAmount: 'desc',
        },
      },
      take: limit,
      skip: offset,
    });

    return this.enrichLeaderboardEntries(topEarners);
  }

  /**
   * Get weekly leaderboard
   */
  private async getWeeklyLeaderboard(limit: number, offset: number): Promise<LeaderboardEntry[]> {
    const startOfWeek = this.getPeriodStartDate('week');

    const weeklyEarnings = await prisma.capEarning.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: startOfWeek },
      },
      _sum: {
        finalAmount: true,
      },
      orderBy: {
        _sum: {
          finalAmount: 'desc',
        },
      },
      take: limit,
      skip: offset,
    });

    return this.enrichLeaderboardEntries(weeklyEarnings);
  }

  /**
   * Get monthly leaderboard
   */
  private async getMonthlyLeaderboard(limit: number, offset: number): Promise<LeaderboardEntry[]> {
    const startOfMonth = this.getPeriodStartDate('month');

    const monthlyEarnings = await prisma.capEarning.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: startOfMonth },
      },
      _sum: {
        finalAmount: true,
      },
      orderBy: {
        _sum: {
          finalAmount: 'desc',
        },
      },
      take: limit,
      skip: offset,
    });

    return this.enrichLeaderboardEntries(monthlyEarnings);
  }

  /**
   * Get brand-specific leaderboard
   */
  private async getBrandLeaderboard(brandId: string, period: string, limit: number, offset: number): Promise<LeaderboardEntry[]> {
    let dateFilter = {};
    
    if (period !== 'allTime') {
      const startDate = this.getPeriodStartDate(period);
      dateFilter = { createdAt: { gte: startDate } };
    }

    // Get engagements with this brand
    const brandEngagements = await prisma.userEngagement.groupBy({
      by: ['userId'],
      where: {
        targetType: 'brand',
        targetId: brandId,
        ...dateFilter,
      },
      _count: true,
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
      take: limit,
      skip: offset,
    });

    return this.enrichLeaderboardEntries(
      brandEngagements.map(e => ({
        userId: e.userId,
        _sum: { finalAmount: e._count },
      }))
    );
  }

  /**
   * Get category-specific leaderboard
   */
  private async getCategoryLeaderboard(category: string, period: string, limit: number, offset: number): Promise<LeaderboardEntry[]> {
    let dateFilter = {};
    
    if (period !== 'allTime') {
      const startDate = this.getPeriodStartDate(period);
      dateFilter = { createdAt: { gte: startDate } };
    }

    // Get engagements in this category
    const categoryEngagements = await prisma.userEngagement.groupBy({
      by: ['userId'],
      where: {
        targetType: { in: ['ad', 'room', 'campaign'] },
        ...dateFilter,
        // This would need category filtering logic
      },
      _count: true,
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
      take: limit,
      skip: offset,
    });

    return this.enrichLeaderboardEntries(
      categoryEngagements.map(e => ({
        userId: e.userId,
        _sum: { finalAmount: e._count },
      }))
    );
  }

  /**
   * Enrich leaderboard entries with user details
   */
  private async enrichLeaderboardEntries(
    entries: Array<{ userId: string; _sum: { finalAmount?: number } }>
  ): Promise<LeaderboardEntry[]> {
    const userIds = entries.map(e => e.userId);
    
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

    return entries.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      username: userMap.get(entry.userId)?.username || 'Unknown',
      displayName: userMap.get(entry.userId)?.profile?.displayName,
      avatarUrl: userMap.get(entry.userId)?.profile?.avatarUrl,
      score: entry._sum.finalAmount || 0,
    }));
  }

  /**
   * Get period start date
   */
  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    
    switch (period) {
      case 'day':
        return new Date(now.setHours(0, 0, 0, 0));
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return startOfWeek;
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(0); // Beginning of time
    }
  }

  /**
   * Get user's rank on leaderboard
   */
  async getUserRank(userId: string, type: string = 'global'): Promise<{ rank: number; score: number } | null> {
    try {
      let userScore = 0;
      let allScores: Array<{ userId: string; score: number }> = [];

      switch (type) {
        case 'global':
          userScore = await this.getUserTotalEarnings(userId);
          allScores = await this.getAllUserEarnings();
          break;
        case 'weekly':
          userScore = await this.getUserWeeklyEarnings(userId);
          allScores = await this.getAllWeeklyEarnings();
          break;
        case 'monthly':
          userScore = await this.getUserMonthlyEarnings(userId);
          allScores = await this.getAllMonthlyEarnings();
          break;
      }

      const sortedScores = allScores.sort((a, b) => b.score - a.score);
      const rank = sortedScores.findIndex(u => u.userId === userId) + 1;

      return rank > 0 ? { rank, score: userScore } : null;
    } catch (error) {
      logger.error('Error getting user rank:', error);
      throw error;
    }
  }

  /**
   * Get user's total earnings
   */
  private async getUserTotalEarnings(userId: string): Promise<number> {
    const result = await prisma.capEarning.aggregate({
      where: { userId },
      _sum: { finalAmount: true },
    });
    return result._sum.finalAmount || 0;
  }

  /**
   * Get all users' total earnings
   */
  private async getAllUserEarnings(): Promise<Array<{ userId: string; score: number }>> {
    const earnings = await prisma.capEarning.groupBy({
      by: ['userId'],
      _sum: { finalAmount: true },
    });

    return earnings.map(e => ({
      userId: e.userId,
      score: e._sum.finalAmount || 0,
    }));
  }

  /**
   * Get user's weekly earnings
   */
  private async getUserWeeklyEarnings(userId: string): Promise<number> {
    const startOfWeek = this.getPeriodStartDate('week');
    const result = await prisma.capEarning.aggregate({
      where: {
        userId,
        createdAt: { gte: startOfWeek },
      },
      _sum: { finalAmount: true },
    });
    return result._sum.finalAmount || 0;
  }

  /**
   * Get all users' weekly earnings
   */
  private async getAllWeeklyEarnings(): Promise<Array<{ userId: string; score: number }>> {
    const startOfWeek = this.getPeriodStartDate('week');
    const earnings = await prisma.capEarning.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: startOfWeek } },
      _sum: { finalAmount: true },
    });

    return earnings.map(e => ({
      userId: e.userId,
      score: e._sum.finalAmount || 0,
    }));
  }

  /**
   * Get user's monthly earnings
   */
  private async getUserMonthlyEarnings(userId: string): Promise<number> {
    const startOfMonth = this.getPeriodStartDate('month');
    const result = await prisma.capEarning.aggregate({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
      _sum: { finalAmount: true },
    });
    return result._sum.finalAmount || 0;
  }

  /**
   * Get all users' monthly earnings
   */
  private async getAllMonthlyEarnings(): Promise<Array<{ userId: string; score: number }>> {
    const startOfMonth = this.getPeriodStartDate('month');
    const earnings = await prisma.capEarning.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: startOfMonth } },
      _sum: { finalAmount: true },
    });

    return earnings.map(e => ({
      userId: e.userId,
      score: e._sum.finalAmount || 0,
    }));
  }

  /**
   * Get leaderboard statistics
   */
  async getLeaderboardStats(): Promise<any> {
    try {
      const [totalUsers, totalEarnings, averageEarnings] = await Promise.all([
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.capEarning.aggregate({
          _sum: { finalAmount: true },
        }),
        prisma.capEarning.aggregate({
          _avg: { finalAmount: true },
        }),
      ]);

      return {
        totalUsers,
        totalEarnings: totalEarnings._sum.finalAmount || 0,
        averageEarnings: averageEarnings._avg.finalAmount || 0,
      };
    } catch (error) {
      logger.error('Error getting leaderboard stats:', error);
      throw error;
    }
  }

  /**
   * Clear leaderboard cache
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await redis.keys('leaderboard:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      logger.info('Leaderboard cache cleared');
    } catch (error) {
      logger.error('Error clearing leaderboard cache:', error);
      throw error;
    }
  }
}

export const leaderboardService = new LeaderboardService();