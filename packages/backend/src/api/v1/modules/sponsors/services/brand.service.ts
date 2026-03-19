/**
 * Brand Service
 * Handles brand management for sponsors
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { storageService } from '../../../../../lib/storage/storage.service';

export interface BrandData {
  name: string;
  description?: string;
  industry?: string;
  logo?: Express.Multer.File;
  coverImage?: Express.Multer.File;
  website?: string;
  socialLinks?: Record<string, string>;
  location?: {
    address?: string;
    city?: string;
    country?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
}

export class BrandService {
  /**
   * Create brand
   */
  async createBrand(sponsorId: string, data: BrandData) {
    try {
      // Upload logo if provided
      let logoUrl: string | undefined;
      if (data.logo) {
        const uploadResult = await storageService.upload(data.logo, {
          folder: 'brands/logos',
          resize: { width: 200, height: 200 },
        });
        logoUrl = uploadResult.url;
      }

      // Upload cover image if provided
      let coverUrl: string | undefined;
      if (data.coverImage) {
        const uploadResult = await storageService.upload(data.coverImage, {
          folder: 'brands/covers',
          resize: { width: 1200, height: 400 },
        });
        coverUrl = uploadResult.url;
      }

      // Create brand
      const brand = await prisma.brand.create({
        data: {
          sponsorId,
          name: data.name,
          description: data.description,
          industry: data.industry,
          logoUrl,
          coverUrl,
          website: data.website,
          socialLinks: data.socialLinks,
        },
      });

      // Add location if provided
      if (data.location) {
        await prisma.brandLocation.create({
          data: {
            brandId: brand.id,
            address: data.location.address,
            city: data.location.city,
            country: data.location.country,
            coordinates: data.location.coordinates,
          },
        });
      }

      logger.info(`Brand created: ${brand.id} for sponsor ${sponsorId}`);
      return brand;
    } catch (error) {
      logger.error('Error creating brand:', error);
      throw error;
    }
  }

  /**
   * Get brand details
   */
  async getBrandDetails(brandId: string) {
    try {
      const brand = await prisma.brand.findUnique({
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

      if (!brand) {
        throw new Error('Brand not found');
      }

      return brand;
    } catch (error) {
      logger.error('Error getting brand details:', error);
      throw error;
    }
  }

  /**
   * Update brand
   */
  async updateBrand(brandId: string, sponsorId: string, data: Partial<BrandData>) {
    try {
      const updateData: any = {};

      if (data.name) updateData.name = data.name;
      if (data.description) updateData.description = data.description;
      if (data.industry) updateData.industry = data.industry;
      if (data.website) updateData.website = data.website;
      if (data.socialLinks) updateData.socialLinks = data.socialLinks;

      // Update logo if provided
      if (data.logo) {
        const uploadResult = await storageService.upload(data.logo, {
          folder: 'brands/logos',
          resize: { width: 200, height: 200 },
        });
        updateData.logoUrl = uploadResult.url;
      }

      // Update cover if provided
      if (data.coverImage) {
        const uploadResult = await storageService.upload(data.coverImage, {
          folder: 'brands/covers',
          resize: { width: 1200, height: 400 },
        });
        updateData.coverUrl = uploadResult.url;
      }

      const brand = await prisma.brand.update({
        where: {
          id: brandId,
          sponsorId,
        },
        data: updateData,
      });

      // Update location if provided
      if (data.location) {
        await prisma.brandLocation.upsert({
          where: { brandId },
          update: {
            address: data.location.address,
            city: data.location.city,
            country: data.location.country,
            coordinates: data.location.coordinates,
          },
          create: {
            brandId,
            address: data.location.address,
            city: data.location.city,
            country: data.location.country,
            coordinates: data.location.coordinates,
          },
        });
      }

      logger.info(`Brand updated: ${brandId}`);
      return brand;
    } catch (error) {
      logger.error('Error updating brand:', error);
      throw error;
    }
  }

  /**
   * Delete brand
   */
  async deleteBrand(brandId: string, sponsorId: string) {
    try {
      // Check if brand has active campaigns
      const activeCampaigns = await prisma.campaign.count({
        where: {
          brandId,
          status: 'ACTIVE',
        },
      });

      if (activeCampaigns > 0) {
        throw new Error('Cannot delete brand with active campaigns');
      }

      await prisma.brand.delete({
        where: {
          id: brandId,
          sponsorId,
        },
      });

      logger.info(`Brand deleted: ${brandId}`);
    } catch (error) {
      logger.error('Error deleting brand:', error);
      throw error;
    }
  }

  /**
   * Get brand followers
   */
  async getBrandFollowers(brandId: string, limit: number = 50, offset: number = 0) {
    try {
      const [followers, total] = await Promise.all([
        prisma.brandFollower.findMany({
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
        }),
        prisma.brandFollower.count({ where: { brandId } }),
      ]);

      return { followers, total };
    } catch (error) {
      logger.error('Error getting brand followers:', error);
      throw error;
    }
  }

  /**
   * Get brand campaigns
   */
  async getBrandCampaigns(brandId: string, status?: string) {
    try {
      const where: any = { brandId };
      if (status) {
        where.status = status;
      }

      const campaigns = await prisma.campaign.findMany({
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

      return campaigns;
    } catch (error) {
      logger.error('Error getting brand campaigns:', error);
      throw error;
    }
  }

  /**
   * Get brand rooms
   */
  async getBrandRooms(brandId: string, status?: string) {
    try {
      const where: any = { brandId };
      if (status) {
        where.status = status;
      }

      const rooms = await prisma.room.findMany({
        where,
        include: {
          hosts: {
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
        orderBy: { createdAt: 'desc' },
      });

      return rooms;
    } catch (error) {
      logger.error('Error getting brand rooms:', error);
      throw error;
    }
  }

  /**
   * Get brand analytics
   */
  async getBrandAnalytics(brandId: string, days: number = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [campaignMetrics, followerGrowth, engagementMetrics] = await Promise.all([
        // Campaign metrics
        prisma.campaignMetric.aggregate({
          where: {
            campaign: {
              brandId,
            },
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            impressions: true,
            clicks: true,
            engagements: true,
            capSpent: true,
          },
        }),

        // Follower growth
        prisma.brandFollower.groupBy({
          by: ['followedAt'],
          where: {
            brandId,
            followedAt: { gte: startDate },
          },
          _count: true,
        }),

        // Engagement metrics
        prisma.userEngagement.aggregate({
          where: {
            targetType: 'brand',
            targetId: brandId,
            createdAt: { gte: startDate },
          },
          _count: true,
        }),
      ]);

      // Calculate growth rate
      const followersAtStart = await prisma.brandFollower.count({
        where: {
          brandId,
          followedAt: { lt: startDate },
        },
      });

      const followersAtEnd = await prisma.brandFollower.count({
        where: { brandId },
      });

      const growthRate = followersAtStart > 0
        ? ((followersAtEnd - followersAtStart) / followersAtStart) * 100
        : 0;

      return {
        period: { startDate, endDate },
        campaignMetrics: {
          impressions: campaignMetrics._sum.impressions || 0,
          clicks: campaignMetrics._sum.clicks || 0,
          engagements: campaignMetrics._sum.engagements || 0,
          spend: campaignMetrics._sum.capSpent || 0,
        },
        followers: {
          total: followersAtEnd,
          growth: followersAtEnd - followersAtStart,
          growthRate,
        },
        totalEngagements: engagementMetrics._count,
      };
    } catch (error) {
      logger.error('Error getting brand analytics:', error);
      throw error;
    }
  }

  /**
   * Add team member to brand
   */
  async addTeamMember(brandId: string, userId: string, role: string) {
    try {
      const member = await prisma.brandMember.create({
        data: {
          brandId,
          userId,
          role,
        },
      });

      logger.info(`User ${userId} added to brand ${brandId} as ${role}`);
      return member;
    } catch (error) {
      logger.error('Error adding team member:', error);
      throw error;
    }
  }

  /**
   * Remove team member
   */
  async removeTeamMember(brandId: string, userId: string) {
    try {
      await prisma.brandMember.delete({
        where: {
          brandId_userId: {
            brandId,
            userId,
          },
        },
      });

      logger.info(`User ${userId} removed from brand ${brandId}`);
    } catch (error) {
      logger.error('Error removing team member:', error);
      throw error;
    }
  }

  /**
   * Update team member role
   */
  async updateTeamMemberRole(brandId: string, userId: string, role: string) {
    try {
      const member = await prisma.brandMember.update({
        where: {
          brandId_userId: {
            brandId,
            userId,
          },
        },
        data: { role },
      });

      logger.info(`User ${userId} role updated to ${role} for brand ${brandId}`);
      return member;
    } catch (error) {
      logger.error('Error updating team member role:', error);
      throw error;
    }
  }

  /**
   * Get brand team members
   */
  async getTeamMembers(brandId: string) {
    try {
      const members = await prisma.brandMember.findMany({
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

      return members;
    } catch (error) {
      logger.error('Error getting team members:', error);
      throw error;
    }
  }

  /**
   * Search brands
   */
  async searchBrands(query: string, limit: number = 20, offset: number = 0) {
    try {
      const [brands, total] = await Promise.all([
        prisma.brand.findMany({
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
        }),
        prisma.brand.count({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { industry: { contains: query, mode: 'insensitive' } },
            ],
            isActive: true,
          },
        }),
      ]);

      return { brands, total };
    } catch (error) {
      logger.error('Error searching brands:', error);
      throw error;
    }
  }
}

export const brandService = new BrandService();