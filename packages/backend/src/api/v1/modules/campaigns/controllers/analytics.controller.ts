/**
 * Campaign Analytics Controller
 * Handles HTTP requests for campaign analytics and reporting
 */

import { Request, Response } from 'express';
import { prisma } from '../../../../../core/database/client';
import { logger } from '../../../../../core/logger';
import { exportService } from '../../../../services/export.service';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class CampaignAnalyticsController {
  /**
   * Get campaign performance metrics
   */
  async getCampaignMetrics(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;
      const { startDate, endDate, interval = 'day' } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Get campaign metrics
      const metrics = await prisma.campaignMetric.findMany({
        where: {
          campaignId,
          date: {
            gte: start,
            lte: end,
          },
        },
        orderBy: { date: 'asc' },
      });

      // Get campaign details
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          budgets: true,
          capAllocations: true,
        },
      });

      // Calculate aggregated metrics
      const totals = metrics.reduce((acc, m) => ({
        impressions: acc.impressions + m.impressions,
        clicks: acc.clicks + m.clicks,
        engagements: acc.engagements + m.engagements,
        capSpent: acc.capSpent + m.capSpent,
      }), {
        impressions: 0,
        clicks: 0,
        engagements: 0,
        capSpent: 0,
      });

      const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
      const engagementRate = totals.impressions > 0 ? (totals.engagements / totals.impressions) * 100 : 0;
      const costPerClick = totals.clicks > 0 ? totals.capSpent / totals.clicks : 0;
      const costPerEngagement = totals.engagements > 0 ? totals.capSpent / totals.engagements : 0;

      // Get top performing ads
      const topAds = await prisma.ad.findMany({
        where: { campaignId },
        include: {
          _count: {
            select: {
              impressions: true,
              clicks: true,
            },
          },
        },
        orderBy: {
          impressions: {
            _count: 'desc',
          },
        },
        take: 5,
      });

      return res.json({
        success: true,
        data: {
          campaign: {
            id: campaign?.id,
            name: campaign?.name,
            status: campaign?.status,
            budget: campaign?.budgets?.[0],
            capAllocation: campaign?.capAllocations?.[0],
          },
          period: { start, end },
          totals,
          rates: {
            ctr,
            engagementRate,
            costPerClick,
            costPerEngagement,
          },
          dailyMetrics: metrics,
          topAds: topAds.map(ad => ({
            id: ad.id,
            name: ad.name,
            impressions: ad._count.impressions,
            clicks: ad._count.clicks,
          })),
        },
      });
    } catch (error) {
      logger.error('Error in getCampaignMetrics:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get campaign metrics',
        },
      });
    }
  }

  /**
   * Get campaign ROI analysis
   */
  async getCampaignROI(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;

      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          budgets: true,
          metrics: true,
        },
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'Campaign not found',
          },
        });
      }

      // Get conversions (purchases from this campaign)
      const conversions = await prisma.order.findMany({
        where: {
          items: {
            some: {
              product: {
                campaignId,
              },
            },
          },
        },
        select: {
          totalFiat: true,
          createdAt: true,
        },
      });

      const totalRevenue = conversions.reduce((sum, order) => sum + order.totalFiat, 0);
      const totalSpent = campaign.budgets?.[0]?.spentBudget || 0;
      const roi = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0;

      // Get daily revenue data
      const dailyRevenue = await prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          SUM(total_fiat) as revenue
        FROM orders
        WHERE campaign_id = ${campaignId}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

      return res.json({
        success: true,
        data: {
          campaignId,
          campaignName: campaign.name,
          totalSpent,
          totalRevenue,
          roi,
          profit: totalRevenue - totalSpent,
          conversions: conversions.length,
          averageOrderValue: conversions.length > 0 ? totalRevenue / conversions.length : 0,
          dailyRevenue,
        },
      });
    } catch (error) {
      logger.error('Error in getCampaignROI:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to calculate ROI',
        },
      });
    }
  }

  /**
   * Get audience insights
   */
  async getAudienceInsights(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;

      // Get users who engaged with this campaign
      const engagements = await prisma.userEngagement.findMany({
        where: {
          targetType: 'campaign',
          targetId: campaignId,
        },
        include: {
          user: {
            include: {
              profile: true,
              locations: true,
            },
          },
        },
      });

      // Demographic breakdown
      const demographics = {
        age: {
          '18-24': 0,
          '25-34': 0,
          '35-44': 0,
          '45-54': 0,
          '55+': 0,
        },
        gender: {} as Record<string, number>,
        location: {} as Record<string, number>,
        interests: {} as Record<string, number>,
      };

      const now = new Date();

      for (const engagement of engagements) {
        const user = engagement.user;
        const profile = user.profile;

        if (profile?.birthDate) {
          const age = now.getFullYear() - new Date(profile.birthDate).getFullYear();
          if (age < 25) demographics.age['18-24']++;
          else if (age < 35) demographics.age['25-34']++;
          else if (age < 45) demographics.age['35-44']++;
          else if (age < 55) demographics.age['45-54']++;
          else demographics.age['55+']++;
        }

        if (profile?.gender) {
          demographics.gender[profile.gender] = (demographics.gender[profile.gender] || 0) + 1;
        }

        if (user.locations?.[0]?.country) {
          const country = user.locations[0].country;
          demographics.location[country] = (demographics.location[country] || 0) + 1;
        }

        if (profile?.interests) {
          for (const interest of profile.interests) {
            demographics.interests[interest] = (demographics.interests[interest] || 0) + 1;
          }
        }
      }

      // Device breakdown
      const devices = await prisma.userSession.groupBy({
        by: ['deviceType'],
        where: {
          userId: { in: engagements.map(e => e.userId) },
        },
        _count: true,
      });

      return res.json({
        success: true,
        data: {
          totalEngagers: engagements.length,
          demographics,
          devices: devices.map(d => ({
            type: d.deviceType || 'unknown',
            count: d._count,
          })),
        },
      });
    } catch (error) {
      logger.error('Error in getAudienceInsights:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get audience insights',
        },
      });
    }
  }

  /**
   * Get campaign comparison
   */
  async compareCampaigns(req: Request, res: Response) {
    try {
      const { campaignIds } = req.body;

      if (!campaignIds || !Array.isArray(campaignIds) || campaignIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Campaign IDs array is required',
          },
        });
      }

      const campaigns = await prisma.campaign.findMany({
        where: {
          id: { in: campaignIds },
        },
        include: {
          metrics: true,
          budgets: true,
          _count: {
            select: {
              ads: true,
            },
          },
        },
      });

      const comparison = campaigns.map(campaign => {
        const totalMetrics = campaign.metrics.reduce((acc, m) => ({
          impressions: acc.impressions + m.impressions,
          clicks: acc.clicks + m.clicks,
          engagements: acc.engagements + m.engagements,
          capSpent: acc.capSpent + m.capSpent,
        }), {
          impressions: 0,
          clicks: 0,
          engagements: 0,
          capSpent: 0,
        });

        const ctr = totalMetrics.impressions > 0 
          ? (totalMetrics.clicks / totalMetrics.impressions) * 100 
          : 0;

        const engagementRate = totalMetrics.impressions > 0 
          ? (totalMetrics.engagements / totalMetrics.impressions) * 100 
          : 0;

        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          adsCount: campaign._count.ads,
          metrics: totalMetrics,
          rates: { ctr, engagementRate },
          budget: campaign.budgets?.[0],
        };
      });

      return res.json({
        success: true,
        data: comparison,
      });
    } catch (error) {
      logger.error('Error in compareCampaigns:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to compare campaigns',
        },
      });
    }
  }

  /**
   * Export campaign report
   */
  async exportCampaignReport(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;
      const { format = 'pdf', startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Get campaign data
      const [campaign, metrics, engagements, conversions] = await Promise.all([
        prisma.campaign.findUnique({
          where: { id: campaignId },
          include: {
            brand: true,
            budgets: true,
          },
        }),
        prisma.campaignMetric.findMany({
          where: {
            campaignId,
            date: { gte: start, lte: end },
          },
          orderBy: { date: 'asc' },
        }),
        prisma.userEngagement.count({
          where: {
            targetType: 'campaign',
            targetId: campaignId,
            createdAt: { gte: start, lte: end },
          },
        }),
        prisma.order.count({
          where: {
            items: {
              some: {
                product: {
                  campaignId,
                },
              },
            },
            createdAt: { gte: start, lte: end },
          },
        }),
      ]);

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'Campaign not found',
          },
        });
      }

      // Calculate totals
      const totals = metrics.reduce((acc, m) => ({
        impressions: acc.impressions + m.impressions,
        clicks: acc.clicks + m.clicks,
        engagements: acc.engagements + m.engagements,
        capSpent: acc.capSpent + m.capSpent,
      }), {
        impressions: 0,
        clicks: 0,
        engagements: 0,
        capSpent: 0,
      });

      const reportData = {
        campaign: {
          name: campaign.name,
          objective: campaign.objective,
          status: campaign.status,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
        },
        brand: campaign.brand,
        period: { start, end },
        budget: campaign.budgets?.[0],
        metrics: totals,
        performance: {
          ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
          engagementRate: totals.impressions > 0 ? (totals.engagements / totals.impressions) * 100 : 0,
          totalEngagements: engagements,
          totalConversions: conversions,
        },
        dailyMetrics: metrics,
      };

      let fileUrl: string;
      let filename: string;

      if (format === 'csv') {
        const csv = this.convertToCSV(metrics);
        fileUrl = await exportService.uploadCSV(
          csv,
          `campaign-${campaignId}-${Date.now()}.csv`
        );
        filename = `campaign-${campaignId}-report.csv`;
      } else {
        const pdf = await exportService.generatePDF(
          reportData,
          `Campaign Report: ${campaign.name}`
        );
        fileUrl = await exportService.uploadPDF(
          pdf,
          `campaign-${campaignId}-${Date.now()}.pdf`
        );
        filename = `campaign-${campaignId}-report.pdf`;
      }

      return res.json({
        success: true,
        data: {
          url: fileUrl,
          filename,
          report: reportData,
        },
      });
    } catch (error) {
      logger.error('Error in exportCampaignReport:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to export campaign report',
        },
      });
    }
  }

  /**
   * Get real-time campaign stats
   */
  async getRealtimeStats(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get today's stats
      const [impressions, clicks, engagements] = await Promise.all([
        prisma.adImpression.count({
          where: {
            ad: { campaignId },
            viewedAt: { gte: today },
          },
        }),
        prisma.adClick.count({
          where: {
            ad: { campaignId },
            clickedAt: { gte: today },
          },
        }),
        prisma.userEngagement.count({
          where: {
            targetType: 'campaign',
            targetId: campaignId,
            createdAt: { gte: today },
          },
        }),
      ]);

      // Get recent activity
      const recentActivity = await prisma.userEngagement.findMany({
        where: {
          targetType: 'campaign',
          targetId: campaignId,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: {
            select: {
              username: true,
              profile: {
                select: {
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      return res.json({
        success: true,
        data: {
          today: {
            impressions,
            clicks,
            engagements,
            ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          },
          recentActivity: recentActivity.map(a => ({
            user: a.user?.username,
            avatar: a.user?.profile?.avatarUrl,
            action: a.type,
            timestamp: a.createdAt,
          })),
        },
      });
    } catch (error) {
      logger.error('Error in getRealtimeStats:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get real-time stats',
        },
      });
    }
  }

  /**
   * Convert array to CSV
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => 
      headers.map(header => JSON.stringify(obj[header] || '')).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
  }
}

export const campaignAnalyticsController = new CampaignAnalyticsController();