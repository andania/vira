/**
 * Challenge Repository
 * Handles database operations for challenges
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

export class ChallengeRepository extends BaseRepository<any, any, any> {
  protected modelName = 'challenge';
  protected prismaModel = prisma.challenge;

  /**
   * Get active challenges
   */
  async getActiveChallenges() {
    const now = new Date();
    
    return prisma.challenge.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { endDate: 'asc' },
    });
  }

  /**
   * Get challenge by ID with user progress
   */
  async getChallengeWithProgress(challengeId: string, userId?: string) {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge || !userId) {
      return challenge;
    }

    const userChallenge = await prisma.userChallenge.findUnique({
      where: {
        userId_challengeId: {
          userId,
          challengeId,
        },
      },
    });

    return {
      ...challenge,
      userProgress: userChallenge,
    };
  }

  /**
   * Get challenges by type
   */
  async getChallengesByType(type: string) {
    const now = new Date();
    
    return prisma.challenge.findMany({
      where: {
        type,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
  }

  /**
   * Get user challenges
   */
  async getUserChallenges(userId: string) {
    return prisma.userChallenge.findMany({
      where: { userId },
      include: {
        challenge: true,
      },
    });
  }

  /**
   * Get active user challenges
   */
  async getActiveUserChallenges(userId: string) {
    const now = new Date();
    
    return prisma.userChallenge.findMany({
      where: {
        userId,
        completed: false,
        challenge: {
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      },
      include: {
        challenge: true,
      },
    });
  }

  /**
   * Get user challenge
   */
  async getUserChallenge(userId: string, challengeId: string) {
    return prisma.userChallenge.findUnique({
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
  }

  /**
   * Create or update user challenge
   */
  async upsertUserChallenge(
    userId: string,
    challengeId: string,
    data: {
      progress?: number;
      completed?: boolean;
      completedAt?: Date;
      rewardClaimed?: boolean;
    }
  ) {
    return prisma.userChallenge.upsert({
      where: {
        userId_challengeId: {
          userId,
          challengeId,
        },
      },
      update: data,
      create: {
        userId,
        challengeId,
        ...data,
      },
    });
  }

  /**
   * Get completed challenges for user
   */
  async getCompletedChallenges(userId: string) {
    return prisma.userChallenge.findMany({
      where: {
        userId,
        completed: true,
      },
      include: {
        challenge: true,
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  /**
   * Get challenge statistics
   */
  async getChallengeStats() {
    const [total, active, byType] = await Promise.all([
      prisma.challenge.count(),
      prisma.challenge.count({
        where: {
          isActive: true,
          endDate: { gte: new Date() },
        },
      }),
      prisma.challenge.groupBy({
        by: ['type'],
        _count: true,
      }),
    ]);

    return {
      total,
      active,
      byType: byType.reduce((acc, curr) => {
        acc[curr.type] = curr._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Get challenge completion rate
   */
  async getChallengeCompletionRate(challengeId: string) {
    const [total, completed] = await Promise.all([
      prisma.userChallenge.count({
        where: { challengeId },
      }),
      prisma.userChallenge.count({
        where: {
          challengeId,
          completed: true,
        },
      }),
    ]);

    return {
      total,
      completed,
      rate: total > 0 ? (completed / total) * 100 : 0,
    };
  }

  /**
   * Get top challenge completers
   */
  async getTopCompleters(limit: number = 10) {
    const completers = await prisma.userChallenge.groupBy({
      by: ['userId'],
      where: { completed: true },
      _count: true,
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
      take: limit,
    });

    const userIds = completers.map(c => c.userId);
    
    return prisma.user.findMany({
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
  }

  /**
   * Deactivate expired challenges
   */
  async deactivateExpired() {
    return prisma.challenge.updateMany({
      where: {
        endDate: { lt: new Date() },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Create weekly challenges batch
   */
  async createWeeklyChallenges(challenges: any[]) {
    return prisma.challenge.createMany({
      data: challenges,
    });
  }
}

export const challengeRepository = new ChallengeRepository();