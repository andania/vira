/**
 * Campaign Service
 * Handles campaign CRUD operations and management
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { cacheService } from '../../../../../core/cache/cache.service';
import { queueService } from '../../../../../core/queue/bull.queue';
import { notificationService } from '../../notifications/services/notification.service';
import { adService } from './ad.service';
import { Prisma } from '@prisma/client';

export interface CreateCampaignData {
  brandId: string;
  name: string;
  description?: string;
  objective: string;
  startDate: Date;
  endDate: Date;
  timezone?: string;
  totalBudget: number;
  dailyBudget?: number;
  currency?: string;
  targeting?: any;
  createdBy: string;
}

export interface UpdateCampaignData {
  name?: string;
  description?: string;
  objective?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  totalBudget?: number;
  dailyBudget?: number;
  targeting?: any;
}

export class CampaignService {
  /**
   * Create new campaign
   */
  async createCampaign(data: CreateCampaignData) {
    try {
      // Validate dates
      if (data.endDate <= data.startDate) {
        throw new Error('End date must be after start date');
      }

      // Check brand ownership
      const brand = await prisma.brand.findUnique({
        where: { id: data.brandId },
      });

      if (!brand) {
        throw new Error('Brand not found');
      }

      // Create campaign
      const campaign = await prisma.campaign.create({
        data: {
          brandId: data.brandId,
          name: data.name,
          description: data.description,
          objective: data.objective,
          status: 'DRAFT',
          startDate: data.startDate,
          endDate: data.endDate,
          timezone: data.timezone || 'UTC',
          totalBudget: data.totalBudget,
          dailyBudget: data.dailyBudget,
          currency: data.currency || 'USD',
          capConversionRate: 100,
          targeting: data.targeting || {},
          createdBy: data.createdBy,
        },
      });

      // Create budget tracking
      await prisma.campaignBudget.create({
        data: {
          campaignId: campaign.id,
          totalBudget: data.totalBudget,
          spentBudget: 0,
          reservedBudget: 0,
          dailySpent: 0,
          currency: data.currency || 'USD',
        },
      });

      // Create CAP allocation
      await prisma.campaignCapAllocation.create({
        data: {
          campaignId: campaign.id,
          totalCapAllocated: data.totalBudget * 100,
          capSpent: 0,
        },
      });

      // Schedule campaign start
      await this.scheduleCampaignStart(campaign.id, campaign.startDate);

      // Schedule campaign end
      await this.scheduleCampaignEnd(campaign.id, campaign.endDate);

      logger.info(`Campaign created: ${campaign.id}`);
      return campaign;
    } catch (error) {
      logger.error('Error creating campaign:', error);
      throw error;
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(campaignId: string) {
    try {
      // Try cache first
      const cached = await cacheService.getCampaign(campaignId);
      if (cached) {
        return cached;
      }

      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          brand: true,
          ads: true,
          budgets: true,
          capAllocations: true,
          targets: true,
        },
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Cache for 5 minutes
      await cacheService.cacheCampaign(campaignId, campaign, { ttl: 300 });

      return campaign;
    } catch (error) {
      logger.error('Error getting campaign:', error);
      throw error;
    }
  }

  /**
   * Update campaign
   */
  async updateCampaign(campaignId: string, data: UpdateCampaignData, userId: string) {
    try {
      const campaign = await this.getCampaignById(campaignId);

      // Check if campaign can be updated
      if (!['DRAFT', 'PAUSED'].includes(campaign.status)) {
        throw new Error('Campaign cannot be updated in its current state');
      }

      // Validate dates if changing
      if (data.startDate && data.endDate) {
        if (data.endDate <= data.startDate) {
          throw new Error('End date must be after start date');
        }
      } else if (data.startDate && campaign.endDate) {
        if (campaign.endDate <= data.startDate) {
          throw new Error('End date must be after start date');
        }
      } else if (data.endDate && campaign.startDate) {
        if (data.endDate <= campaign.startDate) {
          throw new Error('End date must be after start date');
        }
      }

      // Update campaign
      const updated = await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      // Update budget if changed
      if (data.totalBudget && data.totalBudget !== campaign.totalBudget) {
        await prisma.campaignBudget.update({
          where: { campaignId },
          data: { totalBudget: data.totalBudget },
        });

        await prisma.campaignCapAllocation.update({
          where: { campaignId },
          data: { totalCapAllocated: data.totalBudget * 100 },
        });
      }

      // Reschedule jobs if dates changed
      if (data.startDate && data.startDate !== campaign.startDate) {
        await this.rescheduleCampaignStart(campaignId, data.startDate);
      }

      if (data.endDate && data.endDate !== campaign.endDate) {
        await this.rescheduleCampaignEnd(campaignId, data.endDate);
      }

      // Invalidate cache
      await cacheService.invalidateCampaign(campaignId);

      // Log activity
      await prisma.campaignActivityLog.create({
        data: {
          campaignId,
          userId,
          action: 'UPDATE',
          details: { changes: data },
        },
      });

      logger.info(`Campaign updated: ${campaignId}`);
      return updated;
    } catch (error) {
      logger.error('Error updating campaign:', error);
      throw error;
    }
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId: string, userId: string) {
    try {
      const campaign = await this.getCampaignById(campaignId);

      if (campaign.status === 'ACTIVE') {
        throw new Error('Cannot delete active campaign');
      }

      // Soft delete
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { deletedAt: new Date() },
      });

      // Invalidate cache
      await cacheService.invalidateCampaign(campaignId);

      // Log activity
      await prisma.campaignActivityLog.create({
        data: {
          campaignId,
          userId,
          action: 'DELETE',
        },
      });

      logger.info(`Campaign deleted: ${campaignId}`);
    } catch (error) {
      logger.error('Error deleting campaign:', error);
      throw error;
    }
  }

  /**
   * Launch campaign
   */
  async launchCampaign(campaignId: string, userId: string) {
    try {
      const campaign = await this.getCampaignById(campaignId);

      if (campaign.status !== 'DRAFT' && campaign.status !== 'PAUSED') {
        throw new Error('Campaign cannot be launched');
      }

      // Check if campaign has at least one ad
      const adCount = await prisma.ad.count({
        where: { campaignId },
      });

      if (adCount === 0) {
        throw new Error('Campaign must have at least one ad');
      }

      // Check budget
      if (campaign.totalBudget <= 0) {
        throw new Error('Campaign budget must be greater than 0');
      }

      // Update status
      const updated = await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'ACTIVE',
          startedAt: new Date(),
        },
      });

      // Update all ads
      await prisma.ad.updateMany({
        where: { campaignId },
        data: { status: 'ACTIVE' },
      });

      // Schedule budget monitoring
      await queueService.add('campaign', {
        campaignId,
        action: 'check-budget',
      });

      // Invalidate cache
      await cacheService.invalidateCampaign(campaignId);

      // Log activity
      await prisma.campaignActivityLog.create({
        data: {
          campaignId,
          userId,
          action: 'LAUNCH',
        },
      });

      // Notify brand owner
      await notificationService.create({
        userId,
        type: 'CAMPAIGN',
        title: '🚀 Campaign Launched',
        body: `Your campaign "${campaign.name}" is now live!`,
        data: {
          screen: 'campaign',
          action: 'view',
          id: campaignId,
        },
      });

      logger.info(`Campaign launched: ${campaignId}`);
      return updated;
    } catch (error) {
      logger.error('Error launching campaign:', error);
      throw error;
    }
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(campaignId: string, userId: string) {
    try {
      const campaign = await this.getCampaignById(campaignId);

      if (campaign.status !== 'ACTIVE') {
        throw new Error('Campaign is not active');
      }

      // Update status
      const updated = await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'PAUSED',
        },
      });

      // Update all ads
      await prisma.ad.updateMany({
        where: { campaignId },
        data: { status: 'PAUSED' },
      });

      // Invalidate cache
      await cacheService.invalidateCampaign(campaignId);

      // Log activity
      await prisma.campaignActivityLog.create({
        data: {
          campaignId,
          userId,
          action: 'PAUSE',
        },
      });

      logger.info(`Campaign paused: ${campaignId}`);
      return updated;
    } catch (error) {
      logger.error('Error pausing campaign:', error);
      throw error;
    }
  }

  /**
   * End campaign early
   */
  async endCampaign(campaignId: string, userId: string) {
    try {
      const campaign = await this.getCampaignById(campaignId);

      if (!['ACTIVE', 'PAUSED'].includes(campaign.status)) {
        throw new Error('Campaign cannot be ended');
      }

      // Update status
      const updated = await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'COMPLETED',
          endedAt: new Date(),
        },
      });

      // Update all ads
      await prisma.ad.updateMany({
        where: { campaignId },
        data: { status: 'ARCHIVED' },
      });

      // Calculate final metrics
      await this.calculateCampaignMetrics(campaignId);

      // Invalidate cache
      await cacheService.invalidateCampaign(campaignId);

      // Log activity
      await prisma.campaignActivityLog.create({
        data: {
          campaignId,
          userId,
          action: 'END',
        },
      });

      // Send report
      await queueService.add('report', {
        campaignId,
        type: 'campaign-final',
      });

      logger.info(`Campaign ended: ${campaignId}`);
      return updated;
    } catch (error) {
      logger.error('Error ending campaign:', error);
      throw error;
    }
  }

  /**
   * Get campaigns by brand
   */
  async getCampaignsByBrand(brandId: string, filters: any = {}) {
    try {
      const where: any = { brandId, deletedAt: null };

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.objective) {
        where.objective = filters.objective;
      }

      if (filters.startDate) {
        where.startDate = { gte: new Date(filters.startDate) };
      }

      if (filters.endDate) {
        where.endDate = { lte: new Date(filters.endDate) };
      }

      const campaigns = await prisma.campaign.findMany({
        where,
        include: {
          _count: {
            select: { ads: true },
          },
          budgets: true,
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      });

      const total = await prisma.campaign.count({ where });

      return { campaigns, total };
    } catch (error) {
      logger.error('Error getting campaigns by brand:', error);
      throw error;
    }
  }

  /**
   * Duplicate campaign
   */
  async duplicateCampaign(campaignId: string, userId: string, newName?: string) {
    try {
      const campaign = await this.getCampaignById(campaignId);
      const ads = await prisma.ad.findMany({
        where: { campaignId },
        include: { assets: true },
      });

      // Create new campaign
      const newCampaign = await prisma.campaign.create({
        data: {
          brandId: campaign.brandId,
          name: newName || `${campaign.name} (Copy)`,
          description: campaign.description,
          objective: campaign.objective,
          status: 'DRAFT',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          timezone: campaign.timezone,
          totalBudget: campaign.totalBudget,
          dailyBudget: campaign.dailyBudget,
          currency: campaign.currency,
          capConversionRate: campaign.capConversionRate,
          targeting: campaign.targeting,
          createdBy: userId,
        },
      });

      // Create budget
      await prisma.campaignBudget.create({
        data: {
          campaignId: newCampaign.id,
          totalBudget: campaign.totalBudget,
          spentBudget: 0,
          reservedBudget: 0,
          dailySpent: 0,
          currency: campaign.currency,
        },
      });

      // Create CAP allocation
      await prisma.campaignCapAllocation.create({
        data: {
          campaignId: newCampaign.id,
          totalCapAllocated: campaign.totalBudget * 100,
          capSpent: 0,
        },
      });

      // Duplicate ads
      for (const ad of ads) {
        await adService.createAd({
          campaignId: newCampaign.id,
          name: ad.name,
          type: ad.type,
          content: ad.content,
          rewardWeights: ad.rewardWeights,
          createdBy: userId,
        });
      }

      logger.info(`Campaign duplicated: ${campaignId} -> ${newCampaign.id}`);
      return newCampaign;
    } catch (error) {
      logger.error('Error duplicating campaign:', error);
      throw error;
    }
  }

  /**
   * Schedule campaign start
   */
  private async scheduleCampaignStart(campaignId: string, startDate: Date) {
    const delay = startDate.getTime() - Date.now();
    if (delay > 0) {
      await queueService.add('campaign', {
        campaignId,
        action: 'start',
      }, { delay });
    }
  }

  /**
   * Schedule campaign end
   */
  private async scheduleCampaignEnd(campaignId: string, endDate: Date) {
    const delay = endDate.getTime() - Date.now();
    if (delay > 0) {
      await queueService.add('campaign', {
        campaignId,
        action: 'end',
      }, { delay });
    }
  }

  /**
   * Reschedule campaign start
   */
  private async rescheduleCampaignStart(campaignId: string, newStartDate: Date) {
    // Remove old job and add new one
    await queueService.removeJobs(`campaign:${campaignId}:start`);
    await this.scheduleCampaignStart(campaignId, newStartDate);
  }

  /**
   * Reschedule campaign end
   */
  private async rescheduleCampaignEnd(campaignId: string, newEndDate: Date) {
    await queueService.removeJobs(`campaign:${campaignId}:end`);
    await this.scheduleCampaignEnd(campaignId, newEndDate);
  }

  /**
   * Calculate campaign metrics
   */
  private async calculateCampaignMetrics(campaignId: string) {
    const metrics = await prisma.campaignMetric.aggregate({
      where: { campaignId },
      _sum: {
        impressions: true,
        clicks: true,
        engagements: true,
        capSpent: true,
      },
    });

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { budgets: true },
    });

    if (campaign && campaign.budgets) {
      const ctr = metrics._sum.impressions 
        ? (metrics._sum.clicks! / metrics._sum.impressions) * 100 
        : 0;
      
      const engagementRate = metrics._sum.impressions 
        ? (metrics._sum.engagements! / metrics._sum.impressions) * 100 
        : 0;

      const roas = metrics._sum.capSpent 
        ? (campaign.totalBudget * 100) / metrics._sum.capSpent 
        : 0;

      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          metrics: {
            impressions: metrics._sum.impressions || 0,
            clicks: metrics._sum.clicks || 0,
            engagements: metrics._sum.engagements || 0,
            capSpent: metrics._sum.capSpent || 0,
            ctr,
            engagementRate,
            roas,
          },
        },
      });
    }
  }
}

export const campaignService = new CampaignService();