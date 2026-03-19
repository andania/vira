/**
 * Admin Repository
 * Handles database operations for admin functions
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

export class AdminRepository extends BaseRepository<any, any, any> {
  protected modelName = 'admin';
  protected prismaModel = prisma.admin;

  /**
   * Get system metrics
   */
  async getSystemMetrics() {
    const [userCount, campaignCount, transactionCount, walletTotal] = await Promise.all([
      prisma.user.count(),
      prisma.campaign.count(),
      prisma.capTransaction.count(),
      prisma.capWallet.aggregate({
        _sum: { balance: true },
      }),
    ]);

    return {
      users: userCount,
      campaigns: campaignCount,
      transactions: transactionCount,
      totalCap: walletTotal._sum.balance || 0,
    };
  }

  /**
   * Get daily metrics for charting
   */
  async getDailyMetrics(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [users, campaigns, transactions] = await Promise.all([
      prisma.user.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: startDate },
        },
        _count: true,
      }),
      prisma.campaign.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: startDate },
        },
        _count: true,
      }),
      prisma.capTransaction.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: startDate },
        },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    return {
      users,
      campaigns,
      transactions,
    };
  }

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(filters: any) {
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
  }

  /**
   * Get system settings
   */
  async getSystemSettings() {
    return prisma.systemSettings.findMany({
      orderBy: { settingKey: 'asc' },
    });
  }

  /**
   * Update system setting
   */
  async updateSystemSetting(key: string, value: string) {
    return prisma.systemSettings.update({
      where: { settingKey: key },
      data: { settingValue: value },
    });
  }

  /**
   * Get feature flags
   */
  async getFeatureFlags() {
    return prisma.featureFlag.findMany({
      where: { enabled: true },
    });
  }

  /**
   * Update feature flag
   */
  async updateFeatureFlag(name: string, enabled: boolean) {
    return prisma.featureFlag.update({
      where: { flagName: name },
      data: { enabled },
    });
  }

  /**
   * Get background job status
   */
  async getJobStatus() {
    return prisma.jobQueue.groupBy({
      by: ['status'],
      _count: true,
    });
  }

  /**
   * Get error logs
   */
  async getErrorLogs(limit: number = 100, offset: number = 0) {
    return prisma.errorLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Clear old logs
   */
  async clearOldLogs(days: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return prisma.$transaction([
      prisma.auditLog.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      }),
      prisma.errorLog.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      }),
      prisma.systemLog.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      }),
    ]);
  }
}

export const adminRepository = new AdminRepository();