/**
 * Analytics Repository
 * Handles database operations for analytics data
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

export class AnalyticsRepository extends BaseRepository<any, any, any> {
  protected modelName = 'analyticsEvent';
  protected prismaModel = prisma.analyticsEvent;

  /**
   * Get events by type and date range
   */
  async getEventsByType(
    eventType: string,
    startDate: Date,
    endDate: Date,
    limit: number = 1000
  ) {
    return prisma.analyticsEvent.findMany({
      where: {
        eventType,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Get event counts by type
   */
  async getEventCountsByType(startDate: Date, endDate: Date) {
    const events = await prisma.analyticsEvent.groupBy({
      by: ['eventType'],
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: true,
      orderBy: {
        _count: {
          eventType: 'desc',
        },
      },
    });

    return events.map(e => ({
      type: e.eventType,
      count: e._count,
    }));
  }

  /**
   * Get user event history
   */
  async getUserEvents(userId: string, limit: number = 100, offset: number = 0) {
    const [events, total] = await Promise.all([
      prisma.analyticsEvent.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.analyticsEvent.count({ where: { userId } }),
    ]);

    return { events, total };
  }

  /**
   * Get daily event counts
   */
  async getDailyEventCounts(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const events = await prisma.$queryRaw`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as count
      FROM analytics_events
      WHERE timestamp >= ${startDate}
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `;

    return events;
  }

  /**
   * Get hourly distribution
   */
  async getHourlyDistribution(startDate: Date, endDate: Date) {
    const distribution = await prisma.$queryRaw`
      SELECT 
        EXTRACT(HOUR FROM timestamp) as hour,
        COUNT(*) as count
      FROM analytics_events
      WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
      GROUP BY EXTRACT(HOUR FROM timestamp)
      ORDER BY hour ASC
    `;

    return distribution;
  }

  /**
   * Get top users by event count
   */
  async getTopUsers(limit: number = 10, startDate?: Date, endDate?: Date) {
    const where: any = {};
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const topUsers = await prisma.analyticsEvent.groupBy({
      by: ['userId'],
      where,
      _count: true,
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
      take: limit,
    });

    const userIds = topUsers.map(u => u.userId).filter(Boolean);
    
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

    return topUsers.map(u => ({
      userId: u.userId,
      username: userMap.get(u.userId)?.username,
      displayName: userMap.get(u.userId)?.profile?.displayName,
      avatarUrl: userMap.get(u.userId)?.profile?.avatarUrl,
      count: u._count,
    }));
  }

  /**
   * Get event funnel
   */
  async getEventFunnel(events: string[], startDate: Date, endDate: Date) {
    const funnel = [];

    for (let i = 0; i < events.length; i++) {
      const eventType = events[i];
      
      const count = await prisma.analyticsEvent.count({
        where: {
          eventType,
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const previousCount = i > 0 ? funnel[i - 1].count : count;
      const conversionRate = i > 0 ? (count / previousCount) * 100 : 100;

      funnel.push({
        step: i + 1,
        event: eventType,
        count,
        conversionRate,
      });
    }

    return funnel;
  }

  /**
   * Get retention data
   */
  async getRetentionData(cohortDate: Date, periods: number = 7) {
    // Get users who joined on cohort date
    const cohortUsers = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: cohortDate,
          lt: new Date(cohortDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      select: { id: true },
    });

    const userIds = cohortUsers.map(u => u.id);
    const retention = [];

    for (let i = 0; i <= periods; i++) {
      const periodStart = new Date(cohortDate);
      periodStart.setDate(periodStart.getDate() + i);
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 1);

      const activeUsers = await prisma.analyticsEvent.count({
        where: {
          userId: { in: userIds },
          timestamp: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
        distinct: ['userId'],
      });

      retention.push({
        period: i,
        activeUsers,
        retentionRate: (activeUsers / userIds.length) * 100,
      });
    }

    return {
      cohort: cohortDate,
      size: userIds.length,
      retention,
    };
  }

  /**
   * Clean up old events
   */
  async cleanupOldEvents(days: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await prisma.analyticsEvent.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
      },
    });

    return result.count;
  }
}

export const analyticsRepository = new AnalyticsRepository();