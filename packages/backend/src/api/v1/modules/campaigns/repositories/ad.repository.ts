/**
 * Ad Repository
 * Handles database operations for ads
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

type AdCreateInput = Prisma.AdUncheckedCreateInput;
type AdUpdateInput = Prisma.AdUncheckedUpdateInput;

export class AdRepository extends BaseRepository<any, AdCreateInput, AdUpdateInput> {
  protected modelName = 'ad';
  protected prismaModel = prisma.ad;

  /**
   * Find ads by campaign ID
   */
  async findByCampaignId(campaignId: string) {
    return prisma.ad.findMany({
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
  }

  /**
   * Find active ads by campaign
   */
  async findActiveAds(campaignId: string) {
    return prisma.ad.findMany({
      where: {
        campaignId,
        status: 'ACTIVE',
      },
      include: {
        assets: true,
      },
    });
  }

  /**
   * Update ad status
   */
  async updateStatus(adId: string, status: string) {
    return prisma.ad.update({
      where: { id: adId },
      data: { status },
    });
  }

  /**
   * Bulk update ad status by campaign
   */
  async bulkUpdateStatusByCampaign(campaignId: string, status: string) {
    return prisma.ad.updateMany({
      where: { campaignId },
      data: { status },
    });
  }

  /**
   * Get ad performance metrics
   */
  async getAdPerformance(adId: string, startDate: Date, endDate: Date) {
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
    };
  }

  /**
   * Get top performing ads
   */
  async getTopAds(campaignId: string, limit: number = 10) {
    return prisma.ad.findMany({
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
      take: limit,
    });
  }
}

export const adRepository = new AdRepository();