/**
 * Gamification Repository
 * Main repository for gamification data aggregation
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

export interface GamificationStats {
  totalUsers: number;
  activeUsers: number;
  totalAchievements: number;
  totalBadges: number;
  totalChallenges: number;
  averageRank: number;
  topRanks: Record<string, number>;
  achievementCompletionRate: number;
  challengeCompletionRate: number;
}

export class GamificationRepository extends BaseRepository<any, any, any> {
  protected modelName = 'gamification';
  protected prismaModel = prisma.gamification;

  /**
   * Get complete gamification statistics
   */
  async getGamificationStats(): Promise<GamificationStats> {
    const [
      totalUsers,
      activeUsers,
      totalAchievements,
      totalBadges,
      totalChallenges,
      userLevels,
      achievementStats,
      challengeStats,
    ] = await Promise.all([
      // Total users
      prisma.user.count({ where: { status: 'ACTIVE' } }),

      // Active users (last 30 days)
      prisma.user.count({
        where: {
          status: 'ACTIVE',
          lastActiveAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Total achievements
      prisma.achievement.count({ where: { isActive: true } }),

      // Total badges
      prisma.badge.count(),

      // Total challenges
      prisma.challenge.count({ where: { isActive: true } }),

      // User level distribution
      prisma.userLevel.groupBy({
        by: ['currentLevelId'],
        _count: true,
      }),

      // Achievement completion stats
      prisma.userAchievement.aggregate({
        _avg: {
          progress: true,
        },
        _count: {
          completed: true,
        },
      }),

      // Challenge completion stats
      prisma.userChallenge.aggregate({
        _avg: {
          progress: true,
        },
        _count: {
          completed: true,
        },
      }),
    ]);

    // Get level details for top ranks
    const levelIds = userLevels.map(l => l.currentLevelId);
    const levels = await prisma.level.findMany({
      where: { id: { in: levelIds } },
    });

    const levelMap = new Map(levels.map(l => [l.id, l.name]));

    const topRanks: Record<string, number> = {};
    userLevels.forEach(level => {
      const levelName = levelMap.get(level.currentLevelId) || 'unknown';
      topRanks[levelName] = (topRanks[levelName] || 0) + level._count;
    });

    // Calculate average rank (based on level numbers)
    let totalLevelSum = 0;
    let totalLevelCount = 0;

    for (const level of userLevels) {
      const levelObj = levels.find(l => l.id === level.currentLevelId);
      if (levelObj) {
        totalLevelSum += levelObj.levelNumber * level._count;
        totalLevelCount += level._count;
      }
    }

    const averageRank = totalLevelCount > 0 ? totalLevelSum / totalLevelCount : 0;

    // Calculate completion rates
    const totalUserAchievements = await prisma.userAchievement.count();
    const completedAchievements = achievementStats._count.completed || 0;
    const achievementCompletionRate = totalUserAchievements > 0
      ? (completedAchievements / totalUserAchievements) * 100
      : 0;

    const totalUserChallenges = await prisma.userChallenge.count();
    const completedChallenges = challengeStats._count.completed || 0;
    const challengeCompletionRate = totalUserChallenges > 0
      ? (completedChallenges / totalUserChallenges) * 100
      : 0;

    return {
      totalUsers,
      activeUsers,
      totalAchievements,
      totalBadges,
      totalChallenges,
      averageRank,
      topRanks,
      achievementCompletionRate,
      challengeCompletionRate,
    };
  }

  /**
   * Get user's gamification summary
   */
  async getUserGamificationSummary(userId: string) {
    const [
      rank,
      achievements,
      badges,
      challenges,
      stats,
    ] = await Promise.all([
      // User's current rank
      prisma.userLevel.findUnique({
        where: { userId },
        include: { currentLevel: true },
      }),

      // Achievement stats
      prisma.userAchievement.aggregate({
        where: { userId },
        _count: {
          completed: true,
        },
        _avg: {
          progress: true,
        },
      }),

      // Badge count
      prisma.userBadge.count({
        where: { userId },
      }),

      // Challenge stats
      prisma.userChallenge.aggregate({
        where: { userId },
        _count: {
          completed: true,
        },
      }),

      // User statistics
      prisma.userStatistics.findUnique({
        where: { userId },
      }),
    ]);

    return {
      rank: rank ? {
        level: rank.currentLevel?.levelNumber,
        name: rank.currentLevel?.name,
        totalCapEarned: rank.totalCapEarned,
      } : null,
      achievements: {
        completed: achievements._count.completed || 0,
        averageProgress: achievements._avg.progress || 0,
      },
      badges: badges,
      challenges: {
        completed: challenges._count.completed || 0,
      },
      statistics: stats,
    };
  }

  /**
   * Get leaderboard data with user details
   */
  async getLeaderboardWithDetails(
    metric: 'totalCapEarned' | 'totalEngagements' | 'totalReferrals' | 'dailyStreak',
    limit: number = 100,
    offset: number = 0
  ) {
    const orderBy: any = {};
    orderBy[metric] = 'desc';

    const [entries, total] = await Promise.all([
      prisma.userStatistics.findMany({
        orderBy,
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
              level: {
                include: {
                  currentLevel: true,
                },
              },
            },
          },
        },
      }),
      prisma.userStatistics.count(),
    ]);

    return {
      entries: entries.map((entry, index) => ({
        rank: offset + index + 1,
        userId: entry.userId,
        username: entry.user?.username,
        displayName: entry.user?.profile?.displayName,
        avatarUrl: entry.user?.profile?.avatarUrl,
        score: entry[metric],
        rankName: entry.user?.level?.currentLevel?.name,
        rankLevel: entry.user?.level?.currentLevel?.levelNumber,
      })),
      total,
    };
  }

  /**
   * Get achievement progress for all users
   */
  async getGlobalAchievementProgress() {
    const achievements = await prisma.achievement.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        category: true,
        requirementValue: true,
      },
    });

    const progress = [];

    for (const achievement of achievements) {
      const completed = await prisma.userAchievement.count({
        where: {
          achievementId: achievement.id,
          completed: true,
        },
      });

      const total = await prisma.userAchievement.count({
        where: {
          achievementId: achievement.id,
        },
      });

      progress.push({
        achievementId: achievement.id,
        name: achievement.name,
        category: achievement.category,
        completed,
        total,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
        requirementValue: achievement.requirementValue,
      });
    }

    return progress;
  }

  /**
   * Get challenge progress for all users
   */
  async getGlobalChallengeProgress() {
    const challenges = await prisma.challenge.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        type: true,
        requirements: true,
      },
    });

    const progress = [];

    for (const challenge of challenges) {
      const completed = await prisma.userChallenge.count({
        where: {
          challengeId: challenge.id,
          completed: true,
        },
      });

      const total = await prisma.userChallenge.count({
        where: {
          challengeId: challenge.id,
        },
      });

      progress.push({
        challengeId: challenge.id,
        name: challenge.name,
        type: challenge.type,
        completed,
        total,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
      });
    }

    return progress;
  }

  /**
   * Get badge distribution
   */
  async getBadgeDistribution() {
    const badges = await prisma.badge.findMany({
      select: {
        id: true,
        name: true,
        rarity: true,
      },
    });

    const distribution = [];

    for (const badge of badges) {
      const count = await prisma.userBadge.count({
        where: { badgeId: badge.id },
      });

      distribution.push({
        badgeId: badge.id,
        name: badge.name,
        rarity: badge.rarity,
        earnedCount: count,
      });
    }

    return distribution.sort((a, b) => b.earnedCount - a.earnedCount);
  }

  /**
   * Get rank distribution
   */
  async getRankDistribution() {
    const levels = await prisma.level.findMany({
      orderBy: { levelNumber: 'asc' },
    });

    const distribution = [];

    for (const level of levels) {
      const count = await prisma.userLevel.count({
        where: { currentLevelId: level.id },
      });

      distribution.push({
        levelId: level.id,
        levelNumber: level.levelNumber,
        name: level.name,
        userCount: count,
      });
    }

    return distribution;
  }

  /**
   * Get user progression timeline
   */
  async getUserProgressionTimeline(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      levelHistory,
      achievementHistory,
      earningHistory,
    ] = await Promise.all([
      // Level changes
      prisma.levelHistory.findMany({
        where: {
          userId,
          changedAt: { gte: startDate },
        },
        orderBy: { changedAt: 'asc' },
        include: {
          newLevel: true,
        },
      }),

      // Achievement completions
      prisma.userAchievement.findMany({
        where: {
          userId,
          completed: true,
          completedAt: { gte: startDate },
        },
        orderBy: { completedAt: 'asc' },
        include: {
          achievement: true,
        },
      }),

      // CAP earnings
      prisma.capEarning.findMany({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      levelHistory: levelHistory.map(h => ({
        date: h.changedAt,
        level: h.newLevel.levelNumber,
        levelName: h.newLevel.name,
      })),
      achievementHistory: achievementHistory.map(a => ({
        date: a.completedAt,
        achievement: a.achievement.name,
        category: a.achievement.category,
      })),
      earningHistory: earningHistory.map(e => ({
        date: e.createdAt,
        amount: e.finalAmount,
        action: e.actionId,
      })),
    };
  }

  /**
   * Get gamification activity feed
   */
  async getActivityFeed(limit: number = 50, offset: number = 0) {
    const activities = await prisma.$transaction([
      // Recent level ups
      prisma.levelHistory.findMany({
        take: Math.ceil(limit / 3),
        skip: offset,
        orderBy: { changedAt: 'desc' },
        include: {
          user: {
            select: {
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          newLevel: true,
        },
      }),

      // Recent achievements
      prisma.userAchievement.findMany({
        where: { completed: true },
        take: Math.ceil(limit / 3),
        skip: offset,
        orderBy: { completedAt: 'desc' },
        include: {
          user: {
            select: {
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          achievement: true,
        },
      }),

      // Recent challenge completions
      prisma.userChallenge.findMany({
        where: { completed: true },
        take: Math.ceil(limit / 3),
        skip: offset,
        orderBy: { completedAt: 'desc' },
        include: {
          user: {
            select: {
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          challenge: true,
        },
      }),
    ]);

    // Combine and sort by date
    const allActivities = [
      ...activities[0].map(a => ({
        type: 'level_up',
        user: a.user,
        level: a.newLevel.levelNumber,
        levelName: a.newLevel.name,
        date: a.changedAt,
      })),
      ...activities[1].map(a => ({
        type: 'achievement',
        user: a.user,
        achievement: a.achievement.name,
        date: a.completedAt,
      })),
      ...activities[2].map(a => ({
        type: 'challenge',
        user: a.user,
        challenge: a.challenge.name,
        date: a.completedAt,
      })),
    ];

    return allActivities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  /**
   * Clear all gamification caches
   */
  async clearAllCaches(): Promise<void> {
    // This would be handled by Redis, but keeping for completeness
    return Promise.resolve();
  }
}

export const gamificationRepository = new GamificationRepository();