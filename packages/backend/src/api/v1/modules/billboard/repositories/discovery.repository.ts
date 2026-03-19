/**
 * Discovery Repository
 * Handles database operations for search and discovery
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

export class DiscoveryRepository extends BaseRepository<any, any, any> {
  protected modelName = 'discovery';
  protected prismaModel = prisma.discovery;

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
            campaigns: true,
          },
        },
      },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Search campaigns
   */
  async searchCampaigns(query: string, limit: number = 20, offset: number = 0) {
    return prisma.campaign.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
        status: 'ACTIVE',
      },
      include: {
        brand: {
          select: {
            name: true,
            logoUrl: true,
          },
        },
      },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Search ads
   */
  async searchAds(query: string, limit: number = 20, offset: number = 0) {
    return prisma.ad.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          {
            campaign: {
              brand: {
                name: { contains: query, mode: 'insensitive' },
              },
            },
          },
        ],
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
        },
      },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Search rooms
   */
  async searchRooms(query: string, limit: number = 20, offset: number = 0) {
    return prisma.room.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
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
                profile: true,
              },
            },
          },
        },
      },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Search products
   */
  async searchProducts(query: string, limit: number = 20, offset: number = 0) {
    return prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { brand: { name: { contains: query, mode: 'insensitive' } } },
        ],
        status: 'ACTIVE',
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
        },
      },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get categories with counts
   */
  async getCategoryCounts() {
    const [brandCategories, productCategories] = await Promise.all([
      prisma.brand.groupBy({
        by: ['industry'],
        where: { isActive: true },
        _count: true,
      }),
      prisma.productCategory.findMany({
        include: {
          _count: {
            select: {
              products: {
                where: { status: 'ACTIVE' },
              },
            },
          },
        },
      }),
    ]);

    return {
      brands: brandCategories.map(c => ({
        name: c.industry,
        count: c._count,
      })),
      products: productCategories.map(c => ({
        id: c.id,
        name: c.name,
        count: c._count.products,
      })),
    };
  }

  /**
   * Get popular search terms
   */
  async getPopularSearchTerms(limit: number = 10) {
    // This would typically come from a search logs table
    // For now, return empty array
    return [];
  }

  /**
   * Save search query for analytics
   */
  async saveSearchQuery(userId: string | undefined, query: string, results: number) {
    return prisma.searchLog.create({
      data: {
        userId,
        query,
        results,
        timestamp: new Date(),
      },
    });
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSuggestions(partial: string, limit: number = 5) {
    const [brands, campaigns, products] = await Promise.all([
      prisma.brand.findMany({
        where: {
          name: { startsWith: partial, mode: 'insensitive' },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
        take: limit,
      }),
      prisma.campaign.findMany({
        where: {
          name: { startsWith: partial, mode: 'insensitive' },
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
          brand: {
            select: {
              logoUrl: true,
            },
          },
        },
        take: limit,
      }),
      prisma.product.findMany({
        where: {
          name: { startsWith: partial, mode: 'insensitive' },
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
          images: {
            take: 1,
            select: {
              imageUrl: true,
            },
          },
        },
        take: limit,
      }),
    ]);

    return {
      brands: brands.map(b => ({
        id: b.id,
        text: b.name,
        image: b.logoUrl,
        type: 'brand',
      })),
      campaigns: campaigns.map(c => ({
        id: c.id,
        text: c.name,
        image: c.brand?.logoUrl,
        type: 'campaign',
      })),
      products: products.map(p => ({
        id: p.id,
        text: p.name,
        image: p.images[0]?.imageUrl,
        type: 'product',
      })),
    };
  }
}

export const discoveryRepository = new DiscoveryRepository();