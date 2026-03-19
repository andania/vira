/**
 * Discovery Service
 * Handles content discovery, search, and filtering
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';

export interface SearchOptions {
  query: string;
  type?: ('ad' | 'room' | 'campaign' | 'brand' | 'product')[];
  category?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'popularity' | 'reward';
  filters?: Record<string, any>;
}

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  description?: string;
  image?: string;
  url: string;
  metadata: Record<string, any>;
  score: number;
}

export class DiscoveryService {
  /**
   * Search across all content types
   */
  async search(options: SearchOptions): Promise<{ results: SearchResult[]; total: number }> {
    try {
      const {
        query,
        type = ['ad', 'room', 'campaign', 'brand', 'product'],
        category,
        limit = 20,
        offset = 0,
        sortBy = 'relevance',
        filters = {},
      } = options;

      // Try cache first for common searches
      const cacheKey = `search:${query}:${type.join(',')}:${category}:${sortBy}:${offset}:${limit}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const results: SearchResult[] = [];
      let total = 0;

      // Search each content type
      if (type.includes('brand')) {
        const { items, count } = await this.searchBrands(query, category, filters, limit, offset);
        results.push(...items);
        total += count;
      }

      if (type.includes('campaign')) {
        const { items, count } = await this.searchCampaigns(query, category, filters, limit, offset);
        results.push(...items);
        total += count;
      }

      if (type.includes('ad')) {
        const { items, count } = await this.searchAds(query, category, filters, limit, offset);
        results.push(...items);
        total += count;
      }

      if (type.includes('room')) {
        const { items, count } = await this.searchRooms(query, category, filters, limit, offset);
        results.push(...items);
        total += count;
      }

      if (type.includes('product')) {
        const { items, count } = await this.searchProducts(query, category, filters, limit, offset);
        results.push(...items);
        total += count;
      }

      // Sort results
      const sortedResults = this.sortResults(results, sortBy);

      // Cache for 5 minutes
      const result = {
        results: sortedResults.slice(offset, offset + limit),
        total,
      };
      await redis.setex(cacheKey, 300, JSON.stringify(result));

      return result;
    } catch (error) {
      logger.error('Error in search:', error);
      throw error;
    }
  }

  /**
   * Search brands
   */
  private async searchBrands(
    query: string,
    category?: string,
    filters: Record<string, any> = {},
    limit: number,
    offset: number
  ): Promise<{ items: SearchResult[]; count: number }> {
    const where: any = {
      name: { contains: query, mode: 'insensitive' },
      isActive: true,
    };

    if (category) {
      where.category = category;
    }

    if (filters.verified) {
      where.verificationStatus = 'verified';
    }

    const [brands, total] = await Promise.all([
      prisma.brand.findMany({
        where,
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
      }),
      prisma.brand.count({ where }),
    ]);

    const items: SearchResult[] = brands.map(brand => ({
      id: brand.id,
      type: 'brand',
      title: brand.name,
      description: brand.description,
      image: brand.logoUrl,
      url: `/brands/${brand.id}`,
      metadata: {
        category: brand.industry,
        followers: brand._count.followers,
        campaigns: brand._count.campaigns,
        verified: brand.verificationStatus === 'verified',
      },
      score: this.calculateBrandScore(brand),
    }));

    return { items, count: total };
  }

  /**
   * Search campaigns
   */
  private async searchCampaigns(
    query: string,
    category?: string,
    filters: Record<string, any> = {},
    limit: number,
    offset: number
  ): Promise<{ items: SearchResult[]; count: number }> {
    const where: any = {
      name: { contains: query, mode: 'insensitive' },
      status: 'ACTIVE',
    };

    if (category) {
      where.brand = { category };
    }

    if (filters.objective) {
      where.objective = filters.objective;
    }

    if (filters.minReward) {
      where.capAllocations = {
        some: {
          totalCapAllocated: { gte: filters.minReward },
        },
      };
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        include: {
          brand: true,
          _count: {
            select: {
              ads: true,
            },
          },
        },
        take: limit,
        skip: offset,
      }),
      prisma.campaign.count({ where }),
    ]);

    const items: SearchResult[] = campaigns.map(campaign => ({
      id: campaign.id,
      type: 'campaign',
      title: campaign.name,
      description: campaign.description,
      image: campaign.brand?.logoUrl,
      url: `/campaigns/${campaign.id}`,
      metadata: {
        brandId: campaign.brandId,
        brandName: campaign.brand?.name,
        objective: campaign.objective,
        endDate: campaign.endDate,
        adCount: campaign._count.ads,
      },
      score: this.calculateCampaignScore(campaign),
    }));

    return { items, count: total };
  }

  /**
   * Search ads
   */
  private async searchAds(
    query: string,
    category?: string,
    filters: Record<string, any> = {},
    limit: number,
    offset: number
  ): Promise<{ items: SearchResult[]; count: number }> {
    const where: any = {
      name: { contains: query, mode: 'insensitive' },
      status: 'ACTIVE',
      campaign: {
        status: 'ACTIVE',
      },
    };

    if (category) {
      where.campaign.brand = { category };
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.minReward) {
      where.rewardWeights = {
        path: 'view',
        gt: filters.minReward,
      };
    }

    const [ads, total] = await Promise.all([
      prisma.ad.findMany({
        where,
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
      }),
      prisma.ad.count({ where }),
    ]);

    const items: SearchResult[] = ads.map(ad => ({
      id: ad.id,
      type: 'ad',
      title: ad.name,
      description: ad.content?.body,
      image: ad.assets[0]?.assetUrl,
      url: `/billboard/ad/${ad.id}`,
      metadata: {
        campaignId: ad.campaignId,
        brandId: ad.campaign?.brandId,
        brandName: ad.campaign?.brand?.name,
        type: ad.type,
        reward: ad.rewardWeights?.view || 30,
        destinationUrl: ad.content?.destinationUrl,
      },
      score: this.calculateAdScore(ad),
    }));

    return { items, count: total };
  }

  /**
   * Search rooms
   */
  private async searchRooms(
    query: string,
    category?: string,
    filters: Record<string, any> = {},
    limit: number,
    offset: number
  ): Promise<{ items: SearchResult[]; count: number }> {
    const where: any = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
      visibility: 'public',
    };

    if (filters.status) {
      where.status = filters.status;
    } else {
      where.status = { in: ['live', 'scheduled'] };
    }

    if (category) {
      where.brand = { category };
    }

    if (filters.hasReward) {
      // Rooms have implicit reward for joining
      where.status = 'live';
    }

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where,
        include: {
          brand: true,
          hosts: {
            include: {
              user: {
                select: {
                  username: true,
                  profile: true,
                },
              },
            },
            take: 1,
          },
          _count: {
            select: {
              participants: {
                where: { isActive: true },
              },
            },
          },
        },
        take: limit,
        skip: offset,
      }),
      prisma.room.count({ where }),
    ]);

    const items: SearchResult[] = rooms.map(room => ({
      id: room.id,
      type: 'room',
      title: room.name,
      description: room.description,
      image: room.brand?.logoUrl,
      url: `/rooms/${room.id}`,
      metadata: {
        brandId: room.brandId,
        brandName: room.brand?.name,
        hostName: room.hosts[0]?.user?.profile?.displayName || room.hosts[0]?.user?.username,
        status: room.status,
        participants: room._count.participants,
        scheduledStart: room.scheduledStart,
      },
      score: this.calculateRoomScore(room),
    }));

    return { items, count: total };
  }

  /**
   * Search products
   */
  private async searchProducts(
    query: string,
    category?: string,
    filters: Record<string, any> = {},
    limit: number,
    offset: number
  ): Promise<{ items: SearchResult[]; count: number }> {
    const where: any = {
      name: { contains: query, mode: 'insensitive' },
      status: 'ACTIVE',
    };

    if (category) {
      where.category = { name: category };
    }

    if (filters.minPrice || filters.maxPrice) {
      where.priceFiat = {};
      if (filters.minPrice) where.priceFiat.gte = filters.minPrice;
      if (filters.maxPrice) where.priceFiat.lte = filters.maxPrice;
    }

    if (filters.inStock) {
      where.stockQuantity = { gt: 0 };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          brand: true,
          category: true,
          images: {
            take: 1,
          },
        },
        take: limit,
        skip: offset,
      }),
      prisma.product.count({ where }),
    ]);

    const items: SearchResult[] = products.map(product => ({
      id: product.id,
      type: 'product',
      title: product.name,
      description: product.shortDescription,
      image: product.images[0]?.imageUrl,
      url: `/marketplace/product/${product.id}`,
      metadata: {
        brandId: product.brandId,
        brandName: product.brand?.name,
        category: product.category?.name,
        price: {
          cap: product.priceCap,
          fiat: product.priceFiat,
        },
        currency: product.currency,
        rating: product.ratingAvg,
        reviewCount: product.ratingCount,
        inStock: product.stockQuantity > 0,
      },
      score: this.calculateProductScore(product),
    }));

    return { items, count: total };
  }

  /**
   * Get categories with counts
   */
  async getCategories() {
    try {
      const cacheKey = 'billboard:categories';
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const [brandCategories, adCategories, productCategories] = await Promise.all([
        prisma.brand.groupBy({
          by: ['industry'],
          _count: true,
        }),
        prisma.ad.groupBy({
          by: ['type'],
          where: {
            status: 'ACTIVE',
          },
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

      const categories = {
        brands: brandCategories.map(c => ({
          name: c.industry,
          count: c._count,
        })),
        adTypes: adCategories.map(c => ({
          name: c.type,
          count: c._count,
        })),
        products: productCategories.map(c => ({
          id: c.id,
          name: c.name,
          count: c._count.products,
        })),
      };

      await redis.setex(cacheKey, 3600, JSON.stringify(categories));
      return categories;
    } catch (error) {
      logger.error('Error getting categories:', error);
      throw error;
    }
  }

  /**
   * Get trending searches
   */
  async getTrendingSearches(limit: number = 10) {
    try {
      const cacheKey = 'billboard:trending-searches';
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get search logs from Redis
      const searches = await redis.zrevrange('search:trending', 0, limit - 1, 'WITHSCORES');
      
      const trending = [];
      for (let i = 0; i < searches.length; i += 2) {
        trending.push({
          query: searches[i],
          count: parseInt(searches[i + 1]),
        });
      }

      await redis.setex(cacheKey, 1800, JSON.stringify(trending)); // 30 minutes
      return trending;
    } catch (error) {
      logger.error('Error getting trending searches:', error);
      return [];
    }
  }

  /**
   * Log search query for trending
   */
  async logSearch(query: string) {
    try {
      await redis.zincrby('search:trending', 1, query.toLowerCase());
      await redis.expire('search:trending', 7 * 24 * 60 * 60); // 7 days
    } catch (error) {
      logger.error('Error logging search:', error);
    }
  }

  /**
   * Get suggestions for autocomplete
   */
  async getSuggestions(partial: string, limit: number = 5) {
    try {
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
    } catch (error) {
      logger.error('Error getting suggestions:', error);
      throw error;
    }
  }

  /**
   * Calculate brand score
   */
  private calculateBrandScore(brand: any): number {
    let score = 50;

    // Boost for verified brands
    if (brand.verificationStatus === 'verified') {
      score += 30;
    }

    // Boost for follower count
    score += Math.min(brand._count.followers, 100) * 0.5;

    // Boost for active campaigns
    score += Math.min(brand._count.campaigns, 50) * 2;

    return Math.round(score);
  }

  /**
   * Calculate campaign score
   */
  private calculateCampaignScore(campaign: any): number {
    let score = 50;

    // Boost for recency
    const daysLeft = Math.max(0, (campaign.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    score += Math.min(daysLeft, 30) * 2;

    // Boost for number of ads
    score += Math.min(campaign._count.ads, 20) * 3;

    // Boost for specific objectives
    if (campaign.objective === 'sales') {
      score += 20;
    }

    return Math.round(score);
  }

  /**
   * Calculate ad score
   */
  private calculateAdScore(ad: any): number {
    let score = 50;

    // Boost for reward amount
    if (ad.rewardWeights?.view) {
      score += Math.min(ad.rewardWeights.view, 100);
    }

    // Boost for video ads
    if (ad.type === 'video') {
      score += 20;
    }

    return Math.round(score);
  }

  /**
   * Calculate room score
   */
  private calculateRoomScore(room: any): number {
    let score = 50;

    // Boost for live status
    if (room.status === 'live') {
      score += 40;
    }

    // Boost for participant count
    score += Math.min(room._count.participants, 100) * 0.5;

    // Boost for scheduled rooms close to starting
    if (room.status === 'scheduled' && room.scheduledStart) {
      const minutesUntilStart = (room.scheduledStart.getTime() - Date.now()) / (1000 * 60);
      if (minutesUntilStart > 0 && minutesUntilStart < 60) {
        score += 30;
      }
    }

    return Math.round(score);
  }

  /**
   * Calculate product score
   */
  private calculateProductScore(product: any): number {
    let score = 50;

    // Boost for high rating
    score += product.ratingAvg * 10;

    // Boost for review count
    score += Math.min(product.ratingCount, 100) * 0.3;

    // Boost for being in stock
    if (product.stockQuantity > 0) {
      score += 20;
    }

    // Boost for featured products
    if (product.isFeatured) {
      score += 30;
    }

    return Math.round(score);
  }

  /**
   * Sort results
   */
  private sortResults(results: SearchResult[], sortBy: string): SearchResult[] {
    switch (sortBy) {
      case 'date':
        return results.sort((a, b) => 
          new Date(b.metadata.createdAt || 0).getTime() - new Date(a.metadata.createdAt || 0).getTime()
        );
      case 'popularity':
        return results.sort((a, b) => (b.metadata.views || 0) - (a.metadata.views || 0));
      case 'reward':
        return results.sort((a, b) => (b.metadata.reward || 0) - (a.metadata.reward || 0));
      case 'relevance':
      default:
        return results.sort((a, b) => b.score - a.score);
    }
  }
}

export const discoveryService = new DiscoveryService();