/**
 * Campaign Repository
 * Handles database operations for campaigns
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

type CampaignCreateInput = Prisma.CampaignUncheckedCreateInput;
type CampaignUpdateInput = Prisma.CampaignUncheckedUpdateInput;

export class CampaignRepository extends BaseRepository<any, CampaignCreateInput, CampaignUpdateInput> {
  protected modelName = 'campaign';
  protected prismaModel = prisma.campaign;

  /**
   * Find campaigns by brand ID
   */
  async findByBrandId(brandId: string, filters: any = {}) {
    const where: any = { brandId, deletedAt: null, ...filters };

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
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
      }),
      prisma.campaign.count({ where }),
    ]);

    return { campaigns, total };
  }

  /**
   * Find active campaigns
   */
  async findActiveCampaigns() {
    return prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
        deletedAt: null,
      },
      include: {
        budgets: true,
        ads: {
          where: { status: 'ACTIVE' },
        },
      },
    });
  }

  /**
   * Find campaigns ending soon
   */
  async findCampaignsEndingSoon(days: number = 7) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          lte: endDate,
          gte: new Date(),
        },
        deletedAt: null,
      },
      include: {
        brand: true,
      },
      orderBy: { endDate: 'asc' },
    });
  }

  /**
   * Update campaign status
   */
  async updateStatus(campaignId: string, status: string) {
    return prisma.campaign.update({
      where: { id: campaignId },
      data: { status },
    });
  }

  /**
   * Increment metrics
   */
  async incrementMetrics(campaignId: string, metrics: { impressions?: number; clicks?: number; engagements?: number }) {
    return prisma.campaignMetric.updateMany({
      where: { campaignId },
      data: {
        ...(metrics.impressions && { impressions: { increment: metrics.impressions } }),
        ...(metrics.clicks && { clicks: { increment: metrics.clicks } }),
        ...(metrics.engagements && { engagements: { increment: metrics.engagements } }),
      },
    });
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(startDate: Date, endDate: Date) {
    const [total, active, completed, draft, paused] = await Promise.all([
      prisma.campaign.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.campaign.count({
        where: {
          status: 'ACTIVE',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.campaign.count({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.campaign.count({
        where: {
          status: 'DRAFT',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.campaign.count({
        where: {
          status: 'PAUSED',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    return {
      total,
      active,
      completed,
      draft,
      paused,
    };
  }
}

export const campaignRepository = new CampaignRepository();