/**
 * Campaign Processing Job
 * Handles campaign start/end, budget monitoring, etc.
 */

import { Job } from 'bull';
import { prisma } from '../../database/client';
import { logger } from '../../logger';
import { queueService } from '../bull.queue';
import { notificationService } from '../../../services/notification.service';

export interface CampaignJobData {
  campaignId: string;
  action: 'start' | 'end' | 'check-budget' | 'send-report';
  notifyUser?: boolean;
}

export class CampaignJob {
  static async process(job: Job<CampaignJobData>) {
    const { campaignId, action, notifyUser = true } = job.data;
    
    logger.info(`🔄 Processing campaign job: ${action} for campaign ${campaignId}`);

    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          brand: true,
          ads: true,
        },
      });

      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      let result;

      switch (action) {
        case 'start':
          result = await this.startCampaign(campaign, notifyUser);
          break;
        case 'end':
          result = await this.endCampaign(campaign, notifyUser);
          break;
        case 'check-budget':
          result = await this.checkBudget(campaign);
          break;
        case 'send-report':
          result = await this.sendReport(campaign);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      logger.info(`✅ Campaign job completed: ${action} for campaign ${campaignId}`);
      return result;

    } catch (error) {
      logger.error(`❌ Campaign job failed:`, error);
      throw error;
    }
  }

  private static async startCampaign(campaign: any, notifyUser: boolean) {
    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: 'ACTIVE',
        startedAt: new Date(),
      },
    });

    // Update ads status
    await prisma.ad.updateMany({
      where: { campaignId: campaign.id },
      data: { status: 'ACTIVE' },
    });

    // Send notification
    if (notifyUser) {
      await notificationService.create({
        userId: campaign.brand.sponsorId,
        type: 'CAMPAIGN',
        title: '🚀 Campaign Started!',
        body: `Your campaign "${campaign.name}" is now live!`,
        data: {
          screen: 'campaign',
          action: 'view',
          id: campaign.id,
        },
      });
    }

    // Schedule budget check
    const queue = (await import('../bull.queue')).queues.campaign;
    await queue.add(
      'check-budget',
      { campaignId: campaign.id, action: 'check-budget' },
      { repeat: { every: 60 * 60 * 1000 } } // Every hour
    );

    return {
      status: 'started',
      campaignId: campaign.id,
      startedAt: new Date(),
    };
  }

  private static async endCampaign(campaign: any, notifyUser: boolean) {
    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
      },
    });

    // Update ads status
    await prisma.ad.updateMany({
      where: { campaignId: campaign.id },
      data: { status: 'ARCHIVED' },
    });

    // Calculate campaign metrics
    const metrics = await prisma.campaignMetric.aggregate({
      where: { campaignId: campaign.id },
      _sum: {
        impressions: true,
        clicks: true,
        engagements: true,
        capSpent: true,
      },
    });

    // Send notification with results
    if (notifyUser) {
      await notificationService.create({
        userId: campaign.brand.sponsorId,
        type: 'CAMPAIGN',
        title: '🏁 Campaign Ended',
        body: `Your campaign "${campaign.name}" has ended. ${metrics._sum.impressions || 0} impressions, ${metrics._sum.engagements || 0} engagements.`,
        data: {
          screen: 'campaign',
          action: 'analytics',
          id: campaign.id,
        },
      });
    }

    return {
      status: 'ended',
      campaignId: campaign.id,
      endedAt: new Date(),
      metrics,
    };
  }

  private static async checkBudget(campaign: any) {
    const spent = await prisma.capTransaction.aggregate({
      where: {
        referenceType: 'campaign',
        referenceId: campaign.id,
        type: 'SPEND',
      },
      _sum: {
        amount: true,
      },
    });

    const spentAmount = spent._sum.amount || 0;
    const budgetAmount = campaign.totalBudget * campaign.capConversionRate;
    const percentUsed = (spentAmount / budgetAmount) * 100;

    // Alert at 80%, 90%, and 100%
    if (percentUsed >= 100) {
      // Campaign budget exhausted
      await this.endCampaign(campaign, true);
      
      await notificationService.create({
        userId: campaign.brand.sponsorId,
        type: 'CAMPAIGN',
        priority: 'HIGH',
        title: '⚠️ Campaign Budget Exhausted',
        body: `Your campaign "${campaign.name}" has reached its budget limit and has been ended.`,
        data: {
          screen: 'campaign',
          action: 'analytics',
          id: campaign.id,
        },
      });
    } else if (percentUsed >= 90) {
      await notificationService.create({
        userId: campaign.brand.sponsorId,
        type: 'CAMPAIGN',
        priority: 'HIGH',
        title: '⚠️ Campaign Budget Running Low',
        body: `Your campaign "${campaign.name}" has used ${percentUsed.toFixed(1)}% of its budget.`,
        data: {
          screen: 'campaign',
          action: 'budget',
          id: campaign.id,
        },
      });
    } else if (percentUsed >= 80) {
      await notificationService.create({
        userId: campaign.brand.sponsorId,
        type: 'CAMPAIGN',
        title: '📊 Campaign Budget Update',
        body: `Your campaign "${campaign.name}" has used ${percentUsed.toFixed(1)}% of its budget.`,
        data: {
          screen: 'campaign',
          action: 'analytics',
          id: campaign.id,
        },
      });
    }

    return {
      campaignId: campaign.id,
      spent: spentAmount,
      budget: budgetAmount,
      percentUsed,
    };
  }

  private static async sendReport(campaign: any) {
    // Get campaign metrics
    const metrics = await prisma.campaignMetric.findMany({
      where: { campaignId: campaign.id },
      orderBy: { date: 'asc' },
    });

    const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0);
    const totalClicks = metrics.reduce((sum, m) => sum + m.clicks, 0);
    const totalEngagements = metrics.reduce((sum, m) => sum + m.engagements, 0);
    const totalSpent = metrics.reduce((sum, m) => sum + m.capSpent, 0);

    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const engagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;
    const costPerEngagement = totalEngagements > 0 ? totalSpent / totalEngagements : 0;

    // Send email report
    await queueService.add('email', {
      to: campaign.brand.sponsor.email,
      template: 'campaign-report',
      data: {
        campaignName: campaign.name,
        startDate: campaign.startDate,
        endDate: campaign.endDate || new Date(),
        metrics: {
          impressions: totalImpressions,
          clicks: totalClicks,
          engagements: totalEngagements,
          ctr: ctr.toFixed(2),
          engagementRate: engagementRate.toFixed(2),
          costPerEngagement: costPerEngagement.toFixed(2),
          totalSpent,
        },
      },
    });

    return {
      campaignId: campaign.id,
      reportDate: new Date(),
      metrics: {
        impressions: totalImpressions,
        clicks: totalClicks,
        engagements: totalEngagements,
        ctr,
        engagementRate,
        costPerEngagement,
        totalSpent,
      },
    };
  }
}

export default CampaignJob;