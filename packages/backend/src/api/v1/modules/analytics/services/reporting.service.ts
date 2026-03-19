/**
 * Reporting Service
 * Handles generation and management of reports
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { queueService } from '../../../../../core/queue/bull.queue';
import { emailService } from '../../notifications/services/email.service';
import { exportService } from './export.service';
import { startOfDay, endOfDay, subDays, subMonths, formatDate } from '@viraz/shared';

export interface ReportConfig {
  name: string;
  type: 'user' | 'campaign' | 'financial' | 'engagement' | 'custom';
  format: 'pdf' | 'csv' | 'excel' | 'json';
  schedule?: 'daily' | 'weekly' | 'monthly' | null;
  recipients?: string[];
  filters: Record<string, any>;
  metrics: string[];
}

export interface Report {
  id: string;
  name: string;
  type: string;
  format: string;
  url: string;
  createdAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  size?: number;
}

export class ReportingService {
  /**
   * Create a new report
   */
  async createReport(config: ReportConfig): Promise<Report> {
    try {
      const { name, type, format, filters, metrics } = config;

      // Determine date range
      const endDate = new Date();
      let startDate: Date;

      switch (filters.period) {
        case 'today':
          startDate = startOfDay(endDate);
          break;
        case 'yesterday':
          startDate = startOfDay(subDays(endDate, 1));
          endDate.setDate(endDate.getDate() - 1);
          endDate = endOfDay(endDate);
          break;
        case 'week':
          startDate = subDays(endDate, 7);
          break;
        case 'month':
          startDate = subDays(endDate, 30);
          break;
        case 'quarter':
          startDate = subDays(endDate, 90);
          break;
        case 'year':
          startDate = subDays(endDate, 365);
          break;
        default:
          startDate = filters.startDate ? new Date(filters.startDate) : subDays(endDate, 30);
          endDate = filters.endDate ? new Date(filters.endDate) : endDate;
      }

      // Generate report data based on type
      let data: any;

      switch (type) {
        case 'user':
          data = await this.generateUserReport(startDate, endDate, filters, metrics);
          break;
        case 'campaign':
          data = await this.generateCampaignReport(startDate, endDate, filters, metrics);
          break;
        case 'financial':
          data = await this.generateFinancialReport(startDate, endDate, filters, metrics);
          break;
        case 'engagement':
          data = await this.generateEngagementReport(startDate, endDate, filters, metrics);
          break;
        case 'custom':
          data = await this.generateCustomReport(startDate, endDate, filters, metrics);
          break;
      }

      // Generate file
      const fileUrl = await exportService.export(data, format, name);

      // Save report record
      const report = await prisma.report.create({
        data: {
          name,
          type,
          format,
          url: fileUrl,
          periodStart: startDate,
          periodEnd: endDate,
          filters,
          metrics,
          createdAt: new Date(),
        },
      });

      // Schedule recurring report if configured
      if (config.schedule) {
        await this.scheduleRecurringReport(config);
      }

      // Send to recipients if specified
      if (config.recipients && config.recipients.length > 0) {
        await this.sendReportByEmail(report, config.recipients);
      }

      logger.info(`Report created: ${report.id}`);
      return {
        id: report.id,
        name: report.name,
        type: report.type,
        format: report.format,
        url: report.url,
        createdAt: report.createdAt,
        period: {
          start: report.periodStart,
          end: report.periodEnd,
        },
      };
    } catch (error) {
      logger.error('Error creating report:', error);
      throw error;
    }
  }

  /**
   * Generate user report
   */
  private async generateUserReport(startDate: Date, endDate: Date, filters: any, metrics: string[]): Promise<any> {
    const where: any = {
      createdAt: { gte: startDate, lte: endDate },
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.accountType) {
      where.accountType = filters.accountType;
    }

    const [users, newUsers, activeUsers, userStats] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          accountType: true,
          status: true,
          createdAt: true,
          lastActiveAt: true,
          profile: {
            select: {
              displayName: true,
              country: true,
            },
          },
          statistics: {
            select: {
              totalCapEarned: true,
              totalEngagements: true,
              totalReferrals: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
      prisma.user.count({
        where: {
          ...where,
          lastActiveAt: { gte: subDays(endDate, 7) },
        },
      }),
      prisma.userStatistics.aggregate({
        where: { user: where },
        _sum: {
          totalCapEarned: true,
          totalEngagements: true,
          totalReferrals: true,
        },
        _avg: {
          totalCapEarned: true,
          totalEngagements: true,
        },
      }),
    ]);

    // Geographic distribution
    const geoDistribution = await prisma.userProfile.groupBy({
      by: ['country'],
      where: { user: where },
      _count: true,
    });

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalUsers: users.length,
        newUsers,
        activeUsers,
        retentionRate: users.length > 0 ? (activeUsers / users.length) * 100 : 0,
        totalEarnings: userStats._sum.totalCapEarned || 0,
        averageEarnings: userStats._avg.totalCapEarned || 0,
        totalEngagements: userStats._sum.totalEngagements || 0,
      },
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        type: u.accountType,
        status: u.status,
        joinedAt: u.createdAt,
        lastActive: u.lastActiveAt,
        displayName: u.profile?.displayName,
        country: u.profile?.country,
        stats: u.statistics,
      })),
      geoDistribution: geoDistribution.map(g => ({
        country: g.country || 'Unknown',
        count: g._count,
      })),
    };
  }

  /**
   * Generate campaign report
   */
  private async generateCampaignReport(startDate: Date, endDate: Date, filters: any, metrics: string[]): Promise<any> {
    const where: any = {
      createdAt: { gte: startDate, lte: endDate },
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.brandId) {
      where.brandId = filters.brandId;
    }

    const [campaigns, campaignMetrics] = await Promise.all([
      prisma.campaign.findMany({
        where,
        include: {
          brand: {
            select: {
              name: true,
            },
          },
          budgets: true,
          _count: {
            select: {
              ads: true,
            },
          },
        },
      }),
      prisma.campaignMetric.aggregate({
        where: { campaign: where },
        _sum: {
          impressions: true,
          clicks: true,
          engagements: true,
          capSpent: true,
        },
        _avg: {
          ctr: true,
          engagementRate: true,
        },
      }),
    ]);

    // Performance by campaign
    const performance = [];

    for (const campaign of campaigns) {
      const metrics = await prisma.campaignMetric.aggregate({
        where: { campaignId: campaign.id },
        _sum: {
          impressions: true,
          clicks: true,
          engagements: true,
          capSpent: true,
        },
      });

      performance.push({
        id: campaign.id,
        name: campaign.name,
        brand: campaign.brand?.name,
        status: campaign.status,
        budget: campaign.budgets?.[0]?.totalBudget || 0,
        spent: campaign.budgets?.[0]?.spentBudget || 0,
        impressions: metrics._sum.impressions || 0,
        clicks: metrics._sum.clicks || 0,
        engagements: metrics._sum.engagements || 0,
        ctr: metrics._sum.impressions ? (metrics._sum.clicks! / metrics._sum.impressions) * 100 : 0,
        adCount: campaign._count.ads,
      });
    }

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalCampaigns: campaigns.length,
        totalImpressions: campaignMetrics._sum.impressions || 0,
        totalClicks: campaignMetrics._sum.clicks || 0,
        totalEngagements: campaignMetrics._sum.engagements || 0,
        totalSpent: campaignMetrics._sum.capSpent || 0,
        averageCTR: campaignMetrics._avg.ctr || 0,
        averageEngagementRate: campaignMetrics._avg.engagementRate || 0,
      },
      performance,
    };
  }

  /**
   * Generate financial report
   */
  private async generateFinancialReport(startDate: Date, endDate: Date, filters: any, metrics: string[]): Promise<any> {
    const [deposits, withdrawals, transactions, revenue] = await Promise.all([
      prisma.capDeposit.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { fiatAmount: true },
        _count: true,
      }),
      prisma.capWithdrawal.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { fiatAmount: true },
        _count: true,
      }),
      prisma.capTransaction.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.order.aggregate({
        where: {
          status: 'COMPLETED',
          placedAt: { gte: startDate, lte: endDate },
        },
        _sum: { totalFiat: true },
        _count: true,
      }),
    ]);

    // Daily breakdown
    const dailyBreakdown = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayStart = startOfDay(currentDate);
      const dayEnd = endOfDay(currentDate);

      const [dayDeposits, dayWithdrawals, dayRevenue] = await Promise.all([
        prisma.capDeposit.aggregate({
          where: {
            status: 'COMPLETED',
            createdAt: { gte: dayStart, lte: dayEnd },
          },
          _sum: { fiatAmount: true },
        }),
        prisma.capWithdrawal.aggregate({
          where: {
            status: 'COMPLETED',
            createdAt: { gte: dayStart, lte: dayEnd },
          },
          _sum: { fiatAmount: true },
        }),
        prisma.order.aggregate({
          where: {
            status: 'COMPLETED',
            placedAt: { gte: dayStart, lte: dayEnd },
          },
          _sum: { totalFiat: true },
        }),
      ]);

      dailyBreakdown.push({
        date: formatDate(currentDate, 'YYYY-MM-DD'),
        deposits: dayDeposits._sum.fiatAmount || 0,
        withdrawals: dayWithdrawals._sum.fiatAmount || 0,
        revenue: dayRevenue._sum.totalFiat || 0,
        netFlow: (dayDeposits._sum.fiatAmount || 0) - (dayWithdrawals._sum.fiatAmount || 0),
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalDeposits: deposits._sum.fiatAmount || 0,
        depositCount: deposits._count,
        totalWithdrawals: withdrawals._sum.fiatAmount || 0,
        withdrawalCount: withdrawals._count,
        netFlow: (deposits._sum.fiatAmount || 0) - (withdrawals._sum.fiatAmount || 0),
        totalTransactions: transactions._count,
        totalRevenue: revenue._sum.totalFiat || 0,
        orderCount: revenue._count,
        averageOrderValue: revenue._count > 0 ? (revenue._sum.totalFiat || 0) / revenue._count : 0,
      },
      dailyBreakdown,
    };
  }

  /**
   * Generate engagement report
   */
  private async generateEngagementReport(startDate: Date, endDate: Date, filters: any, metrics: string[]): Promise<any> {
    const [totalEngagements, byType, topContent] = await Promise.all([
      prisma.userEngagement.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.userEngagement.groupBy({
        by: ['type'],
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: true,
      }),
      prisma.userEngagement.groupBy({
        by: ['targetType', 'targetId'],
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: true,
        orderBy: {
          _count: {
            targetId: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    // Hourly distribution
    const hourlyDistribution = await prisma.$queryRaw`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as count
      FROM user_engagements
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour ASC
    `;

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalEngagements,
        averagePerDay: totalEngagements / Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      },
      byType: byType.map(t => ({
        type: t.type,
        count: t._count,
      })),
      hourlyDistribution,
      topContent,
    };
  }

  /**
   * Generate custom report
   */
  private async generateCustomReport(startDate: Date, endDate: Date, filters: any, metrics: string[]): Promise<any> {
    // Custom report logic - can combine multiple data sources
    const results: any = {};

    for (const metric of metrics) {
      switch (metric) {
        case 'users':
          results.users = await this.generateUserReport(startDate, endDate, filters, []);
          break;
        case 'campaigns':
          results.campaigns = await this.generateCampaignReport(startDate, endDate, filters, []);
          break;
        case 'financial':
          results.financial = await this.generateFinancialReport(startDate, endDate, filters, []);
          break;
        case 'engagement':
          results.engagement = await this.generateEngagementReport(startDate, endDate, filters, []);
          break;
      }
    }

    return results;
  }

  /**
   * Schedule recurring report
   */
  private async scheduleRecurringReport(config: ReportConfig): Promise<void> {
    try {
      let cronExpression: string;

      switch (config.schedule) {
        case 'daily':
          cronExpression = '0 2 * * *'; // 2 AM daily
          break;
        case 'weekly':
          cronExpression = '0 3 * * 1'; // 3 AM every Monday
          break;
        case 'monthly':
          cronExpression = '0 4 1 * *'; // 4 AM on 1st of month
          break;
        default:
          return;
      }

      await queueService.add('report', {
        config,
        type: 'scheduled',
      }, {
        repeat: { cron: cronExpression },
        jobId: `report:${config.name}:${config.schedule}`,
      });

      logger.info(`Recurring report scheduled: ${config.name} (${config.schedule})`);
    } catch (error) {
      logger.error('Error scheduling recurring report:', error);
      throw error;
    }
  }

  /**
   * Send report by email
   */
  private async sendReportByEmail(report: any, recipients: string[]): Promise<void> {
    try {
      await emailService.send({
        to: recipients.join(','),
        subject: `Report: ${report.name}`,
        template: 'report-ready',
        data: {
          reportName: report.name,
          reportUrl: report.url,
          periodStart: report.periodStart,
          periodEnd: report.periodEnd,
          generatedAt: report.createdAt,
        },
      });

      logger.info(`Report sent to ${recipients.length} recipients`);
    } catch (error) {
      logger.error('Error sending report by email:', error);
    }
  }

  /**
   * Get list of reports
   */
  async getReports(
    filters: {
      type?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ reports: Report[]; total: number }> {
    try {
      const { type, startDate, endDate, limit = 50, offset = 0 } = filters;

      const where: any = {};

      if (type) {
        where.type = type;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [reports, total] = await Promise.all([
        prisma.report.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.report.count({ where }),
      ]);

      return {
        reports: reports.map(r => ({
          id: r.id,
          name: r.name,
          type: r.type,
          format: r.format,
          url: r.url,
          createdAt: r.createdAt,
          period: {
            start: r.periodStart,
            end: r.periodEnd,
          },
        })),
        total,
      };
    } catch (error) {
      logger.error('Error getting reports:', error);
      throw error;
    }
  }

  /**
   * Delete report
   */
  async deleteReport(reportId: string): Promise<void> {
    try {
      await prisma.report.delete({
        where: { id: reportId },
      });

      logger.info(`Report deleted: ${reportId}`);
    } catch (error) {
      logger.error('Error deleting report:', error);
      throw error;
    }
  }
}

export const reportingService = new ReportingService();