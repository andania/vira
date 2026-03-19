/**
 * Report Generation Job
 * Generates and sends various reports
 */

import { Job } from 'bull';
import { prisma } from '../../database/client';
import { logger } from '../../logger';
import { emailService } from '../../../lib/email/email.service';
import { exportService } from '../../../services/export.service';
import { startOfDay, endOfDay, subDays, subWeeks, subMonths, formatDate } from '@viraz/shared';

export interface ReportJobData {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  userId?: string;
  sponsorId?: string;
  startDate?: string;
  endDate?: string;
  format?: 'pdf' | 'csv' | 'excel';
  sendEmail?: boolean;
}

export class ReportJob {
  static async process(job: Job<ReportJobData>) {
    const { type, userId, sponsorId, startDate, endDate, format = 'pdf', sendEmail = true } = job.data;
    
    logger.info(`🔄 Generating ${type} report for ${userId || sponsorId || 'all'}`);

    try {
      let reportData: any;
      let reportTitle: string;
      let reportDate = new Date();

      switch (type) {
        case 'daily':
          reportData = await this.generateDailyReport(startDate ? new Date(startDate) : new Date());
          reportTitle = `Daily Report - ${formatDate(reportDate, 'DATE')}`;
          break;
        case 'weekly':
          reportData = await this.generateWeeklyReport(startDate ? new Date(startDate) : new Date());
          reportTitle = `Weekly Report - Week ${this.getWeekNumber(reportDate)}`;
          break;
        case 'monthly':
          reportData = await this.generateMonthlyReport(startDate ? new Date(startDate) : new Date());
          reportTitle = `Monthly Report - ${formatDate(reportDate, 'MONTH_YEAR')}`;
          break;
        case 'custom':
          if (!startDate || !endDate) throw new Error('Start and end dates required for custom report');
          reportData = await this.generateCustomReport(new Date(startDate), new Date(endDate));
          reportTitle = `Custom Report - ${formatDate(startDate, 'DATE')} to ${formatDate(endDate, 'DATE')}`;
          break;
        default:
          throw new Error(`Unknown report type: ${type}`);
      }

      // Generate file
      const fileUrl = await exportService.generateReport(reportData, reportTitle, format);

      // Store report record
      const report = await prisma.report.create({
        data: {
          type,
          title: reportTitle,
          data: reportData,
          fileUrl,
          format,
          userId,
          sponsorId,
          dateRange: {
            start: startDate ? new Date(startDate) : null,
            end: endDate ? new Date(endDate) : null,
          },
          createdAt: new Date(),
        },
      });

      // Send email if requested
      if (sendEmail && (userId || sponsorId)) {
        await this.sendReportEmail(report, userId, sponsorId);
      }

      logger.info(`✅ Report generated: ${reportTitle}`);
      return {
        reportId: report.id,
        title: reportTitle,
        fileUrl,
        data: reportData,
      };

    } catch (error) {
      logger.error('❌ Report generation failed:', error);
      throw error;
    }
  }

