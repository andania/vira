/**
 * Reward Service
 * Handles CAP reward distribution for engagements
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { walletService } from '../../wallet/services/wallet.service';
import { gamificationService } from '../../gamification/services/gamification.service';
import { notificationService } from '../../notifications/services/notification.service';
import { DEFAULT_REWARD_WEIGHTS, RANK_MULTIPLIERS, DAILY_CAP_LIMITS } from '@viraz/shared';

export interface RewardData {
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  amount: number;
  metadata?: Record<string, any>;
}

export interface DailyEarning {
  userId: string;
  date: string;
  total: number;
  actions: Record<string, number>;
}

export class RewardService {
  /**
   * Award CAP reward to user
   */
  async awardReward(data: RewardData): Promise<{ success: boolean; capEarned: number; bonus: number }> {
    try {
      const { userId, action, targetType, targetId, amount, metadata } = data;

      // Get user's rank for multiplier
      const userLevel = await prisma.userLevel.findUnique({
        where: { userId },
        include: { currentLevel: true },
      });

      const rank = userLevel?.currentLevel?.name?.toLowerCase() || 'explorer';
      const multiplier = RANK_MULTIPLIERS[rank as keyof typeof RANK_MULTIPLIERS] || 1.0;

      // Check daily limits
      const dailyEarning = await this.getDailyEarning(userId);
      const dailyLimit = DAILY_CAP_LIMITS[rank as keyof typeof DAILY_CAP_LIMITS] || 200;

      if (dailyEarning.total + amount > dailyLimit) {
        logger.debug(`Daily limit reached for user ${userId}`);
        return { success: false, capEarned: 0, bonus: 0 };
      }

      // Calculate final reward with multiplier
      const baseReward = amount;
      const bonus = Math.floor(baseReward * (multiplier - 1));
      const totalReward = baseReward + bonus;

      // Award CAP via wallet service
      const wallet = await walletService.getWallet(userId);
      
      await prisma.$transaction(async (tx) => {
        // Update wallet balance
        await tx.capWallet.update({
          where: { id: wallet.id },
          data: {
            balance: wallet.balance + totalReward,
            lifetimeEarned: wallet.lifetimeEarned + totalReward,
            lastTransactionAt: new Date(),
          },
        });

        // Create transaction record
        await tx.capTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'EARN',
            amount: totalReward,
            balanceBefore: wallet.balance,
            balanceAfter: wallet.balance + totalReward,
            referenceId: targetId,
            referenceType: targetType,
            description: `Earned ${totalReward} CAP for ${action}`,
            metadata: {
              action,
              baseReward,
              bonus,
              multiplier,
              ...metadata,
            },
            status: 'COMPLETED',
          },
        });

        // Create earning record
        await tx.capEarning.create({
          data: {
            userId,
            actionId: action,
            amount: baseReward,
            multiplier,
            finalAmount: totalReward,
            sourceType: targetType,
            sourceId: targetId,
          },
        });
      });

      // Update daily earning in Redis
      await this.updateDailyEarning(userId, totalReward, action);

      // Update user statistics
      await prisma.userStatistics.upsert({
        where: { userId },
        update: {
          totalCapEarned: { increment: totalReward },
        },
        create: {
          userId,
          totalCapEarned: totalReward,
          totalCapSpent: 0,
        },
      });

      // Check for achievements
      await gamificationService.checkAchievements(userId, 'earn', totalReward);

      // Send notification for significant rewards
      if (totalReward >= 100) {
        await notificationService.create({
          userId,
          type: 'FINANCIAL',
          title: '🎉 Big Reward!',
          body: `You earned ${totalReward} CAP for your engagement!`,
          data: {
            screen: 'wallet',
            action: 'view_transactions',
          },
        });
      }

      logger.info(`Reward awarded: ${userId} - ${totalReward} CAP for ${action}`);
      return { success: true, capEarned: totalReward, bonus };
    } catch (error) {
      logger.error('Error awarding reward:', error);
      throw error;
    }
  }

  /**
   * Award bulk rewards (for batch processing)
   */
  async awardBulkRewards(rewards: RewardData[]): Promise<{
    successful: number;
    failed: number;
    totalCap: number;
  }> {
    let successful = 0;
    let failed = 0;
    let totalCap = 0;

    for (const reward of rewards) {
      try {
        const result = await this.awardReward(reward);
        if (result.success) {
          successful++;
          totalCap += result.capEarned;
        } else {
          failed++;
        }
      } catch (error) {
        logger.error('Error awarding bulk reward:', error);
        failed++;
      }
    }

    return { successful, failed, totalCap };
  }

  /**
   * Get user's daily earning
   */
  async getDailyEarning(userId: string): Promise<DailyEarning> {
    const today = new Date().toISOString().split('T')[0];
    const key = `earning:daily:${userId}:${today}`;

    const data = await redis.get(key);
    if (data) {
      return JSON.parse(data);
    }

    // Calculate from database
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const earnings = await prisma.capEarning.aggregate({
      where: {
        userId,
        createdAt: { gte: startOfDay },
      },
      _sum: {
        finalAmount: true,
      },
    });

    const dailyEarning: DailyEarning = {
      userId,
      date: today,
      total: earnings._sum.finalAmount || 0,
      actions: {},
    };

    // Cache with expiry at end of day
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const ttl = Math.ceil((endOfDay.getTime() - Date.now()) / 1000);

    await redis.setex(key, ttl, JSON.stringify(dailyEarning));

    return dailyEarning;
  }

  /**
   * Update user's daily earning
   */
  private async updateDailyEarning(userId: string, amount: number, action: string) {
    const today = new Date().toISOString().split('T')[0];
    const key = `earning:daily:${userId}:${today}`;

    const data = await redis.get(key);
    if (data) {
      const earning = JSON.parse(data);
      earning.total += amount;
      earning.actions[action] = (earning.actions[action] || 0) + 1;
      
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const ttl = Math.ceil((endOfDay.getTime() - Date.now()) / 1000);
      
      await redis.setex(key, ttl, JSON.stringify(earning));
    }
  }

  /**
   * Get user's weekly earnings
   */
  async getWeeklyEarning(userId: string): Promise<number> {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const result = await prisma.capEarning.aggregate({
      where: {
        userId,
        createdAt: { gte: startOfWeek },
      },
      _sum: {
        finalAmount: true,
      },
    });

    return result._sum.finalAmount || 0;
  }

  /**
   * Get user's monthly earnings
   */
  async getMonthlyEarning(userId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const result = await prisma.capEarning.aggregate({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
      _sum: {
        finalAmount: true,
      },
    });

    return result._sum.finalAmount || 0;
  }

  /**
   * Get top earners for leaderboard
   */
  async getTopEarners(period: 'daily' | 'weekly' | 'monthly' | 'allTime', limit: number = 100) {
    let startDate: Date | null = null;
    const now = new Date();

    switch (period) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'weekly':
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        startDate = new Date(now.setDate(1));
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'allTime':
        startDate = null;
        break;
    }

    const where = startDate ? { createdAt: { gte: startDate } } : {};

    const topEarners = await prisma.capEarning.groupBy({
      by: ['userId'],
      where,
      _sum: {
        finalAmount: true,
      },
      orderBy: {
        _sum: {
          finalAmount: 'desc',
        },
      },
      take: limit,
    });

    // Get user details
    const userIds = topEarners.map(e => e.userId);
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

    return topEarners.map((earner, index) => ({
      rank: index + 1,
      userId: earner.userId,
      username: userMap.get(earner.userId)?.username,
      displayName: userMap.get(earner.userId)?.profile?.displayName,
      avatarUrl: userMap.get(earner.userId)?.profile?.avatarUrl,
      totalEarned: earner._sum.finalAmount || 0,
    }));
  }

  /**
   * Get reward statistics
   */
  async getRewardStats(userId: string) {
    const [daily, weekly, monthly, total, byAction] = await Promise.all([
      this.getDailyEarning(userId),
      this.getWeeklyEarning(userId),
      this.getMonthlyEarning(userId),
      prisma.capEarning.aggregate({
        where: { userId },
        _sum: { finalAmount: true },
      }),
      prisma.capEarning.groupBy({
        by: ['actionId'],
        where: { userId },
        _sum: { finalAmount: true },
        _count: true,
      }),
    ]);

    return {
      daily: daily.total,
      weekly,
      monthly,
      total: total._sum.finalAmount || 0,
      byAction: byAction.map(a => ({
        action: a.actionId,
        amount: a._sum.finalAmount || 0,
        count: a._count,
      })),
    };
  }

  /**
   * Get reward weights for different actions
   */
  getRewardWeights() {
    return DEFAULT_REWARD_WEIGHTS;
  }

  /**
   * Update reward weights (admin only)
   */
  async updateRewardWeights(weights: Partial<typeof DEFAULT_REWARD_WEIGHTS>) {
    // This would update a configuration table
    // For now, just log the change
    logger.info('Reward weights updated', weights);
    return { success: true };
  }
}

export const rewardService = new RewardService();