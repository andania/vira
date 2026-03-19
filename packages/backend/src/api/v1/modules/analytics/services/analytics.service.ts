/**
 * Analytics Service
 * Main service for collecting and aggregating analytics data
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { queueService } from '../../../../../core/queue/bull.queue';
import { startOfDay, endOfDay, subDays, subMonths, formatDate } from '@viraz/shared';

export interface AnalyticsEvent {
  userId?: string;
  eventType: string;
  properties: Record<string, any>;
  timestamp?: Date;
}

export interface AnalyticsQuery {
  startDate: Date;
  endDate: Date;
  interval?: 'hour' | 'day' | 'week' | 'month';
  filters?: Record<string, any>;
  groupBy?: string[];
}

export class AnalyticsService {
  /**
   * Track an analytics event
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const { userId, eventType, properties, timestamp = new Date() } = event;

      // Store in database
      await prisma.analyticsEvent.create({
        data: {
          userId,
          eventType,
          properties,
          timestamp,
        },
      });

      // Update real-time counters in Redis
      const today = formatDate(new Date(), 'YYYY-MM-DD');
      const hour = new Date().getHours();

      await redis.hincrby(`analytics:events:${today}`, eventType, 1);
      await redis.hincrby(`analytics:events:${today}:hour:${hour}`, eventType, 1);
      await redis.expire(`analytics:events:${today}`, 7 * 86400); // 7 days
      await redis.expire(`analytics:events:${today}:hour:${hour}`, 48 * 3600); // 48 hours

      // Update user-specific counters if userId provided
      if (userId) {
        await redis.hincrby(`analytics:user:${userId}:${today}`, eventType, 1);
        await redis.expire(`analytics:user:${userId}:${today}`, 30 * 86400); // 30 days
      }

      logger.debug(`Analytics event tracked: ${eventType}`);
    } catch (error) {
      logger.error('Error tracking analytics event:', error);
      // Don't throw - analytics should not break the main flow
    }
  }

  /**
   * Track multiple events in batch
   */
  async trackEvents(events: AnalyticsEvent[]): Promise<void> {
    try {
      await prisma.analyticsEvent.createMany({
        data: events.map(e => ({
          userId: e.userId,
          eventType: e.eventType,
          properties: e.properties,
          timestamp: e.timestamp || new Date(),
        })),
      });

      logger.debug(`Batch tracked ${events.length} analytics events`);
    } catch (error) {
      logger.error('Error tracking batch analytics events:', error);
    }
  }

  /**
   * Query analytics data
   */
  async query(query: AnalyticsQuery): Promise<any> {
    try {
      const { startDate, endDate, interval = 'day', filters = {}, groupBy = [] } = query;

      // Build where clause
      const where: any = {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (filters.eventType) {
        where.eventType = filters.eventType;
      }

      if (filters.userId) {
        where.userId = filters.userId;
      }

      // Get events
      const events = await prisma.analyticsEvent.findMany({
        where,
        orderBy: { timestamp: 'asc' },
      });

      // Group by interval
      const grouped = this.groupByInterval(events, interval);

      // Apply additional grouping
      if (groupBy.length > 0) {
        return this.applyGrouping(grouped, groupBy);
      }

      return grouped;
    } catch (error) {
      logger.error('Error querying analytics:', error);
      throw error;
    }
  }

  /**
   * Group events by time interval
   */
  private groupByInterval(events: any[], interval: string): any[] {
    const grouped = new Map();

    for (const event of events) {
      let key: string;

      switch (interval) {
        case 'hour':
          key = formatDate(event.timestamp, 'YYYY-MM-DD-HH');
          break;
        case 'day':
          key = formatDate(event.timestamp, 'YYYY-MM-DD');
          break;
        case 'week':
          const date = new Date(event.timestamp);
          const week = this.getWeekNumber(date);
          key = `${date.getFullYear()}-W${week}`;
          break;
        case 'month':
          key = formatDate(event.timestamp, 'YYYY-MM');
          break;
        default:
          key = formatDate(event.timestamp, 'YYYY-MM-DD');
      }

      if (!grouped.has(key)) {
        grouped.set(key, {
          period: key,
          total: 0,
          byType: {},
        });
      }

      const group = grouped.get(key);
      group.total++;
      group.byType[event.eventType] = (group.byType[event.eventType] || 0) + 1;
    }

    return Array.from(grouped.values());
  }

  /**
   * Apply additional grouping
   */
  private applyGrouping(data: any[], groupBy: string[]): any {
    const result: any = {};

    for (const item of data) {
      // This would implement more complex grouping logic
      // Simplified for now
    }

    return result;
  }

  /**
   * Get week number
   */
  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  /**
   * Get real-time analytics
   */
  async getRealtimeAnalytics(): Promise<any> {
    try {
      const today = formatDate(new Date(), 'YYYY-MM-DD');
      const currentHour = new Date().getHours();

      const [events today, eventsThisHour, activeUsers] = await Promise.all([
        redis.hgetall(`analytics:events:${today}`),
        redis.hgetall(`analytics:events:${today}:hour:${currentHour}`),
        this.getActiveUsers('realtime'),
      ]);

      return {
        date: today,
        hour: currentHour,
        totalToday: Object.values(eventsToday || {}).reduce((a: any, b: any) => a + parseInt(b), 0),
        thisHour: Object.values(eventsThisHour || {}).reduce((a: any, b: any) => a + parseInt(b), 0),
        byType: eventsToday,
        activeUsers,
      };
    } catch (error) {
      logger.error('Error getting realtime analytics:', error);
      throw error;
    }
  }

  /**
   * Get active users count
   */
  async getActiveUsers(period: 'realtime' | 'today' | 'week' | 'month'): Promise<number> {
    try {
      switch (period) {
        case 'realtime':
          // Users active in last 5 minutes
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          return prisma.analyticsEvent.count({
            where: {
              timestamp: { gte: fiveMinutesAgo },
            },
            distinct: ['userId'],
          });

        case 'today':
          const startOfToday = startOfDay(new Date());
          return prisma.analyticsEvent.count({
            where: {
              timestamp: { gte: startOfToday },
            },
            distinct: ['userId'],
          });

        case 'week':
          const startOfWeek = subDays(new Date(), 7);
          return prisma.analyticsEvent.count({
            where: {
              timestamp: { gte: startOfWeek },
            },
            distinct: ['userId'],
          });

        case 'month':
          const startOfMonth = subDays(new Date(), 30);
          return prisma.analyticsEvent.count({
            where: {
              timestamp: { gte: startOfMonth },
            },
            distinct: ['userId'],
          });

        default:
          return 0;
      }
    } catch (error) {
      logger.error('Error getting active users:', error);
      return 0;
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(userId: string, days: number = 30): Promise<any> {
    try {
      const startDate = subDays(new Date(), days);

      const [events, sessions, earnings, engagements] = await Promise.all([
        prisma.analyticsEvent.groupBy({
          by: ['eventType'],
          where: {
            userId,
            timestamp: { gte: startDate },
          },
          _count: true,
        }),
        prisma.userSession.count({
          where: {
            userId,
            createdAt: { gte: startDate },
          },
        }),
        prisma.capEarning.aggregate({
          where: {
            userId,
            createdAt: { gte: startDate },
          },
          _sum: { finalAmount: true },
        }),
        prisma.userEngagement.count({
          where: {
            userId,
            createdAt: { gte: startDate },
          },
        }),
      ]);

      // Daily activity timeline
      const dailyActivity = await prisma.analyticsEvent.groupBy({
        by: ['timestamp'],
        where: {
          userId,
          timestamp: { gte: startDate },
        },
        _count: true,
      });

      const timeline = [];
      const dayMap = new Map();

      for (const activity of dailyActivity) {
        const date = formatDate(activity.timestamp, 'YYYY-MM-DD');
        dayMap.set(date, (dayMap.get(date) || 0) + activity._count);
      }

      for (let i = 0; i < days; i++) {
        const date = formatDate(subDays(new Date(), i), 'YYYY-MM-DD');
        timeline.unshift({
          date,
          count: dayMap.get(date) || 0,
        });
      }

      return {
        userId,
        period: { days },
        summary: {
          totalEvents: events.reduce((sum, e) => sum + e._count, 0),
          totalSessions: sessions,
          totalEarnings: earnings._sum.finalAmount || 0,
          totalEngagements: engagements,
        },
        byEventType: events.map(e => ({
          type: e.eventType,
          count: e._count,
        })),
        timeline,
      };
    } catch (error) {
      logger.error('Error getting user analytics:', error);
      throw error;
    }
  }

  /**
   * Get platform analytics
   */
  async getPlatformAnalytics(days: number = 30): Promise<any> {
    try {
      const startDate = subDays(new Date(), days);

      const [
        totalUsers,
        newUsers,
        activeUsers,
        totalEvents,
        topEvents,
        hourlyDistribution,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: { createdAt: { gte: startDate } },
        }),
        this.getActiveUsers('week'),
        prisma.analyticsEvent.count({
          where: { timestamp: { gte: startDate } },
        }),
        prisma.analyticsEvent.groupBy({
          by: ['eventType'],
          where: { timestamp: { gte: startDate } },
          _count: true,
          orderBy: {
            _count: {
              eventType: 'desc',
            },
          },
          take: 10,
        }),
        prisma.$queryRaw`
          SELECT 
            EXTRACT(HOUR FROM timestamp) as hour,
            COUNT(*) as count
          FROM analytics_events
          WHERE timestamp >= ${startDate}
          GROUP BY EXTRACT(HOUR FROM timestamp)
          ORDER BY hour ASC
        `,
      ]);

      return {
        period: { days },
        summary: {
          totalUsers,
          newUsers,
          activeUsers,
          totalEvents,
          eventsPerUser: totalUsers > 0 ? totalEvents / totalUsers : 0,
        },
        topEvents: topEvents.map(e => ({
          type: e.eventType,
          count: e._count,
        })),
        hourlyDistribution,
      };
    } catch (error) {
      logger.error('Error getting platform analytics:', error);
      throw error;
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(query: AnalyticsQuery, format: 'json' | 'csv' = 'json'): Promise<any> {
    try {
      const data = await this.query(query);

      if (format === 'csv') {
        return this.convertToCSV(data);
      }

      return data;
    } catch (error) {
      logger.error('Error exporting analytics:', error);
      throw error;
    }
  }

  /**
   * Convert data to CSV
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(obj => 
      headers.map(header => JSON.stringify(obj[header] || '')).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Schedule analytics aggregation
   */
  async scheduleAggregation(): Promise<void> {
    try {
      // Queue daily aggregation
      await queueService.add('analytics', {
        type: 'daily',
      }, {
        repeat: { cron: '0 1 * * *' }, // 1 AM daily
      });

      // Queue hourly aggregation
      await queueService.add('analytics', {
        type: 'hourly',
      }, {
        repeat: { cron: '0 * * * *' }, // Every hour
      });

      logger.info('Analytics aggregation scheduled');
    } catch (error) {
      logger.error('Error scheduling analytics aggregation:', error);
      throw error;
    }
  }

  /**
   * Aggregate analytics data
   */
  async aggregate(type: 'hourly' | 'daily' | 'monthly'): Promise<void> {
    try {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (type) {
        case 'hourly':
          startDate = subDays(now, 1);
          endDate = now;
          break;
        case 'daily':
          startDate = subDays(now, 1);
          endDate = now;
          break;
        case 'monthly':
          startDate = subMonths(now, 1);
          endDate = now;
          break;
      }

      const events = await prisma.analyticsEvent.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Group and store aggregated data
      const aggregated = this.groupByInterval(events, type === 'hourly' ? 'hour' : 'day');

      await prisma.analyticsAggregation.create({
        data: {
          type,
          period: {
            start: startDate,
            end: endDate,
          },
          data: aggregated,
        },
      });

      logger.info(`Analytics aggregation completed: ${type}`);
    } catch (error) {
      logger.error('Error aggregating analytics:', error);
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();