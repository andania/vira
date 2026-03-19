/**
 * Challenge Service
 * Handles weekly challenges and missions
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { notificationService } from '../../notifications/services/notification.service';
import { rewardService } from '../../engagement/services/reward.service';
import { startOfWeek, endOfWeek, addDays } from '@viraz/shared';

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'special';
  requirements: Record<string, any>;
  rewards: Record<string, any>;
  startDate: Date;
  endDate: Date;
  maxCompletions?: number;
}

export interface UserChallenge {
  challengeId: string;
  progress: number;
  completed: boolean;
  completedAt?: Date;
  rewardClaimed: boolean;
}

export class ChallengeService {
  /**
   * Get active challenges
   */
  async getActiveChallenges(userId?: string): Promise<any[]> {
    try {
      const now = new Date();

      const challenges = await prisma.challenge.findMany({
        where: {
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
        orderBy: { endDate: 'asc' },
      });

      if (!userId) {
        return challenges;
      }

      // Get user progress for challenges
      const userChallenges = await prisma.userChallenge.findMany({
        where: {
          userId,
          challengeId: { in: challenges.map(c => c.id) },
        },
      });

      const userChallengeMap = new Map(
        userChallenges.map(uc => [uc.challengeId, uc])
      );

      return challenges.map(challenge => ({
        ...challenge,
        progress: userChallengeMap.get(challenge.id)?.progress || 0,
        completed: userChallengeMap.get(challenge.id)?.completed || false,
        rewardClaimed: userChallengeMap.get(challenge.id)?.rewardClaimed || false,
      }));
    } catch (error) {
      logger.error('Error getting active challenges:', error);
      throw error;
    }
  }

  /**
   * Get user's challenges
   */
  async getUserChallenges(userId: string) {
    try {
      const [activeChallenges, completedChallenges] = await Promise.all([
        prisma.userChallenge.findMany({
          where: {
            userId,
            completed: false,
            challenge: {
              endDate: { gte: new Date() },
            },
          },
          include: {
            challenge: true,
          },
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.userChallenge.findMany({
          where: {
            userId,
            completed: true,
          },
          include: {
            challenge: true,
          },
          orderBy: { completedAt: 'desc' },
          take: 10,
        }),
      ]);

      return {
        active: activeChallenges,
        completed: completedChallenges,
      };
    } catch (error) {
      logger.error('Error getting user challenges:', error);
      throw error;
    }
  }

  /**
   * Create weekly challenges
   */
  async createWeeklyChallenges(): Promise<void> {
    try {
      const startDate = startOfWeek(new Date());
      const endDate = endOfWeek(new Date());

      // Check if challenges already exist for this week
      const existing = await prisma.challenge.findFirst({
        where: {
          type: 'weekly',
          startDate,
        },
      });

      if (existing) {
        return;
      }

      // Create weekly challenges
      const challenges = [
        {
          name: 'Weekend Warrior',
          description: 'Earn 200 CAP this weekend',
          type: 'weekly',
          requirements: {
            action: 'earn',
            amount: 200,
            days: ['Saturday', 'Sunday'],
          },
          rewards: {
            cap: 50,
          },
          startDate,
          endDate,
        },
        {
          name: 'Explorer',
          description: 'Visit 5 new brands',
          type: 'weekly',
          requirements: {
            action: 'visit_brands',
            count: 5,
          },
          rewards: {
            cap: 100,
            badge: 'explorer',
          },
          startDate,
          endDate,
        },
        {
          name: 'Critic',
          description: 'Leave 10 helpful suggestions',
          type: 'weekly',
          requirements: {
            action: 'suggest',
            count: 10,
          },
          rewards: {
            cap: 150,
          },
          startDate,
          endDate,
        },
        {
          name: 'Social Butterfly',
          description: 'Share 5 ads',
          type: 'weekly',
          requirements: {
            action: 'share',
            count: 5,
          },
          rewards: {
            cap: 80,
          },
          startDate,
          endDate,
        },
        {
          name: 'Engagement Master',
          description: 'Complete 50 engagements',
          type: 'weekly',
          requirements: {
            action: 'engage',
            count: 50,
          },
          rewards: {
            cap: 200,
            badge: 'engaged',
          },
          startDate,
          endDate,
        },
      ];

      for (const challenge of challenges) {
        await prisma.challenge.create({
          data: challenge,
        });
      }

      logger.info('Weekly challenges created');
    } catch (error) {
      logger.error('Error creating weekly challenges:', error);
      throw error;
    }
  }

  /**
   * Update challenge progress
   */
  async updateProgress(userId: string, action: string, value: number = 1) {
    try {
      const activeChallenges = await prisma.challenge.findMany({
        where: {
          isActive: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      });

      for (const challenge of activeChallenges) {
        if (this.matchesRequirement(challenge.requirements, action)) {
          await this.incrementProgress(userId, challenge.id, value);
        }
      }
    } catch (error) {
      logger.error('Error updating challenge progress:', error);
      throw error;
    }
  }

  /**
   * Check if action matches challenge requirement
   */
  private matchesRequirement(requirements: any, action: string): boolean {
    if (requirements.action === action) {
      return true;
    }

    // Handle special cases
    if (action === 'earn' && requirements.action === 'earn') {
      return true;
    }

    return false;
  }

  /**
   * Increment challenge progress
   */
  async incrementProgress(userId: string, challengeId: string, value: number = 1) {
    try {
      const challenge = await prisma.challenge.findUnique({
        where: { id: challengeId },
      });

      if (!challenge) {
        return;
      }

      const userChallenge = await prisma.userChallenge.upsert({
        where: {
          userId_challengeId: {
            userId,
            challengeId,
          },
        },
        update: {
          progress: {
            increment: value,
          },
        },
        create: {
          userId,
          challengeId,
          progress: value,
          completed: false,
        },
      });

      // Check if challenge is now complete
      if (!userChallenge.completed) {
        const requirement = challenge.requirements;
        let requiredValue = 0;

        if (requirement.amount) {
          requiredValue = requirement.amount;
        } else if (requirement.count) {
          requiredValue = requirement.count;
        }

        if (userChallenge.progress >= requiredValue) {
          await this.completeChallenge(userId, challengeId);
        }
      }
    } catch (error) {
      logger.error('Error incrementing challenge progress:', error);
      throw error;
    }
  }

  /**
   * Complete a challenge
   */
  async completeChallenge(userId: string, challengeId: string) {
    try {
      const challenge = await prisma.challenge.findUnique({
        where: { id: challengeId },
      });

      if (!challenge) {
        throw new Error('Challenge not found');
      }

      await prisma.$transaction(async (tx) => {
        // Update user challenge
        await tx.userChallenge.update({
          where: {
            userId_challengeId: {
              userId,
              challengeId,
            },
          },
          data: {
            completed: true,
            completedAt: new Date(),
          },
        });

        // Award CAP reward
        if (challenge.rewards.cap) {
          await rewardService.awardReward({
            userId,
            action: 'challenge_complete',
            targetType: 'challenge',
            targetId: challengeId,
            amount: challenge.rewards.cap,
          });
        }

        // Award badge if applicable
        if (challenge.rewards.badge) {
          await tx.userBadge.create({
            data: {
              userId,
              badgeId: challenge.rewards.badge,
            },
          });
        }
      });

      // Send notification
      await notificationService.create({
        userId,
        type: 'ACHIEVEMENT',
        title: '✅ Challenge Complete!',
        body: `You completed the "${challenge.name}" challenge and earned rewards!`,
        data: {
          screen: 'challenges',
          action: 'view',
          id: challengeId,
        },
      });

      logger.info(`User ${userId} completed challenge: ${challenge.name}`);
    } catch (error) {
      logger.error('Error completing challenge:', error);
      throw error;
    }
  }

  /**
   * Claim challenge reward
   */
  async claimReward(userId: string, challengeId: string) {
    try {
      const userChallenge = await prisma.userChallenge.findUnique({
        where: {
          userId_challengeId: {
            userId,
            challengeId,
          },
        },
        include: {
          challenge: true,
        },
      });

      if (!userChallenge || !userChallenge.completed) {
        throw new Error('Challenge not completed');
      }

      if (userChallenge.rewardClaimed) {
        throw new Error('Reward already claimed');
      }

      await prisma.$transaction(async (tx) => {
        // Mark as claimed
        await tx.userChallenge.update({
          where: {
            userId_challengeId: {
              userId,
              challengeId,
            },
          },
          data: { rewardClaimed: true },
        });

        // Award any pending rewards
        if (userChallenge.challenge.rewards.cap) {
          await rewardService.awardReward({
            userId,
            action: 'challenge_claim',
            targetType: 'challenge',
            targetId: challengeId,
            amount: userChallenge.challenge.rewards.cap,
          });
        }
      });

      return { success: true };
    } catch (error) {
      logger.error('Error claiming challenge reward:', error);
      throw error;
    }
  }

  /**
   * Get challenge statistics
   */
  async getChallengeStats(userId: string) {
    try {
      const [totalChallenges, completedChallenges, inProgress] = await Promise.all([
        prisma.challenge.count({
          where: {
            OR: [
              { type: 'weekly' },
              { type: 'daily' },
            ],
          },
        }),
        prisma.userChallenge.count({
          where: {
            userId,
            completed: true,
          },
        }),
        prisma.userChallenge.count({
          where: {
            userId,
            completed: false,
            progress: { gt: 0 },
          },
        }),
      ]);

      const completionRate = totalChallenges > 0 
        ? (completedChallenges / totalChallenges) * 100 
        : 0;

      return {
        totalChallenges,
        completedChallenges,
        inProgress,
        completionRate,
      };
    } catch (error) {
      logger.error('Error getting challenge stats:', error);
      throw error;
    }
  }

  /**
   * Get challenge leaderboard
   */
  async getChallengeLeaderboard(challengeId: string, limit: number = 10) {
    try {
      const topUsers = await prisma.userChallenge.findMany({
        where: {
          challengeId,
          completed: true,
        },
        orderBy: { completedAt: 'asc' },
        take: limit,
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
        },
      });

      return topUsers.map((user, index) => ({
        rank: index + 1,
        userId: user.userId,
        username: user.user?.username,
        displayName: user.user?.profile?.displayName,
        avatarUrl: user.user?.profile?.avatarUrl,
        completedAt: user.completedAt,
      }));
    } catch (error) {
      logger.error('Error getting challenge leaderboard:', error);
      throw error;
    }
  }

  /**
   * Clean up expired challenges
   */
  async cleanupExpired() {
    try {
      const result = await prisma.challenge.updateMany({
        where: {
          endDate: { lt: new Date() },
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      logger.info(`Cleaned up ${result.count} expired challenges`);
      return result.count;
    } catch (error) {
      logger.error('Error cleaning up expired challenges:', error);
      throw error;
    }
  }
}

export const challengeService = new ChallengeService();