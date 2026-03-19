/**
 * Brand Repository
 * Handles database operations for brands
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

export class BrandRepository extends BaseRepository<any, any, any> {
  protected modelName = 'brand';
  protected prismaModel = prisma.brand;

  /**
   * Find brands by sponsor ID
   */
  async findBySponsorId(sponsorId: string) {
    return prisma.brand.findMany({
      where: { sponsorId },
      include: {
        _count: {
          select: {
            campaigns: true,
            followers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get brand with details
   */
  async getBrandWithDetails(brandId: string) {
    return prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        locations: true,
        contacts: true,
        socialLinks: true,
        _count: {
          select: {
            campaigns: true,
            followers: true,
            rooms: true,
          },
        },
      },
    });
  }

  /**
   * Get brand followers
   */
  async getFollowers(brandId: string, limit: number = 50, offset: number = 0) {
    return prisma.brandFollower.findMany({
      where: { brandId },
      include: {
        user: {
          select: {
            id: true,
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
      take: limit,
      skip: offset,
      orderBy: { followedAt: 'desc' },
    });
  }

  /**
   * Get follower count
   */
  async getFollowerCount(brandId: string): Promise<number> {
    return prisma.brandFollower.count({
      where: { brandId },
    });
  }

  /**
   * Get brand campaigns
   */
  async getCampaigns(brandId: string, status?: string) {
    const where: any = { brandId };
    if (status) {
      where.status = status;
    }

    return prisma.campaign.findMany({
      where,
      include: {
        _count: {
          select: {
            ads: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get brand rooms
   */
  async getRooms(brandId: string, status?: string) {
    const where: any = { brandId };
    if (status) {
      where.status = status;
    }

    return prisma.room.findMany({
      where,
      include: {
        _count: {
          select: {
            participants: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get brand analytics
   */
  async getBrandAnalytics(brandId: string, startDate: Date, endDate: Date) {
    const [campaignMetrics, followerGrowth, engagementMetrics] = await Promise.all([
      prisma.campaignMetric.aggregate({
        where: {
          campaign: { brandId },
          date: { gte: startDate, lte: endDate },
        },
        _sum: {
          impressions: true,
          clicks: true,
          engagements: true,
          capSpent: true,
        },
      }),
      prisma.brandFollower.count({
        where: {
          brandId,
          followedAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.userEngagement.count({
        where: {
          targetType: 'brand',
          targetId: brandId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    return {
      campaignMetrics,
      followerGrowth,
      engagementMetrics,
    };
  }

  /**
   * Search brands
   */
  async searchBrands(query: string, limit: number = 20, offset: number = 0) {
    return prisma.brand.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { industry: { contains: query, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      include: {
        _count: {
          select: {
            followers: true,
            campaigns: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
      take: limit,
      skip: offset,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get top brands by followers
   */
  async getTopBrandsByFollowers(limit: number = 10) {
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            followers: true,
          },
        },
      },
      orderBy: {
        followers: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return brands.map(b => ({
      ...b,
      followerCount: b._count.followers,
    }));
  }

  /**
   * Get team members
   */
  async getTeamMembers(brandId: string) {
    return prisma.brandMember.findMany({
      where: { brandId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Add team member
   */
  async addTeamMember(brandId: string, userId: string, role: string) {
    return prisma.brandMember.create({
      data: {
        brandId,
        userId,
        role,
      },
    });
  }

  /**
   * Remove team member
   */
  async removeTeamMember(brandId: string, userId: string) {
    return prisma.brandMember.delete({
      where: {
        brandId_userId: {
          brandId,
          userId,
        },
      },
    });
  }

  /**
   * Update team member role
   */
  async updateTeamMemberRole(brandId: string, userId: string, role: string) {
    return prisma.brandMember.update({
      where: {
        brandId_userId: {
          brandId,
          userId,
        },
      },
      data: { role },
    });
  }
}

export const brandRepository = new BrandRepository();