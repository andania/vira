/**
 * Engagement Repository
 * Handles database operations for engagement data
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

export class EngagementRepository extends BaseRepository<any, any, any> {
  protected modelName = 'engagement';
  protected prismaModel = prisma.engagement;

  /**
   * Get engagement counts for a target
   */
  async getEngagementCounts(targetType: string, targetId: string) {
    const [likes, comments, shares, views, saves] = await Promise.all([
      prisma.like.count({ where: { targetType: targetType as any, targetId } }),
      prisma.comment.count({ where: { targetType: targetType as any, targetId, isDeleted: false } }),
      prisma.share.count({ where: { targetType: targetType as any, targetId } }),
      prisma.contentView.count({ where: { targetType: targetType as any, targetId } }),
      prisma.savedItem.count({ where: { targetType: targetType as any, targetId } }),
    ]);

    return { likes, comments, shares, views, saves };
  }

  /**
   * Get user engagement history
   */
  async getUserEngagement(userId: string, limit: number = 50, offset: number = 0) {
    const [engagements, total] = await Promise.all([
      prisma.userEngagement.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
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
      }),
      prisma.userEngagement.count({ where: { userId } }),
    ]);

    return { engagements, total };
  }

  /**
   * Get recent engagements for a target
   */
  async getRecentEngagements(targetType: string, targetId: string, limit: number = 20) {
    return prisma.userEngagement.findMany({
      where: {
        targetType: targetType as any,
        targetId,
      },
      orderBy: { createdAt: 'desc' },
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
  }

  /**
   * Check if user has engaged with target
   */
  async hasUserEngaged(userId: string, targetType: string, targetId: string, action: string) {
    const count = await prisma.userEngagement.count({
      where: {
        userId,
        targetType: targetType as any,
        targetId,
        type: action,
      },
    });

    return count > 0;
  }

  /**
   * Get top engaged targets
   */
  async getTopEngagedTargets(targetType: string, limit: number = 10) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const topTargets = await prisma.userEngagement.groupBy({
      by: ['targetId'],
      where: {
        targetType: targetType as any,
        createdAt: { gte: sevenDaysAgo },
      },
      _count: true,
      orderBy: {
        _count: {
          targetId: 'desc',
        },
      },
      take: limit,
    });

    return topTargets.map(t => ({
      targetId: t.targetId,
      engagementCount: t._count,
    }));
  }

  /**
   * Get engagement trends over time
   */
  async getEngagementTrends(targetType: string, targetId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const engagements = await prisma.userEngagement.groupBy({
      by: ['type', 'createdAt'],
      where: {
        targetType: targetType as any,
        targetId,
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // Group by day
    const dailyData = new Map();
    
    for (const engagement of engagements) {
      const date = engagement.createdAt.toISOString().split('T')[0];
      const key = `${date}_${engagement.type}`;
      
      if (!dailyData.has(key)) {
        dailyData.set(key, {
          date,
          type: engagement.type,
          count: engagement._count,
        });
      } else {
        dailyData.get(key).count += engagement._count;
      }
    }

    return Array.from(dailyData.values());
  }
}

export const engagementRepository = new EngagementRepository();