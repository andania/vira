/**
 * Billboard Service
 * Main service for billboard operations combining feed, discovery, and recommendations
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { feedService } from './feed.service';
import { discoveryService } from './discovery.service';
import { recommendationService } from './recommendation.service';
import { targetingService } from '../../campaigns/services/targeting.service';

export interface BillboardOptions {
  userId?: string;
  section?: 'trending' | 'live' | 'just-launched' | 'top-earning' | 'near-you' | 'categories';
  limit?: number;
  offset?: number;
  location?: {
    latitude: number;
    longitude: number;
    radius?: number;
  };
  categories?: string[];
}

export interface BillboardSection {
  id: string;
  name: string;
  description: string;
  items: any[];
  layout: 'grid' | 'list' | 'carousel' | 'hero';
  priority: number;
}

export class BillboardService {
  /**
   * Get complete billboard with all sections
   */
  async getBillboard(options: BillboardOptions = {}): Promise<BillboardSection[]> {
    try {
      const {
        userId,
        limit = 20,
        offset = 0,
        location,
        categories,
      } = options;

      // Try cache first for anonymous users
      if (!userId) {
        const cacheKey = `billboard:public:${limit}:${offset}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      // Generate all sections
      const sections: BillboardSection[] = [];

      // Section 1: Trending Now
      sections.push(await this.getTrendingSection(userId, limit));

      // Section 2: Live Now
      sections.push(await this.getLiveSection(userId, limit));

      // Section 3: Just Launched
      sections.push(await this.getJustLaunchedSection(userId, limit));

      // Section 4: Top Earning Opportunities
      sections.push(await this.getTopEarningSection(userId, limit));

      // Section 5: Near You (if location provided)
      if (location) {
        sections.push(await this.getNearYouSection(userId, location, limit));
      }

      // Section 6: Categories
      sections.push(await this.getCategoriesSection());

      // Section 7: Recommended for You (if logged in)
      if (userId) {
        sections.push(await this.getRecommendedSection(userId, limit));
      }

      // Sort sections by priority
      sections.sort((a, b) => a.priority - b.priority);

      // Cache for public billboard
      if (!userId) {
        await redis.setex(`billboard:public:${limit}:${offset}`, 300, JSON.stringify(sections));
      }

      return sections;
    } catch (error) {
      logger.error('Error getting billboard:', error);
      throw error;
    }
  }

  /**
   * Get trending section
   */
  private async getTrendingSection(userId?: string, limit: number = 20): Promise<BillboardSection> {
    const trending = await feedService.generateFeed({
      userId: userId || 'anonymous',
      limit,
      type: 'trending',
    });

    return {
      id: 'trending',
      name: '🔥 TRENDING NOW',
      description: 'Most engaged content right now',
      items: trending,
      layout: 'carousel',
      priority: 1,
    };
  }

  /**
   * Get live section
   */
  private async getLiveSection(userId?: string, limit: number = 20): Promise<BillboardSection> {
    const liveRooms = await prisma.room.findMany({
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
    });

    const items = liveRooms.map(room => ({
      id: room.id,
      type: 'room',
      title: room.name,
      description: room.description,
      image: room.brand?.logoUrl,
      metadata: {
        brandName: room.brand?.name,
        hostName: room.hosts[0]?.user?.profile?.displayName || room.hosts[0]?.user?.username,
        viewers: room._count.participants,
      },
      engagement: {
        views: room._count.participants,
      },
      reward: {
        action: 'Join Live',
        amount: 70,
      },
    }));

    return {
      id: 'live',
      name: '📺 LIVE NOW',
      description: 'Currently streaming live demonstrations',
      items,
      layout: 'carousel',
      priority: 2,
    };
  }

  /**
   * Get just launched section
   */
  private async getJustLaunchedSection(userId?: string, limit: number = 20): Promise<BillboardSection> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [newCampaigns, newProducts] = await Promise.all([
      prisma.campaign.findMany({
        where: {
          createdAt: { gte: sevenDaysAgo },
          status: { in: ['ACTIVE', 'SCHEDULED'] },
        },
        include: {
          brand: {
            select: {
              name: true,
              logoUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Math.ceil(limit * 0.6),
      }),
      prisma.product.findMany({
        where: {
          createdAt: { gte: sevenDaysAgo },
          status: 'ACTIVE',
        },
        include: {
          brand: {
            select: {
              name: true,
              logoUrl: true,
            },
          },
          images: { take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        take: Math.ceil(limit * 0.4),
      }),
    ]);

    const items = [
      ...newCampaigns.map(campaign => ({
        id: campaign.id,
        type: 'campaign',
        title: campaign.name,
        description: campaign.description,
        image: campaign.brand?.logoUrl,
        metadata: {
          brandName: campaign.brand?.name,
          objective: campaign.objective,
          endDate: campaign.endDate,
        },
        engagement: {
          views: 0,
        },
        reward: {
          action: 'View Campaign',
          amount: 50,
        },
        createdAt: campaign.createdAt,
      })),
      ...newProducts.map(product => ({
        id: product.id,
        type: 'product',
        title: product.name,
        description: product.shortDescription,
        image: product.images[0]?.imageUrl,
        metadata: {
          brandName: product.brand?.name,
          price: product.priceFiat,
          currency: product.currency,
        },
        engagement: {
          views: product.viewsCount,
        },
        reward: {
          action: 'View Product',
          amount: 15,
        },
        createdAt: product.createdAt,
      })),
    ];

    return {
      id: 'just-launched',
      name: '🆕 JUST LAUNCHED',
      description: 'New campaigns and products',
      items,
      layout: 'grid',
      priority: 3,
    };
  }

  /**
   * Get top earning opportunities section
   */
  private async getTopEarningSection(userId?: string, limit: number = 20): Promise<BillboardSection> {
    // Get ads with highest rewards
    const topEarningAds = await prisma.ad.findMany({
      where: {
        status: 'ACTIVE',
        campaign: {
          status: 'ACTIVE',
        },
      },
      include: {
        campaign: {
          include: {
            brand: {
              select: {
                name: true,
                logoUrl: true,
              },
            },
          },
        },
        assets: { take: 1 },
      },
      orderBy: {
        rewardWeights: {
          view: 'desc',
        },
      },
      take: limit,
    });

    const items = topEarningAds.map(ad => ({
      id: ad.id,
      type: 'ad',
      title: ad.name,
      description: `Earn ${ad.rewardWeights?.view || 30} CAP`,
      image: ad.assets[0]?.assetUrl,
      metadata: {
        brandName: ad.campaign?.brand?.name,
        reward: ad.rewardWeights?.view || 30,
        type: ad.type,
      },
      engagement: {
        views: 0,
      },
      reward: {
        action: 'Watch Ad',
        amount: ad.rewardWeights?.view || 30,
      },
    }));

    return {
      id: 'top-earning',
      name: '💰 TOP EARNING OPPORTUNITIES',
      description: 'Best CAP rewards available',
      items,
      layout: 'list',
      priority: 4,
    };
  }

  /**
   * Get near you section based on location
   */
  private async getNearYouSection(
    userId?: string,
    location?: { latitude: number; longitude: number; radius?: number },
    limit: number = 20
  ): Promise<BillboardSection> {
    if (!location) {
      return {
        id: 'near-you',
        name: '📍 NEAR YOU',
        description: 'Local campaigns and events',
        items: [],
        layout: 'carousel',
        priority: 5,
      };
    }

    const radius = location.radius || 50; // Default 50km

    // Find nearby rooms and campaigns using PostGIS
    const nearbyRooms = await prisma.$queryRaw`
      SELECT 
        r.*,
        b.name as brand_name,
        b.logo_url as brand_logo,
        ST_Distance(
          ST_MakePoint(${location.longitude}, ${location.latitude})::geography,
          bl.coordinates::geography
        ) as distance
      FROM rooms r
      JOIN brands b ON r.brand_id = b.id
      JOIN brand_locations bl ON b.id = bl.brand_id
      WHERE r.status = 'live'
        AND r.visibility = 'public'
        AND ST_DWithin(
          ST_MakePoint(${location.longitude}, ${location.latitude})::geography,
          bl.coordinates::geography,
          ${radius * 1000}
        )
      ORDER BY distance
      LIMIT ${limit}
    `;

    const items = (nearbyRooms as any[]).map(room => ({
      id: room.id,
      type: 'room',
      title: room.name,
      description: room.description,
      image: room.brand_logo,
      metadata: {
        brandName: room.brand_name,
        distance: Math.round(room.distance / 1000), // Convert to km
        viewers: room.current_participants || 0,
      },
      engagement: {
        views: room.current_participants || 0,
      },
      reward: {
        action: 'Join Live',
        amount: 70,
      },
    }));

    return {
      id: 'near-you',
      name: '📍 NEAR YOU',
      description: `Within ${radius}km of your location`,
      items,
      layout: 'carousel',
      priority: 5,
    };
  }

  /**
   * Get categories section
   */
  private async getCategoriesSection(): Promise<BillboardSection> {
    const categories = [
      { id: 'electronics', name: 'Electronics', icon: '📱', count: 0 },
      { id: 'fashion', name: 'Fashion', icon: '👕', count: 0 },
      { id: 'automotive', name: 'Automotive', icon: '🚗', count: 0 },
      { id: 'education', name: 'Education', icon: '📚', count: 0 },
      { id: 'jobs', name: 'Jobs', icon: '💼', count: 0 },
      { id: 'public-service', name: 'Public Service', icon: '🏛️', count: 0 },
      { id: 'marketplace', name: 'Marketplace', icon: '🛍️', count: 0 },
      { id: 'entertainment', name: 'Entertainment', icon: '🎬', count: 0 },
    ];

    // Get counts for each category (simplified - would need proper aggregation)
    for (const category of categories) {
      const count = await prisma.campaign.count({
        where: {
          status: 'ACTIVE',
          brand: {
            industry: category.name,
          },
        },
      });
      category.count = count;
    }

    return {
      id: 'categories',
      name: '📂 CATEGORIES',
      description: 'Browse by category',
      items: categories,
      layout: 'grid',
      priority: 6,
    };
  }

  /**
   * Get recommended section for logged-in users
   */
  private async getRecommendedSection(userId: string, limit: number = 20): Promise<BillboardSection> {
    const recommendations = await recommendationService.getRecommendations({
      userId,
      limit,
    });

    return {
      id: 'recommended',
      name: '🎯 RECOMMENDED FOR YOU',
      description: 'Personalized based on your interests',
      items: recommendations,
      layout: 'carousel',
      priority: 0, // Highest priority for logged-in users
    };
  }

  /**
   * Get single section by ID
   */
  async getSection(sectionId: string, options: BillboardOptions = {}): Promise<BillboardSection | null> {
    const {
      userId,
      limit = 20,
      location,
    } = options;

    switch (sectionId) {
      case 'trending':
        return this.getTrendingSection(userId, limit);
      case 'live':
        return this.getLiveSection(userId, limit);
      case 'just-launched':
        return this.getJustLaunchedSection(userId, limit);
      case 'top-earning':
        return this.getTopEarningSection(userId, limit);
      case 'near-you':
        return this.getNearYouSection(userId, location, limit);
      case 'categories':
        return this.getCategoriesSection();
      case 'recommended':
        if (!userId) return null;
        return this.getRecommendedSection(userId, limit);
      default:
        return null;
    }
  }

  /**
   * Get billboard stats for analytics
   */
  async getBillboardStats(): Promise<any> {
    try {
      const [totalAds, totalLiveRooms, totalCampaigns, totalProducts] = await Promise.all([
        prisma.ad.count({
          where: { status: 'ACTIVE' },
        }),
        prisma.room.count({
          where: { status: 'live', visibility: 'public' },
        }),
        prisma.campaign.count({
          where: { status: 'ACTIVE' },
        }),
        prisma.product.count({
          where: { status: 'ACTIVE' },
        }),
      ]);

      return {
        totalAds,
        totalLiveRooms,
        totalCampaigns,
        totalProducts,
        totalItems: totalAds + totalLiveRooms + totalCampaigns + totalProducts,
      };
    } catch (error) {
      logger.error('Error getting billboard stats:', error);
      throw error;
    }
  }

  /**
   * Track billboard interaction
   */
  async trackInteraction(
    userId: string,
    itemId: string,
    itemType: string,
    action: 'view' | 'click' | 'engage'
  ): Promise<void> {
    try {
      const key = `billboard:interactions:${itemType}:${itemId}`;
      
      // Increment interaction count in Redis
      await redis.hincrby(key, action, 1);
      await redis.expire(key, 7 * 24 * 60 * 60); // 7 days

      // Track for personalization
      if (userId) {
        await redis.zadd(`user:${userId}:history`, Date.now(), `${itemType}:${itemId}`);
      }

      logger.debug(`Billboard interaction tracked: ${userId} - ${itemType}:${itemId} - ${action}`);
    } catch (error) {
      logger.error('Error tracking billboard interaction:', error);
    }
  }

  /**
   * Get personalized greeting based on time of day
   */
  getTimeBasedGreeting(userName?: string): string {
    const hour = new Date().getHours();
    let greeting = '';

    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 18) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }

    return userName ? `${greeting}, ${userName}!` : `${greeting}!`;
  }
}

export const billboardService = new BillboardService();