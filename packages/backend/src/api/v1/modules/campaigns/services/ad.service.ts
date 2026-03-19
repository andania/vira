/**
 * Ad Service
 * Handles ad creation, management, and delivery
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { cacheService } from '../../../../../core/cache/cache.service';
import { storageService } from '../../../../../lib/storage/storage.service';
import { targetingService } from './targeting.service';

export interface CreateAdData {
  campaignId: string;
  name: string;
  type: 'video' | 'image' | 'carousel' | 'text' | 'poll' | 'interactive';
  content: any;
  rewardWeights?: Record<string, number>;
  createdBy: string;
}

export interface UpdateAdData {
  name?: string;
  content?: any;
  rewardWeights?: Record<string, number>;
  status?: 'draft' | 'active' | 'paused' | 'archived';
}

export interface AdDeliveryContext {
  userId: string;
  deviceType?: string;
  platform?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  interests?: string[];
}

export class AdService {
  /**
   * Create new ad
   */
  async createAd(data: CreateAdData) {
    try {
      // Verify campaign exists
      const campaign = await prisma.campaign.findUnique({
        where: { id: data.campaignId },
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Create ad
      const ad = await prisma.ad.create({
        data: {
          campaignId: data.campaignId,
          name: data.name,
          type: data.type,
          content: data.content,
          rewardWeights: data.rewardWeights || {},
          status: 'draft',
        },
      });

      logger.info(`Ad created: ${ad.id}`);
      return ad;
    } catch (error) {
      logger.error('Error creating ad:', error);
      throw error;
    }
  }

  /**
   * Get ad by ID
   */
  async getAdById(adId: string) {
    try {
      const ad = await prisma.ad.findUnique({
        where: { id: adId },
        include: {
          campaign: true,
          assets: true,
          metrics: true,
        },
      });

      if (!ad) {
        throw new Error('Ad not found');
      }

      return ad;
    } catch (error) {
      logger.error('Error getting ad:', error);
      throw error;
    }
  }

  /**
   * Update ad
   */
  async updateAd(adId: string, data: UpdateAdData) {
    try {
      const ad = await this.getAdById(adId);

      // Check if ad can be updated
      if (ad.status === 'active' && data.status && data.status !== 'paused') {
        throw new Error('Active ads cannot be modified');
      }

      const updated = await prisma.ad.update({
        where: { id: adId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      // Invalidate cache
      await cacheService.invalidateCampaign(ad.campaignId);

      logger.info(`Ad updated: ${adId}`);
      return updated;
    } catch (error) {
      logger.error('Error updating ad:', error);
      throw error;
    }
  }

  /**
   * Delete ad
   */
  async deleteAd(adId: string) {
    try {
      const ad = await this.getAdById(adId);

      if (ad.status === 'active') {
        throw new Error('Cannot delete active ad');
      }

      await prisma.ad.delete({
        where: { id: adId },
      });

      // Invalidate cache
      await cacheService.invalidateCampaign(ad.campaignId);

      logger.info(`Ad deleted: ${adId}`);
    } catch (error) {
      logger.error('Error deleting ad:', error);
      throw error;
    }
  }

  /**
   * Upload ad asset
   */
  async uploadAdAsset(adId: string, file: Express.Multer.File, type: string) {
    try {
      const ad = await this.getAdById(adId);

      // Upload to storage
      const uploadResult = await storageService.upload(file, {
        folder: `ads/${ad.campaignId}`,
        ...(type === 'image' && {
          resize: { width: 1200 },
          formats: ['webp', 'jpeg'],
        }),
        ...(type === 'video' && {
          video: {
            qualities: [
              { label: '1080p', resolution: '1920x1080', bitrate: 5000 },
              { label: '720p', resolution: '1280x720', bitrate: 2500 },
              { label: '480p', resolution: '854x480', bitrate: 1000 },
            ],
          },
        }),
      });

      // Create asset record
      const asset = await prisma.adAsset.create({
        data: {
          adId,
          assetType: type,
          assetUrl: uploadResult.url,
          assetSize: file.size,
          mimeType: file.mimetype,
          width: uploadResult.width,
          height: uploadResult.height,
          duration: uploadResult.duration,
        },
      });

      return asset;
    } catch (error) {
      logger.error('Error uploading ad asset:', error);
      throw error;
    }
  }

  /**
   * Delete ad asset
   */
  async deleteAdAsset(assetId: string) {
    try {
      const asset = await prisma.adAsset.findUnique({
        where: { id: assetId },
        include: { ad: true },
      });

      if (!asset) {
        throw new Error('Asset not found');
      }

      // Delete from storage
      await storageService.delete(asset.assetUrl);

      // Delete record
      await prisma.adAsset.delete({
        where: { id: assetId },
      });

      logger.info(`Ad asset deleted: ${assetId}`);
    } catch (error) {
      logger.error('Error deleting ad asset:', error);
      throw error;
    }
  }

  /**
   * Get eligible ads for user
   */
  async getEligibleAds(userId: string, context: AdDeliveryContext, limit: number = 10) {
    try {
      // Get active campaigns
      const campaigns = await prisma.campaign.findMany({
        where: {
          status: 'ACTIVE',
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
        include: {
          ads: {
            where: { status: 'ACTIVE' },
          },
          budgets: true,
        },
      });

      // Filter campaigns with budget remaining
      const eligibleCampaigns = campaigns.filter(c => {
        const budget = c.budgets?.[0];
        return budget && budget.spentBudget < budget.totalBudget;
      });

      // Check targeting for each ad
      const eligibleAds = [];

      for (const campaign of eligibleCampaigns) {
        for (const ad of campaign.ads) {
          // Check if user has already seen this ad (frequency capping)
          const impressionsToday = await prisma.adImpression.count({
            where: {
              adId: ad.id,
              userId,
              viewedAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            },
          });

          // Limit to 3 impressions per day per ad
          if (impressionsToday >= 3) {
            continue;
          }

          // Check campaign targeting
          if (campaign.targeting) {
            const matches = await targetingService.userMatchesTargeting(
              userId,
              campaign.targeting
            );
            if (!matches) {
              continue;
            }
          }

          // Calculate score for ranking
          const score = await this.calculateAdScore(ad.id, userId, context);

          eligibleAds.push({
            ...ad,
            campaign,
            score,
          });
        }
      }

      // Sort by score and limit
      return eligibleAds
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      logger.error('Error getting eligible ads:', error);
      return [];
    }
  }

  /**
   * Calculate ad score for ranking
   */
  private async calculateAdScore(adId: string, userId: string, context: AdDeliveryContext): Promise<number> {
    let score = 1.0;

    // Factor 1: User's interest match
    if (context.interests && context.interests.length > 0) {
      const ad = await prisma.ad.findUnique({
        where: { id: adId },
        include: { campaign: { include: { brand: true } } },
      });

      if (ad?.campaign?.brand?.category) {
        // Check if user's interests match brand category
        const interestMatch = context.interests.some(i => 
          i.toLowerCase() === ad.campaign.brand.category?.toLowerCase()
        );
        if (interestMatch) {
          score *= 1.5;
        }
      }
    }

    // Factor 2: Past engagement with similar ads
    const pastEngagements = await prisma.userEngagement.count({
      where: {
        userId,
        targetType: 'ad',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (pastEngagements > 10) {
      score *= 1.2; // Active users get better ads
    }

    // Factor 3: Time of day relevance
    const hour = new Date().getHours();
    if (hour >= 18 && hour <= 22) { // Prime time
      score *= 1.3;
    }

    // Factor 4: Device compatibility
    if (context.deviceType) {
      const ad = await prisma.ad.findUnique({
        where: { id: adId },
      });

      if (ad?.type === 'video' && context.deviceType === 'mobile') {
        // Videos on mobile might have lower engagement
        score *= 0.9;
      }
    }

    // Factor 5: Location relevance
    if (context.location) {
      const campaign = await prisma.campaign.findFirst({
        where: { ads: { some: { id: adId } } },
      });

      if (campaign?.targeting?.locations) {
        // Check if ad is location-specific
        const isLocationSpecific = campaign.targeting.locations.some((l: any) => 
          l.type === 'city' || l.type === 'radius'
        );
        if (isLocationSpecific) {
          score *= 1.4; // Boost for local ads
        }
      }
    }

    return score;
  }

  /**
   * Record ad impression
   */
  async recordImpression(adId: string, userId: string, context: AdDeliveryContext) {
    try {
      const impression = await prisma.adImpression.create({
        data: {
          adId,
          userId,
          sessionId: context.sessionId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          deviceType: context.deviceType,
          location: context.location ? {
            latitude: context.location.latitude,
            longitude: context.location.longitude,
          } : undefined,
        },
      });

      // Update campaign metrics
      await prisma.campaignMetric.updateMany({
        where: { campaign: { ads: { some: { id: adId } } } },
        data: {
          impressions: { increment: 1 },
        },
      });

      return impression;
    } catch (error) {
      logger.error('Error recording impression:', error);
      throw error;
    }
  }

  /**
   * Record ad click
   */
  async recordClick(adId: string, userId: string, context: AdDeliveryContext) {
    try {
      const click = await prisma.adClick.create({
        data: {
          adId,
          userId,
          sessionId: context.sessionId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          deviceType: context.deviceType,
          location: context.location ? {
            latitude: context.location.latitude,
            longitude: context.location.longitude,
          } : undefined,
        },
      });

      // Update campaign metrics
      await prisma.campaignMetric.updateMany({
        where: { campaign: { ads: { some: { id: adId } } } },
        data: {
          clicks: { increment: 1 },
        },
      });

      return click;
    } catch (error) {
      logger.error('Error recording click:', error);
      throw error;
    }
  }

  /**
   * Get ad analytics
   */
  async getAdAnalytics(adId: string, startDate: Date, endDate: Date) {
    try {
      const [impressions, clicks, engagements] = await Promise.all([
        prisma.adImpression.count({
          where: {
            adId,
            viewedAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.adClick.count({
          where: {
            adId,
            clickedAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.userEngagement.count({
          where: {
            targetType: 'ad',
            targetId: adId,
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
      ]);

      return {
        impressions,
        clicks,
        engagements,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        engagementRate: impressions > 0 ? (engagements / impressions) * 100 : 0,
        startDate,
        endDate,
      };
    } catch (error) {
      logger.error('Error getting ad analytics:', error);
      throw error;
    }
  }

  /**
   * Get ads by campaign
   */
  async getAdsByCampaign(campaignId: string) {
    try {
      const ads = await prisma.ad.findMany({
        where: { campaignId },
        include: {
          assets: true,
          _count: {
            select: {
              impressions: true,
              clicks: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return ads;
    } catch (error) {
      logger.error('Error getting ads by campaign:', error);
      throw error;
    }
  }

  /**
   * Duplicate ad
   */
  async duplicateAd(adId: string, newCampaignId?: string) {
    try {
      const ad = await this.getAdById(adId);
      const assets = await prisma.adAsset.findMany({
        where: { adId },
      });

      const newAd = await prisma.ad.create({
        data: {
          campaignId: newCampaignId || ad.campaignId,
          name: `${ad.name} (Copy)`,
          type: ad.type,
          content: ad.content,
          rewardWeights: ad.rewardWeights,
          status: 'draft',
        },
      });

      // Duplicate assets
      for (const asset of assets) {
        await prisma.adAsset.create({
          data: {
            adId: newAd.id,
            assetType: asset.assetType,
            assetUrl: asset.assetUrl,
            assetSize: asset.assetSize,
            mimeType: asset.mimeType,
            width: asset.width,
            height: asset.height,
            duration: asset.duration,
            sortOrder: asset.sortOrder,
          },
        });
      }

      logger.info(`Ad duplicated: ${adId} -> ${newAd.id}`);
      return newAd;
    } catch (error) {
      logger.error('Error duplicating ad:', error);
      throw error;
    }
  }
}

export const adService = new AdService();