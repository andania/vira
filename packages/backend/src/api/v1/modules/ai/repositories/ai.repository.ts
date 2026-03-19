/**
 * AI Repository
 * Handles database operations for AI data
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

export class AIRepository extends BaseRepository<any, any, any> {
  protected modelName = 'aiLog';
  protected prismaModel = prisma.aILog;

  /**
   * Get AI usage logs
   */
  async getUsageLogs(
    filters: {
      requestType?: string;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
      success?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const {
      requestType,
      userId,
      startDate,
      endDate,
      success,
      limit = 100,
      offset = 0,
    } = filters;

    const where: any = {};

    if (requestType) where.requestType = requestType;
    if (userId) where.userId = userId;
    if (success !== undefined) where.success = success;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.aILog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.aILog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Get AI usage statistics
   */
  async getUsageStats(startDate: Date, endDate: Date) {
    const [total, byType, avgLatency, successRate] = await Promise.all([
      prisma.aILog.count({
        where: {
          timestamp: { gte: startDate, lte: endDate },
        },
      }),
      prisma.aILog.groupBy({
        by: ['requestType'],
        where: {
          timestamp: { gte: startDate, lte: endDate },
        },
        _count: true,
      }),
      prisma.aILog.aggregate({
        where: {
          timestamp: { gte: startDate, lte: endDate },
          processingTime: { not: null },
        },
        _avg: {
          processingTime: true,
        },
      }),
      prisma.aILog.aggregate({
        where: {
          timestamp: { gte: startDate, lte: endDate },
        },
        _count: {
          success: true,
        },
      }),
    ]);

    const successful = successRate._count?.success || 0;
    const successRateValue = total > 0 ? (successful / total) * 100 : 0;

    return {
      total,
      byType: byType.reduce((acc, curr) => {
        acc[curr.requestType] = curr._count;
        return acc;
      }, {} as Record<string, number>),
      averageLatency: avgLatency._avg.processingTime || 0,
      successRate: successRateValue,
    };
  }

  /**
   * Get user interaction data for ML training
   */
  async getUserInteractionData(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [engagements, views, purchases, sessions] = await Promise.all([
      prisma.userEngagement.findMany({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.contentView.findMany({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.order.findMany({
        where: {
          userId,
          placedAt: { gte: startDate },
        },
        include: {
          items: true,
        },
        orderBy: { placedAt: 'asc' },
      }),
      prisma.userSession.findMany({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      engagements,
      views,
      purchases,
      sessions,
    };
  }

  /**
   * Get item popularity data
   */
  async getItemPopularityData(itemType: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let data;

    switch (itemType) {
      case 'ad':
        data = await prisma.adImpression.groupBy({
          by: ['adId'],
          where: {
            viewedAt: { gte: startDate },
          },
          _count: true,
          orderBy: {
            _count: {
              adId: 'desc',
            },
          },
        });
        break;
      case 'room':
        data = await prisma.roomParticipant.groupBy({
          by: ['roomId'],
          where: {
            joinedAt: { gte: startDate },
          },
          _count: true,
          orderBy: {
            _count: {
              roomId: 'desc',
            },
          },
        });
        break;
      case 'product':
        data = await prisma.contentView.groupBy({
          by: ['targetId'],
          where: {
            targetType: 'product',
            createdAt: { gte: startDate },
          },
          _count: true,
          orderBy: {
            _count: {
              targetId: 'desc',
            },
          },
        });
        break;
      default:
        data = [];
    }

    return data;
  }

  /**
   * Save model metrics
   */
  async saveModelMetrics(modelName: string, metrics: any) {
    return prisma.modelMetrics.create({
      data: {
        modelName,
        metrics,
        timestamp: new Date(),
      },
    });
  }

  /**
   * Get model metrics history
   */
  async getModelMetrics(modelName: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return prisma.modelMetrics.findMany({
      where: {
        modelName,
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Get feature importance data
   */
  async getFeatureImportance(modelName: string) {
    // This would retrieve feature importance from ML model storage
    return null;
  }

  /**
   * Clean up old logs
   */
  async cleanupOldLogs(days: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return prisma.aILog.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
      },
    });
  }
}

export const aiRepository = new AIRepository();