  private static async generateDailyReport(date: Date) {
    const startDate = startOfDay(date);
    const endDate = endOfDay(date);

    const [userMetrics, campaignMetrics, financialMetrics, engagementMetrics] = await Promise.all([
      // User metrics
      prisma.user.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: true,
      }),

      // Campaign metrics
      prisma.campaign.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: true,
      }),

      // Financial metrics
      prisma.$transaction([
        prisma.capTransaction.aggregate({
          where: {
            type: 'EARN',
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        }),
        prisma.capTransaction.aggregate({
          where: {
            type: 'SPEND',
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        }),
        prisma.capDeposit.aggregate({
          where: {
            status: 'COMPLETED',
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { fiatAmount: true },
        }),
        prisma.capWithdrawal.aggregate({
          where: {
            status: 'COMPLETED',
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { fiatAmount: true },
        }),
      ]),

      // Engagement metrics
      prisma.userEngagement.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    return {
      date: formatDate(startDate, 'ISO'),
      summary: {
        newUsers: userMetrics._count,
        newCampaigns: campaignMetrics._count,
        totalEngagements: engagementMetrics,
        capEarned: financialMetrics[0]._sum.amount || 0,
        capSpent: financialMetrics[1]._sum.amount || 0,
        deposits: financialMetrics[2]._sum.fiatAmount || 0,
        withdrawals: financialMetrics[3]._sum.fiatAmount || 0,
      },
      details: {
        // Add more detailed metrics as needed
      },
    };
  }

  private static async generateWeeklyReport(date: Date) {
    const startDate = startOfDay(subDays(date, 7));
    const endDate = endOfDay(date);

    // Get daily reports for the week
    const dailyReports = await prisma.dailyReport.findMany({
      where: {
        reportDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        reportDate: 'asc',
      },
    });

    // Aggregate weekly totals
    const totals = dailyReports.reduce((acc, report) => ({
      newUsers: acc.newUsers + report.newUsers,
      activeUsers: Math.max(acc.activeUsers, report.activeUsers),
      totalCapEarned: acc.totalCapEarned + report.totalCapEarned,
      totalCapSpent: acc.totalCapSpent + report.totalCapSpent,
      totalDeposits: acc.totalDeposits + report.totalDeposits,
      totalWithdrawals: acc.totalWithdrawals + report.totalWithdrawals,
      totalImpressions: acc.totalImpressions + report.totalImpressions,
      totalClicks: acc.totalClicks + report.totalClicks,
      totalEngagements: acc.totalEngagements + report.totalEngagements,
      totalOrders: acc.totalOrders + report.totalOrders,
      totalRevenue: acc.totalRevenue + report.totalRevenue,
    }), {
      newUsers: 0,
      activeUsers: 0,
      totalCapEarned: 0,
      totalCapSpent: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalEngagements: 0,
      totalOrders: 0,
      totalRevenue: 0,
    });

    // Get top performing campaigns
    const topCampaigns = await prisma.campaignMetric.groupBy({
      by: ['campaignId'],
      where: {
        date: { gte: startDate, lte: endDate },
      },
      _sum: {
        impressions: true,
        clicks: true,
        engagements: true,
        capSpent: true,
      },
      orderBy: {
        _sum: {
          engagements: 'desc',
        },
      },
      take: 10,
    });

    const campaignIds = topCampaigns.map(c => c.campaignId);
    const campaigns = await prisma.campaign.findMany({
      where: { id: { in: campaignIds } },
      select: { id: true, name: true, brand: { select: { name: true } } },
    });

    const campaignMap = new Map(campaigns.map(c => [c.id, c]));

    return {
      weekStart: formatDate(startDate, 'DATE'),
      weekEnd: formatDate(endDate, 'DATE'),
      weekNumber: this.getWeekNumber(date),
      summary: totals,
      dailyBreakdown: dailyReports,
      topCampaigns: topCampaigns.map((c, index) => ({
        rank: index + 1,
        campaignId: c.campaignId,
        campaignName: campaignMap.get(c.campaignId)?.name,
        brandName: campaignMap.get(c.campaignId)?.brand?.name,
        impressions: c._sum.impressions || 0,
        clicks: c._sum.clicks || 0,
        engagements: c._sum.engagements || 0,
        capSpent: c._sum.capSpent || 0,
        ctr: c._sum.impressions ? ((c._sum.clicks || 0) / c._sum.impressions * 100).toFixed(2) : 0,
      })),
    };
  }

  private static async generateMonthlyReport(date: Date) {
    const startDate = startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
    const endDate = endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));

    const monthlyReport = await prisma.monthlyReport.findUnique({
      where: {
        reportYear_reportMonth: {
          reportYear: date.getFullYear(),
          reportMonth: date.getMonth() + 1,
        },
      },
    });

    // Get weekly breakdown
    const weeklyData = await this.getWeeklyBreakdown(startDate, endDate);

    // Get user growth trend
    const userGrowth = await prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: true,
    });

    // Get revenue by payment method
    const revenueByMethod = await prisma.orderPayment.groupBy({
      by: ['paymentMethod'],
      where: {
        status: 'PAID',
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: {
        fiatAmount: true,
        capAmount: true,
      },
    });

    return {
      month: formatDate(startDate, 'MONTH_YEAR'),
      year: date.getFullYear(),
      monthNumber: date.getMonth() + 1,
      summary: monthlyReport || {
        newUsers: 0,
        activeUsers: 0,
        retainedUsers: 0,
        churnedUsers: 0,
        totalCapEarned: 0,
        totalCapSpent: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalRevenue: 0,
      },
      weeklyBreakdown: weeklyData,
      userGrowth: userGrowth.length,
      revenueByMethod,
      // Add more monthly metrics
    };
  }

  private static async generateCustomReport(startDate: Date, endDate: Date) {
    // Comprehensive custom report combining multiple data sources
    const [users, campaigns, transactions, engagements, orders] = await Promise.all([
      prisma.user.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        include: {
          profile: true,
          statistics: true,
        },
      }),
      prisma.campaign.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        include: {
          brand: true,
          metrics: true,
        },
      }),
      prisma.capTransaction.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.userEngagement.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        include: {
          user: {
            select: { username: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      prisma.order.findMany({
        where: {
          placedAt: { gte: startDate, lte: endDate },
        },
        include: {
          user: {
            select: { username: true, email: true },
          },
          items: true,
        },
        orderBy: { placedAt: 'desc' },
      }),
    ]);

    return {
      dateRange: {
        start: formatDate(startDate, 'ISO'),
        end: formatDate(endDate, 'ISO'),
      },
      summary: {
        totalUsers: users.length,
        totalCampaigns: campaigns.length,
        totalTransactions: transactions.length,
        totalEngagements: engagements.length,
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, order) => sum + order.totalFiat, 0),
        totalCapEarned: transactions
          .filter(t => t.type === 'EARN')
          .reduce((sum, t) => sum + t.amount, 0),
        totalCapSpent: transactions
          .filter(t => t.type === 'SPEND')
          .reduce((sum, t) => sum + t.amount, 0),
      },
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        joinedAt: u.createdAt,
        status: u.status,
        capEarned: u.statistics?.totalCapEarned || 0,
      })),
      campaigns: campaigns.map(c => ({
        id: c.id,
        name: c.name,
        brand: c.brand?.name,
        status: c.status,
        budget: c.totalBudget,
        spent: c.metrics?.reduce((sum, m) => sum + (m.capSpent || 0), 0) || 0,
        startDate: c.startDate,
        endDate: c.endDate,
      })),
      recentTransactions: transactions.slice(0, 100).map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        createdAt: t.createdAt,
      })),
      recentEngagements: engagements.slice(0, 100).map(e => ({
        id: e.id,
        user: e.user?.username,
        type: e.type,
        targetType: e.targetType,
        createdAt: e.createdAt,
      })),
      recentOrders: orders.slice(0, 100).map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        user: o.user?.username,
        total: o.totalFiat,
        status: o.status,
        placedAt: o.placedAt,
        items: o.items.length,
      })),
    };
  }

  private static async getWeeklyBreakdown(startDate: Date, endDate: Date) {
    const weeks = [];
    let currentStart = new Date(startDate);

    while (currentStart < endDate) {
      const weekEnd = new Date(currentStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekData = await prisma.dailyReport.findMany({
        where: {
          reportDate: {
            gte: currentStart,
            lte: weekEnd > endDate ? endDate : weekEnd,
          },
        },
      });

      weeks.push({
        weekStart: formatDate(currentStart, 'DATE'),
        weekEnd: formatDate(weekEnd > endDate ? endDate : weekEnd, 'DATE'),
        data: weekData,
      });

      currentStart.setDate(currentStart.getDate() + 7);
    }

    return weeks;
  }

  private static getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private static async sendReportEmail(report: any, userId?: string, sponsorId?: string) {
    let email: string | undefined;
    let name: string | undefined;

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, profile: { select: { displayName: true } } },
      });
      email = user?.email;
      name = user?.profile?.displayName;
    } else if (sponsorId) {
      const sponsor = await prisma.sponsor.findUnique({
        where: { id: sponsorId },
        include: { user: true },
      });
      email = sponsor?.user?.email;
      name = sponsor?.companyName;
    }

    if (email) {
      await emailService.send({
        to: email,
        subject: report.title,
        template: 'report-ready',
        data: {
          name,
          reportTitle: report.title,
          reportType: report.type,
          downloadUrl: report.fileUrl,
          generatedAt: report.createdAt,
        },
      });
    }
  }
}

export default ReportJob;