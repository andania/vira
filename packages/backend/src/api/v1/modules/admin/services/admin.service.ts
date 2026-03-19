/**
 * Admin Service
 * Main service for admin operations and platform management
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { queueService } from '../../../../../core/queue/bull.queue';
import { notificationService } from '../../notifications/services/notification.service';
import { gamificationService } from '../../gamification/services/gamification.service';
import { subDays, formatDate } from '@viraz/shared';

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  timestamp: Date;
  services: {
    database: { status: 'up' | 'down'; latency: number };
    redis: { status: 'up' | 'down'; latency: number };
    queue: { status: 'up' | 'down'; jobs: number };
    storage: { status: 'up' | 'down' };
  };
  metrics: {
    cpu: number;
    memory: number;
    disk: number;
    requestsPerSecond: number;
  };
}

export interface PlatformStats {
  users: {
    total: number;
    active: number;
    new: number;
    byType: Record<string, number>;
  };
  campaigns: {
    total: number;
    active: number;
    completed: number;
    totalSpend: number;
  };
  financial: {
    totalDeposits: number;
    totalWithdrawals: number;
    totalRevenue: number;
    capInCirculation: number;
  };
  engagement: {
    totalEngagements: number;
    averagePerUser: number;
    topActions: Array<{ action: string; count: number }>;
  };
  timestamp: Date;
}

export class AdminService {
  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const startTime = Date.now();

      // Check database
      let dbStatus: 'up' | 'down' = 'up';
      let dbLatency = 0;
      try {
        const dbStart = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        dbLatency = Date.now() - dbStart;
      } catch (error) {
        dbStatus = 'down';
        logger.error('Database health check failed:', error);
      }

      // Check Redis
      let redisStatus: 'up' | 'down' = 'up';
      let redisLatency = 0;
      try {
        const redisStart = Date.now();
        await redis.ping();
        redisLatency = Date.now() - redisStart;
      } catch (error) {
        redisStatus = 'down';
        logger.error('Redis health check failed:', error);
      }

      // Check queue
      let queueStatus: 'up' | 'down' = 'up';
      let queueJobs = 0;
      try {
        const jobCounts = await queueService.getJobCounts('default');
        queueJobs = Object.values(jobCounts).reduce((a, b) => a + b, 0);
      } catch (error) {
        queueStatus = 'down';
        logger.error('Queue health check failed:', error);
      }

      // Check storage (simulated)
      const storageStatus: 'up' | 'down' = 'up';

      // Determine overall status
      let overallStatus: SystemHealth['status'] = 'healthy';
      if (dbStatus === 'down' || redisStatus === 'down') {
        overallStatus = 'down';
      } else if (dbLatency > 1000 || redisLatency > 100 || queueJobs > 1000) {
        overallStatus = 'degraded';
      }

      // Get system metrics (simulated)
      const metrics = {
        cpu: Math.random() * 80,
        memory: Math.random() * 70,
        disk: Math.random() * 60,
        requestsPerSecond: Math.floor(Math.random() * 100),
      };

      return {
        status: overallStatus,
        uptime: process.uptime(),
        timestamp: new Date(),
        services: {
          database: { status: dbStatus, latency: dbLatency },
          redis: { status: redisStatus, latency: redisLatency },
          queue: { status: queueStatus, jobs: queueJobs },
          storage: { status: storageStatus },
        },
        metrics,
      };
    } catch (error) {
      logger.error('Error getting system health:', error);
      throw error;
    }
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats(): Promise<PlatformStats> {
    try {
      const today = new Date();
      const yesterday = subDays(today, 1);
      const thirtyDaysAgo = subDays(today, 30);

      const [
        totalUsers,
        activeUsers,
        newUsers,
        usersByType,
        campaignStats,
        financialStats,
        engagementStats,
      ] = await Promise.all([
        // Total users
        prisma.user.count(),

        // Active users (last 30 days)
        prisma.user.count({
          where: {
            lastActiveAt: { gte: thirtyDaysAgo },
          },
        }),

        // New users (last 24 hours)
        prisma.user.count({
          where: {
            createdAt: { gte: yesterday },
          },
        }),

        // Users by type
        prisma.user.groupBy({
          by: ['accountType'],
          _count: true,
        }),

        // Campaign stats
        prisma.campaign.aggregate({
          _count: true,
          _sum: { totalBudget: true },
        }),

        // Financial stats
        Promise.all([
          prisma.capDeposit.aggregate({
            where: { status: 'COMPLETED' },
            _sum: { fiatAmount: true },
          }),
          prisma.capWithdrawal.aggregate({
            where: { status: 'COMPLETED' },
            _sum: { fiatAmount: true },
          }),
          prisma.capWallet.aggregate({
            _sum: { balance: true },
          }),
        ]),

        // Engagement stats
        Promise.all([
          prisma.userEngagement.count(),
          prisma.userEngagement.groupBy({
            by: ['type'],
            _count: true,
            orderBy: {
              _count: {
                type: 'desc',
              },
            },
            take: 5,
          }),
        ]),
      ]);

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          new: newUsers,
          byType: usersByType.reduce((acc, curr) => {
            acc[curr.accountType] = curr._count;
            return acc;
          }, {} as Record<string, number>),
        },
        campaigns: {
          total: campaignStats._count,
          active: await prisma.campaign.count({ where: { status: 'ACTIVE' } }),
          completed: await prisma.campaign.count({ where: { status: 'COMPLETED' } }),
          totalSpend: (await prisma.campaignMetric.aggregate({
            _sum: { capSpent: true },
          }))._sum.capSpent || 0,
        },
        financial: {
          totalDeposits: financialStats[0]._sum.fiatAmount || 0,
          totalWithdrawals: financialStats[1]._sum.fiatAmount || 0,
          totalRevenue: (financialStats[0]._sum.fiatAmount || 0) * 0.1, // 10% platform fee
          capInCirculation: financialStats[2]._sum.balance || 0,
        },
        engagement: {
          totalEngagements: engagementStats[0],
          averagePerUser: totalUsers > 0 ? engagementStats[0] / totalUsers : 0,
          topActions: engagementStats[1].map(e => ({
            action: e.type,
            count: e._count,
          })),
        },
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error getting platform stats:', error);
      throw error;
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(
    filters: {
      userId?: string;
      action?: string;
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    try {
      const {
        userId,
        action,
        resourceType,
        startDate,
        endDate,
        limit = 50,
        offset = 0,
      } = filters;

      const where: any = {};

      if (userId) where.userId = userId;
      if (action) where.action = action;
      if (resourceType) where.resourceType = resourceType;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          include: {
            user: {
              select: {
                username: true,
                email: true,
              },
            },
          },
        }),
        prisma.auditLog.count({ where }),
      ]);

      return { logs, total };
    } catch (error) {
      logger.error('Error getting audit logs:', error);
      throw error;
    }
  }

  /**
   * Get system configuration
   */
  async getSystemConfig() {
    try {
      const config = await prisma.systemSettings.findMany({
        orderBy: { settingKey: 'asc' },
      });

      return config.reduce((acc, curr) => {
        acc[curr.settingKey] = {
          value: this.parseSettingValue(curr.settingValue, curr.settingType),
          type: curr.settingType,
          description: curr.description,
        };
        return acc;
      }, {} as Record<string, any>);
    } catch (error) {
      logger.error('Error getting system config:', error);
      throw error;
    }
  }

  /**
   * Update system configuration
   */
  async updateSystemConfig(settings: Record<string, any>) {
    try {
      const updates = [];

      for (const [key, value] of Object.entries(settings)) {
        const setting = await prisma.systemSettings.findUnique({
          where: { settingKey: key },
        });

        if (setting) {
          updates.push(
            prisma.systemSettings.update({
              where: { settingKey: key },
              data: {
                settingValue: String(value),
                updatedAt: new Date(),
              },
            })
          );
        }
      }

      await Promise.all(updates);

      // Log configuration change
      await this.logAdminAction({
        adminId: 'system',
        action: 'UPDATE_CONFIG',
        details: { settings: Object.keys(settings) },
      });

      logger.info('System configuration updated');
    } catch (error) {
      logger.error('Error updating system config:', error);
      throw error;
    }
  }

  /**
   * Get background jobs status
   */
  async getJobsStatus() {
    try {
      const queues = ['default', 'email', 'notification', 'campaign', 'report'];
      const status: Record<string, any> = {};

      for (const queueName of queues) {
        const queue = queueService.getQueue(queueName);
        if (queue) {
          const [waiting, active, completed, failed, delayed] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
            queue.getDelayedCount(),
          ]);

          status[queueName] = {
            waiting,
            active,
            completed,
            failed,
            delayed,
            total: waiting + active + delayed,
          };
        }
      }

      return status;
    } catch (error) {
      logger.error('Error getting jobs status:', error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  async clearCache(type?: string) {
    try {
      if (type) {
        const keys = await redis.keys(`${type}:*`);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } else {
        await redis.flushdb();
      }

      logger.info(`Cache cleared${type ? ` for type: ${type}` : ''}`);
    } catch (error) {
      logger.error('Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Run maintenance tasks
   */
  async runMaintenance(task: string) {
    try {
      switch (task) {
        case 'cleanup':
          await this.cleanupOldData();
          break;
        case 'reindex':
          await this.reindexDatabase();
          break;
        case 'optimize':
          await this.optimizeDatabase();
          break;
        default:
          throw new Error(`Unknown maintenance task: ${task}`);
      }

      logger.info(`Maintenance task completed: ${task}`);
    } catch (error) {
      logger.error('Error running maintenance:', error);
      throw error;
    }
  }

  /**
   * Clean up old data
   */
  private async cleanupOldData() {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const ninetyDaysAgo = subDays(new Date(), 90);

    await Promise.all([
      // Delete old sessions
      prisma.userSession.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      }),

      // Delete old notifications
      prisma.notification.deleteMany({
        where: {
          createdAt: { lt: ninetyDaysAgo },
          isRead: true,
        },
      }),

      // Delete old logs
      prisma.auditLog.deleteMany({
        where: {
          createdAt: { lt: ninetyDaysAgo },
        },
      }),

      // Delete unverified users
      prisma.user.deleteMany({
        where: {
          emailVerified: false,
          createdAt: { lt: thirtyDaysAgo },
        },
      }),
    ]);
  }

  /**
   * Reindex database (simulated)
   */
  private async reindexDatabase() {
    // This would trigger database reindexing
    await prisma.$executeRaw`REINDEX DATABASE "viraz"`;
  }

  /**
   * Optimize database (simulated)
   */
  private async optimizeDatabase() {
    // This would run VACUUM ANALYZE
    await prisma.$executeRaw`VACUUM ANALYZE`;
  }

  /**
   * Log admin action
   */
  async logAdminAction(data: {
    adminId: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    details?: any;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.adminId,
          action: data.action,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          newValues: data.details,
        },
      });
    } catch (error) {
      logger.error('Error logging admin action:', error);
    }
  }

  /**
   * Parse setting value based on type
   */
  private parseSettingValue(value: string, type: string): any {
    switch (type) {
      case 'integer':
        return parseInt(value, 10);
      case 'float':
        return parseFloat(value);
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary() {
    try {
      const [health, stats, jobs, recentActivity] = await Promise.all([
        this.getSystemHealth(),
        this.getPlatformStats(),
        this.getJobsStatus(),
        this.getRecentActivity(10),
      ]);

      return {
        health,
        stats,
        jobs,
        recentActivity,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error getting dashboard summary:', error);
      throw error;
    }
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(limit: number = 20) {
    try {
      const [userActivity, campaignActivity, financialActivity] = await Promise.all([
        prisma.user.findMany({
          where: { lastActiveAt: { not: null } },
          orderBy: { lastActiveAt: 'desc' },
          take: limit,
          select: {
            id: true,
            username: true,
            lastActiveAt: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        }),
        prisma.campaign.findMany({
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
            brand: {
              select: {
                name: true,
              },
            },
          },
        }),
        prisma.capTransaction.findMany({
          where: { amount: { gt: 1000 } }, // Large transactions
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            type: true,
            amount: true,
            createdAt: true,
            wallet: {
              select: {
                user: {
                  select: {
                    username: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      return {
        users: userActivity,
        campaigns: campaignActivity,
        transactions: financialActivity,
      };
    } catch (error) {
      logger.error('Error getting recent activity:', error);
      throw error;
    }
  }
}

export const adminService = new AdminService();