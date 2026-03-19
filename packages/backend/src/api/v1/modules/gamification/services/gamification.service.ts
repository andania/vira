/**
 * Gamification Service
 * Main service that orchestrates all gamification features
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { rankService } from './rank.service';
import { achievementService } from './achievement.service';
import { leaderboardService } from './leaderboard.service';
import { challengeService } from './challenge.service';
import { notificationService } from '../../notifications/services/notification.service';

export interface GamificationEvent {
  userId: string;
  type: 'earn' | 'engage' | 'share' | 'comment' | 'suggest' | 'purchase' | 'login' | 'referral';
  value?: number;
  metadata?: Record<string, any>;
}

export interface GamificationProfile {
  userId: string;
  rank: any;
  achievements: any[];
  stats: {
    totalPoints: number;
    level: number;
    nextLevelPoints: number;
    completionRate: number;
  };
  badges: any[];
  currentChallenges: any[];
}

export class GamificationService {
  /**
   * Process a gamification event
   */
  async processEvent(event: GamificationEvent): Promise<void> {
    try {
      const { userId, type, value = 1, metadata } = event;

      logger.debug(`Processing gamification event for user ${userId}: ${type}`);

      // Process based on event type
      switch (type) {
        case 'earn':
          await this.handleEarnEvent(userId, value, metadata);
          break;
        case 'engage':
          await this.handleEngageEvent(userId, value, metadata);
          break;
        case 'share':
          await this.handleShareEvent(userId, metadata);
          break;
        case 'comment':
          await this.handleCommentEvent(userId, metadata);
          break;
        case 'suggest':
          await this.handleSuggestEvent(userId, metadata);
          break;
        case 'purchase':
          await this.handlePurchaseEvent(userId, value, metadata);
          break;
        case 'login':
          await this.handleLoginEvent(userId);
          break;
        case 'referral':
          await this.handleReferralEvent(userId, value, metadata);
          break;
      }

      // Check for achievements based on event
      await this.checkEventAchievements(userId, type, value, metadata);

      // Update challenge progress
      await challengeService.updateProgress(userId, type, value);

      // Check for rank up
      await rankService.checkRankUp(userId, value);

      logger.debug(`Gamification event processed for user ${userId}`);
    } catch (error) {
      logger.error('Error processing gamification event:', error);
      throw error;
    }
  }

  /**
   * Handle earn event
   */
  private async handleEarnEvent(userId: string, amount: number, metadata?: any): Promise<void> {
    // Update user statistics
    await prisma.userStatistics.upsert({
      where: { userId },
      update: {
        totalCapEarned: { increment: amount },
      },
      create: {
        userId,
        totalCapEarned: amount,
      },
    });

    // Check for earning milestones
    await this.checkEarningMilestones(userId);
  }

  /**
   * Handle engage event
   */
  private async handleEngageEvent(userId: string, count: number, metadata?: any): Promise<void> {
    await prisma.userStatistics.upsert({
      where: { userId },
      update: {
        totalEngagements: { increment: count },
      },
      create: {
        userId,
        totalEngagements: count,
      },
    });
  }

  /**
   * Handle share event
   */
  private async handleShareEvent(userId: string, metadata?: any): Promise<void> {
    await prisma.userStatistics.upsert({
      where: { userId },
      update: {
        totalShares: { increment: 1 },
      },
      create: {
        userId,
        totalShares: 1,
      },
    });
  }

  /**
   * Handle comment event
   */
  private async handleCommentEvent(userId: string, metadata?: any): Promise<void> {
    await prisma.userStatistics.upsert({
      where: { userId },
      update: {
        totalComments: { increment: 1 },
      },
      create: {
        userId,
        totalComments: 1,
      },
    });
  }

  /**
   * Handle suggest event
   */
  private async handleSuggestEvent(userId: string, metadata?: any): Promise<void> {
    await prisma.userStatistics.upsert({
      where: { userId },
      update: {
        totalSuggestions: { increment: 1 },
      },
      create: {
        userId,
        totalSuggestions: 1,
      },
    });

    // Check if suggestion was accepted (if metadata indicates)
    if (metadata?.accepted) {
      await prisma.userStatistics.update({
        where: { userId },
        data: {
          totalSuggestionsAccepted: { increment: 1 },
        },
      });

      // Check for suggestion achievements
      await achievementService.checkAchievements(userId, 'suggestion_accepted');
    }
  }

  /**
   * Handle purchase event
   */
  private async handlePurchaseEvent(userId: string, amount: number, metadata?: any): Promise<void> {
    // Update purchase statistics
    await prisma.userStatistics.upsert({
      where: { userId },
      update: {
        totalPurchases: { increment: 1 },
        totalSpent: { increment: amount },
      },
      create: {
        userId,
        totalPurchases: 1,
        totalSpent: amount,
      },
    });
  }

  /**
   * Handle login event
   */
  private async handleLoginEvent(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const loginKey = `login:${userId}:${today}`;

    // Check if already logged in today
    const alreadyLogged = await redis.get(loginKey);
    if (!alreadyLogged) {
      await redis.setex(loginKey, 86400, '1');

      // Update streak
      await this.updateStreak(userId);
    }
  }

  /**
   * Handle referral event
   */
  private async handleReferralEvent(userId: string, count: number, metadata?: any): Promise<void> {
    await prisma.userStatistics.upsert({
      where: { userId },
      update: {
        totalReferrals: { increment: count },
      },
      create: {
        userId,
        totalReferrals: count,
      },
    });
  }

  /**
   * Update user streak
   */
  private async updateStreak(userId: string): Promise<void> {
    const stats = await prisma.userStatistics.findUnique({
      where: { userId },
    });

    const lastActive = stats?.lastActiveDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentStreak = stats?.dailyStreak || 0;

    if (lastActive) {
      const lastActiveDate = new Date(lastActive);
      lastActiveDate.setHours(0, 0, 0, 0);

      const dayDiff = Math.floor(
        (today.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (dayDiff === 1) {
        // Consecutive day
        currentStreak++;
      } else if (dayDiff > 1) {
        // Streak broken
        currentStreak = 1;
      }
    } else {
      // First login
      currentStreak = 1;
    }

    // Update longest streak if needed
    const longestStreak = Math.max(currentStreak, stats?.longestStreak || 0);

    await prisma.userStatistics.upsert({
      where: { userId },
      update: {
        dailyStreak: currentStreak,
        longestStreak,
        lastActiveDate: today,
      },
      create: {
        userId,
        dailyStreak: currentStreak,
        longestStreak,
        lastActiveDate: today,
      },
    });

    // Check streak achievements
    if (currentStreak >= 7) {
      await achievementService.checkAchievements(userId, 'streak_7');
    }
    if (currentStreak >= 30) {
      await achievementService.checkAchievements(userId, 'streak_30');
    }
    if (currentStreak >= 100) {
      await achievementService.checkAchievements(userId, 'streak_100');
    }
  }

  /**
   * Check for earning milestones
   */
  private async checkEarningMilestones(userId: string): Promise<void> {
    const stats = await prisma.userStatistics.findUnique({
      where: { userId },
    });

    const totalEarned = stats?.totalCapEarned || 0;

    const milestones = [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];

    for (const milestone of milestones) {
      if (totalEarned >= milestone) {
        await achievementService.checkAchievements(userId, `earn_${milestone}`);
      }
    }
  }

  /**
   * Check for achievements based on event type
   */
  private async checkEventAchievements(
    userId: string,
    eventType: string,
    value?: number,
    metadata?: any
  ): Promise<void> {
    // Map event types to achievement categories
    const achievementMap: Record<string, string[]> = {
      earn: ['earn', 'cap'],
      engage: ['engagement'],
      share: ['social', 'share'],
      comment: ['engagement', 'comment'],
      suggest: ['suggestion'],
      purchase: ['purchase', 'shopping'],
      login: ['streak', 'login'],
      referral: ['social', 'referral'],
    };

    const categories = achievementMap[eventType] || [];

    for (const category of categories) {
      await achievementService.checkAchievements(userId, category, value);
    }
  }

  /**
   * Get user's complete gamification profile
   */
  async getUserProfile(userId: string): Promise<GamificationProfile> {
    try {
      const [rank, achievements, stats, badges, challenges] = await Promise.all([
        rankService.getUserRank(userId),
        achievementService.getUserAchievements(userId),
        prisma.userStatistics.findUnique({ where: { userId } }),
        prisma.userBadge.findMany({
          where: { userId },
          include: { badge: true },
        }),
        challengeService.getUserChallenges(userId),
      ]);

      // Calculate completion rate
      const totalAchievements = achievements.length;
      const completedAchievements = achievements.filter(a => a.completed).length;
      const completionRate = totalAchievements > 0 
        ? (completedAchievements / totalAchievements) * 100 
        : 0;

      return {
        userId,
        rank,
        achievements,
        stats: {
          totalPoints: stats?.totalCapEarned || 0,
          level: rank.level,
          nextLevelPoints: rank.progress.next - rank.progress.current,
          completionRate,
        },
        badges: badges.map(b => b.badge),
        currentChallenges: challenges.active,
      };
    } catch (error) {
      logger.error('Error getting user gamification profile:', error);
      throw error;
    }
  }

  /**
   * Get gamification statistics
   */
  async getGamificationStats(): Promise<any> {
    try {
      const [totalUsers, rankDistribution, achievementStats] = await Promise.all([
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        rankService.getRankStats(),
        prisma.userAchievement.groupBy({
          by: ['achievementId'],
          where: { completed: true },
          _count: true,
          orderBy: {
            _count: {
              achievementId: 'desc',
            },
          },
          take: 10,
        }),
      ]);

      return {
        totalUsers,
        rankDistribution,
        popularAchievements: achievementStats.map(a => ({
          achievementId: a.achievementId,
          count: a._count,
        })),
      };
    } catch (error) {
      logger.error('Error getting gamification stats:', error);
      throw error;
    }
  }

  /**
   * Initialize gamification for new user
   */
  async initializeUser(userId: string): Promise<void> {
    try {
      // Create user statistics record
      await prisma.userStatistics.create({
        data: {
          userId,
          totalCapEarned: 0,
          totalEngagements: 0,
          dailyStreak: 0,
          longestStreak: 0,
        },
      });

      logger.info(`Gamification initialized for user ${userId}`);
    } catch (error) {
      logger.error('Error initializing user gamification:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard for a specific metric
   */
  async getLeaderboard(metric: string, limit: number = 100): Promise<any[]> {
    try {
      return leaderboardService.getLeaderboard({
        type: 'global',
        limit,
      });
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get user's position on leaderboard
   */
  async getUserLeaderboardPosition(userId: string, metric: string = 'earnings'): Promise<any> {
    try {
      return leaderboardService.getUserRank(userId);
    } catch (error) {
      logger.error('Error getting user leaderboard position:', error);
      throw error;
    }
  }

  /**
   * Get available badges
   */
  async getAvailableBadges(): Promise<any[]> {
    try {
      return prisma.badge.findMany({
        orderBy: { rarity: 'asc' },
      });
    } catch (error) {
      logger.error('Error getting available badges:', error);
      throw error;
    }
  }
}

export const gamificationService = new GamificationService();