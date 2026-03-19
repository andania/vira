/**
 * Analytics Aggregation Job
 * Calculates daily/monthly analytics metrics
 */

import { Job } from 'bull';
import { prisma } from '../../database/client';
import { logger } from '../../logger';
import { startOfDay, endOfDay, subDays, formatDate } from '@viraz/shared';

export interface AnalyticsJobData {
  date?: string;
  type?: 'daily' | 'monthly';
}

export class AnalyticsJob {
  static async process(job: Job<AnalyticsJobData>) {
    const { date = formatDate(new Date(), 'DATE'), type = 'daily' } = job.data;
    
    logger.info(`🔄 Starting analytics aggregation job (type: ${type}, date: ${date})`);

    try {
      const targetDate = new Date(date);
      
      if (type === 'daily') {
        await this.aggregateDailyAnalytics(targetDate);
      } else {
        await this.aggregateMonthlyAnalytics(targetDate);
      }

      logger.info(`✅ Analytics aggregation job completed`, { type, date });

      return { type, date, success: true };

    } catch (error) {
      logger.error('❌ Analytics aggregation job failed:', error);
      throw error;
    }
  }

  private static async aggregateDailyAnalytics(date: Date) {
    const startDate = startOfDay(date);
    const endDate = endOfDay(date);

    // User metrics
    const newUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const activeUsers = await prisma.userSession.count({
      where: {
        lastActivity: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // CAP metrics
    const capEarned = await prisma.capTransaction.aggregate({
      where: {
        type: 'EARN',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const capSpent = await prisma.capTransaction.aggregate({
      where: {
        type: 'SPEND',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Financial metrics
    const deposits = await prisma.capDeposit.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        fiatAmount: true,
      },
    });

    const withdrawals = await prisma.capWithdrawal.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        fiatAmount: true,
      },
    });

    // Engagement metrics
    const impressions = await prisma.adImpression.count({
      where: {
        viewedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const clicks = await prisma.adClick.count({
      where: {
        clickedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const engagements = await prisma.userEngagement.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Order metrics
    const orders = await prisma.order.aggregate({
      where: {
        placedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        _all: true,
      },
      _sum: {
        totalFiat: true,
      },
    });

    // Store daily report
    await prisma.dailyReport.upsert({
      where: { reportDate: startDate },
      update: {
        newUsers,
        activeUsers,
        totalCapEarned: capEarned._sum.amount || 0,
        totalCapSpent: capSpent._sum.amount || 0,
        totalDeposits: deposits._sum.fiatAmount || 0,
        totalWithdrawals: withdrawals._sum.fiatAmount || 0,
        totalImpressions: impressions,
        totalClicks: clicks,
        totalEngagements: engagements,
        totalOrders: orders._count._all || 0,
        totalRevenue: orders._sum.totalFiat || 0,
      },
      create: {
        reportDate: startDate,
        newUsers,
        activeUsers,
        totalCapEarned: capEarned._sum.amount || 0,
        totalCapSpent: capSpent._sum.amount || 0,
        totalDeposits: deposits._sum.fiatAmount || 0,
        totalWithdrawals: withdrawals._sum.fiatAmount || 0,
        totalImpressions: impressions,
        totalClicks: clicks,
        totalEngagements: engagements,
        totalOrders: orders._count._all || 0,
        totalRevenue: orders._sum.totalFiat || 0,
      },
    });

    // Update campaign metrics
    await this.updateCampaignMetrics(startDate, endDate);

    // Update ad metrics
    await this.updateAdMetrics(startDate, endDate);

    // Update room metrics
    await this.updateRoomMetrics(startDate, endDate);
  }

  private static async aggregateMonthlyAnalytics(date: Date) {
    const startDate = startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
    const endDate = endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));

    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // Aggregate from daily reports
    const dailyReports = await prisma.dailyReport.aggregate({
      where: {
        reportDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        newUsers: true,
        activeUsers: true,
        totalCapEarned: true,
        totalCapSpent: true,
        totalDeposits: true,
        totalWithdrawals: true,
        totalImpressions: true,
        totalClicks: true,
        totalEngagements: true,
        totalOrders: true,
        totalRevenue: true,
      },
    });

    // Calculate retention (users active in this month who were also active previous month)
    const previousMonthStart = startOfDay(new Date(date.getFullYear(), date.getMonth() - 1, 1));
    const previousMonthEnd = endOfDay(new Date(date.getFullYear(), date.getMonth(), 0));

    const previousActiveUsers = await prisma.userSession.groupBy({
      by: ['userId'],
      where: {
        lastActivity: {
          gte: previousMonthStart,
          lte: previousMonthEnd,
        },
      },
    });

    const currentActiveUsers = await prisma.userSession.groupBy({
      by: ['userId'],
      where: {
        lastActivity: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const previousUserIds = new Set(previousActiveUsers.map(u => u.userId));
    const retainedUsers = currentActiveUsers.filter(u => previousUserIds.has(u.userId)).length;
    const churnedUsers = previousActiveUsers.length - retainedUsers;

    // Store monthly report
    await prisma.monthlyReport.upsert({
      where: {
        reportYear_reportMonth: {
          reportYear: year,
          reportMonth: month,
        },
      },
      update: {
        newUsers: dailyReports._sum.newUsers || 0,
        activeUsers: currentActiveUsers.length,
        retainedUsers,
        churnedUsers: Math.max(0, churnedUsers),
        totalCapEarned: dailyReports._sum.totalCapEarned || 0,
        totalCapSpent: dailyReports._sum.totalCapSpent || 0,
        totalDeposits: dailyReports._sum.totalDeposits || 0,
        totalWithdrawals: dailyReports._sum.totalWithdrawals || 0,
        totalRevenue: dailyReports._sum.totalRevenue || 0,
      },
      create: {
        reportYear: year,
        reportMonth: month,
        newUsers: dailyReports._sum.newUsers || 0,
        activeUsers: currentActiveUsers.length,
        retainedUsers,
        churnedUsers: Math.max(0, churnedUsers),
        totalCapEarned: dailyReports._sum.totalCapEarned || 0,
        totalCapSpent: dailyReports._sum.totalCapSpent || 0,
        totalDeposits: dailyReports._sum.totalDeposits || 0,
        totalWithdrawals: dailyReports._sum.totalWithdrawals || 0,
        totalRevenue: dailyReports._sum.totalRevenue || 0,
      },
    });
  }

  private static async updateCampaignMetrics(startDate: Date, endDate: Date) {
    const campaigns = await prisma.campaign.findMany({
      select: { id: true },
    });

    for (const campaign of campaigns) {
      const impressions = await prisma.adImpression.count({
        where: {
          ad: {
            campaignId: campaign.id,
          },
          viewedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const clicks = await prisma.adClick.count({
        where: {
          ad: {
            campaignId: campaign.id,
          },
          clickedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const engagements = await prisma.userEngagement.count({
        where: {
          targetType: 'campaign',
          targetId: campaign.id,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const capSpent = await prisma.capTransaction.aggregate({
        where: {
          referenceType: 'campaign',
          referenceId: campaign.id,
          type: 'SPEND',
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: {
          amount: true,
        },
      });

      await prisma.campaignMetric.upsert({
        where: {
          campaignId_date: {
            campaignId: campaign.id,
            date: startDate,
          },
        },
        update: {
          impressions,
          clicks,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          engagements,
          capSpent: capSpent._sum.amount || 0,
        },
        create: {
          campaignId: campaign.id,
          date: startDate,
          impressions,
          clicks,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          engagements,
          capSpent: capSpent._sum.amount || 0,
        },
      });
    }
  }

  private static async updateAdMetrics(startDate: Date, endDate: Date) {
    const ads = await prisma.ad.findMany({
      select: { id: true },
    });

    for (const ad of ads) {
      const impressions = await prisma.adImpression.count({
        where: {
          adId: ad.id,
          viewedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const clicks = await prisma.adClick.count({
        where: {
          adId: ad.id,
          clickedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const views = await prisma.contentView.count({
        where: {
          targetType: 'ad',
          targetId: ad.id,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      await prisma.adMetric.upsert({
        where: {
          adId_date: {
            adId: ad.id,
            date: startDate,
          },
        },
        update: {
          impressions,
          clicks,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          views,
        },
        create: {
          adId: ad.id,
          date: startDate,
          impressions,
          clicks,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          views,
        },
      });
    }
  }

  private static async updateRoomMetrics(startDate: Date, endDate: Date) {
    const rooms = await prisma.room.findMany({
      select: { id: true },
    });

    for (const room of rooms) {
      const participants = await prisma.roomParticipant.groupBy({
        by: ['roomId'],
        where: {
          roomId: room.id,
          joinedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          _all: true,
        },
      });

      const messages = await prisma.roomMessage.count({
        where: {
          roomId: room.id,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const peakParticipants = await prisma.roomEvent.findFirst({
        where: {
          roomId: room.id,
          eventType: 'join',
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          eventData: 'desc',
        },
      });

      await prisma.roomMetric.upsert({
        where: {
          roomId_date: {
            roomId: room.id,
            date: startDate,
          },
        },
        update: {
          totalParticipants: participants[0]?._count._all || 0,
          peakParticipants: (peakParticipants?.eventData as any)?.count || 0,
          messagesCount: messages,
        },
        create: {
          roomId: room.id,
          date: startDate,
          totalParticipants: participants[0]?._count._all || 0,
          peakParticipants: (peakParticipants?.eventData as any)?.count || 0,
          messagesCount: messages,
        },
      });
    }
  }
}

export default AnalyticsJob;