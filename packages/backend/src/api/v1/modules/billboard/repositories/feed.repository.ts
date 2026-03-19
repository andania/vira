/**
 * Feed Repository
 * Handles database operations for feed data
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

export class FeedRepository extends BaseRepository<any, any, any> {
  protected modelName = 'feed';
  protected prismaModel = prisma.feed;

  /**
   * Get popular ads for feed
   */
  async getPopularAds(limit: number = 20, offset: number = 0) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return prisma.ad.findMany({
      where: {
        status: 'ACTIVE',
        impressions: {
          some: {
            viewedAt: { gte: sevenDaysAgo },
          },
        },
      },
      include: {
        campaign: {
          include: {
            brand: true,
          },
        },
        assets: {
          take: 1,
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            impressions: {
              where: { viewedAt: { gte: sevenDaysAgo } },
            },
            clicks: {
              where: { clickedAt: { gte: sevenDaysAgo } },
            },
          },
        },
      },
      orderBy: {
        impressions: {
          _count: 'desc',
        },
      },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get recent ads for feed
   */
  async getRecentAds(limit: number = 20, offset: number = 0) {
    return prisma.ad.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        campaign: {
          include: {
            brand: true,
          },
        },
        assets: {
          take: 1,
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get ads by category
   */
  async getAdsByCategory(category: string, limit: number = 20, offset: number = 0) {
    return prisma.ad.findMany({
      where: {
        status: 'ACTIVE',
        campaign: {
          brand: {
            industry: category,
          },
        },
      },
      include: {
        campaign: {
          include: {
            brand: true,
          },
        },
        assets: {
          take: 1,
          orderBy: { sortOrder: 'asc' },
        },
      },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get live rooms for feed
   */
  async getLiveRooms(limit: number = 20, offset: number = 0) {
    return prisma.room.findMany({
      where: {
        status: 'live',
        visibility: 'public',
      },
      include: {
        brand: {
          select: {
            name: true,
            logoUrl: true,
          },
        },
        hosts: {
          take: 1,
          include: {
            user: {
              select: {
                username: true,
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            participants: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: {
        participants: {
          _count: 'desc',
        },
      },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get upcoming rooms for feed
   */
  async getUpcomingRooms(limit: number = 20, offset: number = 0) {
    return prisma.room.findMany({
      where: {
        status: 'scheduled',
        visibility: 'public',
        scheduledStart: {
          gte: new Date(),
        },
      },
      include: {
        brand: {
          select: {
            name: true,
            logoUrl: true,
          },
        },
        hosts: {
          take: 1,
          include: {
            user: {
              select: {
                username: true,
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        scheduledStart: 'asc',
      },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get active campaigns for feed
   */
  async getActiveCampaigns(limit: number = 20, offset: number = 0) {
    return prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      include: {
        brand: {
          select: {
            name: true,
            logoUrl: true,
          },
        },
        _count: {
          select: {
            ads: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get featured products for feed
   */
  async getFeaturedProducts(limit: number = 20, offset: number = 0) {
    return prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        isFeatured: true,
      },
      include: {
        brand: {
          select: {
            name: true,
            logoUrl: true,
          },
        },
        images: {
          take: 1,
          where: { isPrimary: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get feed items by type and ids
   */
  async getItemsByIds(items: Array<{ type: string; id: string }>) {
    const results = [];

    for (const item of items) {
      switch (item.type) {
        case 'ad':
          const ad = await prisma.ad.findUnique({
            where: { id: item.id },
            include: {
              campaign: {
                include: {
                  brand: true,
                },
              },
              assets: {
                take: 1,
              },
            },
          });
          if (ad) results.push({ ...ad, type: 'ad' });
          break;

        case 'room':
          const room = await prisma.room.findUnique({
            where: { id: item.id },
            include: {
              brand: true,
              hosts: {
                take: 1,
                include: {
                  user: {
                    select: {
                      username: true,
                      profile: true,
                    },
                  },
                },
              },
            },
          });
          if (room) results.push({ ...room, type: 'room' });
          break;

        case 'campaign':
          const campaign = await prisma.campaign.findUnique({
            where: { id: item.id },
            include: {
              brand: true,
            },
          });
          if (campaign) results.push({ ...campaign, type: 'campaign' });
          break;

        case 'product':
          const product = await prisma.product.findUnique({
            where: { id: item.id },
            include: {
              brand: true,
              images: {
                take: 1,
              },
            },
          });
          if (product) results.push({ ...product, type: 'product' });
          break;
      }
    }

    return results;
  }
}

export const feedRepository = new FeedRepository();