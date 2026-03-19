/**
 * Feed Service
 * Handles personalized feed generation and content discovery
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { cacheService } from '../../../../../core/cache/cache.service';
import { targetingService } from '../../campaigns/services/targeting.service';

export interface FeedOptions {
  userId: string;
  limit?: number;
  offset?: number;
  categories?: string[];
  type?: 'all' | 'trending' | 'recommended' | 'nearby';
  location?: {
    latitude: number;
    longitude: number;
    radius?: number;
  };
}

export interface FeedItem {
  id: string;
  type: 'ad' | 'room' | 'campaign' | 'product';
  contentType: string;
  title: string;
  description?: string;
  image?: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  reward?: {
    action: string;
    amount: number;
  };
  metadata: Record<string, any>;
  score: number;
  createdAt: Date;
}

export class FeedService {
  /**
   * Generate personalized feed for user
   */
  async generateFeed(options: FeedOptions): Promise<FeedItem[]> {
    try {
      const { userId, limit = 20, offset = 0, categories, type = 'all', location } = options;

      // Try cache first
      const cacheKey = `feed:${userId}:${type}:${offset}:${limit}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      let items: FeedItem[] = [];

      // Get user preferences for personalization
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          preferences: true,
        },
      });

      // Generate feed based on type
      switch (type) {
        case 'trending':
          items = await this.getTrendingFeed(limit, offset);
          break;
        case 'recommended':
          items = await this.getRecommendedFeed(userId, user, limit, offset);
          break;
        case 'nearby':
          if (location) {
            items = await this.getNearbyFeed(location, limit, offset);
          } else {
            items = await this.getMixedFeed(userId, limit, offset);
          }
          break;
        default:
          items = await this.getMixedFeed(userId, limit, offset);
      }

      // Filter by categories if specified
      if (categories && categories.length > 0) {
        items = items.filter(item => 
          categories.includes(item.metadata.category)
        );
      }

      // Score and rank items
      items = await this.scoreFeedItems(items, userId);

      // Cache for 5 minutes
      await redis.setex(cacheKey, 300, JSON.stringify(items));

      return items;
    } catch (error) {
      logger.error('Error generating feed:', error);
      throw error;
    }
  }

  /**
   * Get mixed feed (combination of all types)
   */
  private async getMixedFeed(userId: string, limit: number, offset: number): Promise<FeedItem[]> {
    const [ads, rooms, campaigns, products] = await Promise.all([
      this.getEligibleAds(userId, Math.ceil(limit * 0.4)),
      this.getActiveRooms(Math.ceil(limit * 0.3)),
      this.getActiveCampaigns(Math.ceil(limit * 0.2)),
      this.getFeaturedProducts(Math.ceil(limit * 0.1)),
    ]);

    // Interleave items for variety
    return this.interleaveItems([ads, rooms, campaigns, products]).slice(offset, offset + limit);
  }

  /**
   * Get trending feed
   */
  private async getTrendingFeed(limit: number, offset: number): Promise<FeedItem[]> {
    const [trendingAds, trendingRooms, trendingCampaigns] = await Promise.all([
      this.getTrendingAds(limit),
      this.getTrendingRooms(limit),
      this.getTrendingCampaigns(limit),
    ]);

    const allTrending = [...trendingAds, ...trendingRooms, ...trendingCampaigns];
    
    // Sort by trending score
    allTrending.sort((a, b) => b.score - a.score);

    return allTrending.slice(offset, offset + limit);
  }

  /**
   * Get personalized recommended feed
   */
  private async getRecommendedFeed(
    userId: string,
    user: any,
    limit: number,
    offset: number
  ): Promise<FeedItem[]> {
    // Get user interests from profile
    const interests = user.profile?.interests || [];

    // Get content based on interests
    const [recommendedAds, recommendedRooms] = await Promise.all([
      this.getAdsByInterests(interests, limit),
      this.getRoomsByInterests(interests, limit),
    ]);

    const recommendations = [...recommendedAds, ...recommendedRooms];
    
    // Score based on interest match
    for (const item of recommendations) {
      item.score = this.calculateInterestScore(item, interests);
    }

    recommendations.sort((a, b) => b.score - a.score);

    return recommendations.slice(offset, offset + limit);
  }

  /**
   * Get nearby feed based on location
   */
  private async getNearbyFeed(
    location: { latitude: number; longitude: number; radius?: number },
    limit: number,
    offset: number
  ): Promise<FeedItem[]> {
    const radius = location.radius || 50; // Default 50km radius

    // Find nearby rooms
    const nearbyRooms = await prisma.$queryRaw`
      SELECT 
        r.*,
        ST_Distance(
          ST_MakePoint(${location.longitude}, ${location.latitude})::geography,
          bl.coordinates::geography
        ) as distance
      FROM rooms r
      JOIN brand_locations bl ON r.brand_id = bl.brand_id
      WHERE r.status = 'live'
        AND r.visibility = 'public'
        AND ST_DWithin(
          ST_MakePoint(${location.longitude}, ${location.latitude})::geography,
          bl.coordinates::geography,
          ${radius * 1000}
        )
      ORDER BY distance
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return nearbyRooms.map((room: any) => ({
      id: room.id,
      type: 'room',
      contentType: room.room_type,
      title: room.name,
      description: room.description,
      image: room.thumbnail_url,
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0,
        views: room.current_participants || 0,
      },
      reward: {
        action: 'Join Live Room',
        amount: 70, // Live room reward
      },
      metadata: {
        distance: Math.round(room.distance / 1000), // Convert to km
        brandId: room.brand_id,
        status: room.status,
      },
      score: 100 - (room.distance / 1000), // Closer = higher score
      createdAt: room.created_at,
    }));
  }

  /**
   * Get eligible ads for user
   */
  private async getEligibleAds(userId: string, limit: number): Promise<FeedItem[]> {
    const activeCampaigns = await prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      include: {
        ads: {
          where: { status: 'ACTIVE' },
          include: {
            assets: {
              take: 1,
            },
          },
        },
        brand: true,
      },
      take: limit * 2, // Fetch more for filtering
    });

    const ads: FeedItem[] = [];

    for (const campaign of activeCampaigns) {
      for (const ad of campaign.ads) {
        // Check if user has already seen this ad
        const views = await prisma.adImpression.count({
          where: {
            adId: ad.id,
            userId,
            viewedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        });

        // Limit to 3 views per day
        if (views >= 3) continue;

        // Check campaign targeting
        if (campaign.targeting) {
          const matches = await targetingService.userMatchesTargeting(
            userId,
            campaign.targeting
          );
          if (!matches) continue;
        }

        ads.push({
          id: ad.id,
          type: 'ad',
          contentType: ad.type,
          title: ad.name,
          description: ad.content?.body || campaign.description,
          image: ad.assets[0]?.assetUrl,
          engagement: {
            likes: 0,
            comments: 0,
            shares: 0,
            views,
          },
          reward: {
            action: 'Watch Ad',
            amount: ad.rewardWeights?.view || 30,
          },
          metadata: {
            campaignId: campaign.id,
            brandId: campaign.brandId,
            brandName: campaign.brand?.name,
            destinationUrl: ad.content?.destinationUrl,
          },
          score: Math.random() * 100, // Will be replaced with proper scoring
          createdAt: ad.createdAt,
        });

        if (ads.length >= limit) break;
      }
      if (ads.length >= limit) break;
    }

    return ads;
  }

  /**
   * Get active rooms
   */
  private async getActiveRooms(limit: number): Promise<FeedItem[]> {
    const rooms = await prisma.room.findMany({
      where: {
        status: 'live',
        visibility: 'public',
      },
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
      orderBy: {
        participants: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return rooms.map(room => ({
      id: room.id,
      type: 'room',
      contentType: room.roomType,
      title: room.name,
      description: room.description,
      image: room.brand?.logoUrl,
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0,
        views: room._count.participants,
      },
      reward: {
        action: 'Join Live Room',
        amount: 70,
      },
      metadata: {
        brandId: room.brandId,
        brandName: room.brand?.name,
        hostName: room.hosts[0]?.user?.profile?.displayName || room.hosts[0]?.user?.username,
        status: room.status,
      },
      score: room._count.participants * 10, // More viewers = higher score
      createdAt: room.createdAt,
    }));
  }

  /**
   * Get active campaigns
   */
  private async getActiveCampaigns(limit: number): Promise<FeedItem[]> {
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      include: {
        brand: true,
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
    });

    return campaigns.map(campaign => ({
      id: campaign.id,
      type: 'campaign',
      contentType: 'campaign',
      title: campaign.name,
      description: campaign.description,
      image: campaign.brand?.logoUrl,
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0,
        views: campaign._count.ads,
      },
      reward: {
        action: 'View Campaign',
        amount: 50,
      },
      metadata: {
        brandId: campaign.brandId,
        brandName: campaign.brand?.name,
        objective: campaign.objective,
        endDate: campaign.endDate,
      },
      score: 50,
      createdAt: campaign.createdAt,
    }));
  }

  /**
   * Get featured products
   */
  private async getFeaturedProducts(limit: number): Promise<FeedItem[]> {
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        isFeatured: true,
      },
      include: {
        brand: true,
        images: {
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return products.map(product => ({
      id: product.id,
      type: 'product',
      contentType: 'product',
      title: product.name,
      description: product.shortDescription,
      image: product.images[0]?.imageUrl,
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0,
        views: product.viewsCount,
      },
      reward: {
        action: 'View Product',
        amount: 15,
      },
      metadata: {
        brandId: product.brandId,
        brandName: product.brand?.name,
        price: {
          cap: product.priceCap,
          fiat: product.priceFiat,
        },
        currency: product.currency,
      },
      score: product.viewsCount,
      createdAt: product.createdAt,
    }));
  }

  /**
   * Get trending ads
   */
  private async getTrendingAds(limit: number): Promise<FeedItem[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const trendingAds = await prisma.ad.findMany({
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
        },
        _count: {
          select: {
            impressions: {
              where: {
                viewedAt: { gte: sevenDaysAgo },
              },
            },
            clicks: {
              where: {
                clickedAt: { gte: sevenDaysAgo },
              },
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
    });

    return trendingAds.map(ad => ({
      id: ad.id,
      type: 'ad',
      contentType: ad.type,
      title: ad.name,
      description: ad.content?.body,
      image: ad.assets[0]?.assetUrl,
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0,
        views: ad._count.impressions,
      },
      reward: {
        action: 'Watch Ad',
        amount: ad.rewardWeights?.view || 30,
      },
      metadata: {
        campaignId: ad.campaignId,
        brandId: ad.campaign?.brandId,
        brandName: ad.campaign?.brand?.name,
        engagement: {
          impressions: ad._count.impressions,
          clicks: ad._count.clicks,
          ctr: ad._count.impressions ? (ad._count.clicks / ad._count.impressions) * 100 : 0,
        },
      },
      score: ad._count.impressions,
      createdAt: ad.createdAt,
    }));
  }

  /**
   * Get trending rooms
   */
  private async getTrendingRooms(limit: number): Promise<FeedItem[]> {
    const trendingRooms = await prisma.room.findMany({
      where: {
        status: 'live',
        visibility: 'public',
      },
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
            messages: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
                },
              },
            },
          },
        },
      },
      orderBy: [
        {
          participants: {
            _count: 'desc',
          },
        },
        {
          messages: {
            _count: 'desc',
          },
        },
      ],
      take: limit,
    });

    return trendingRooms.map(room => ({
      id: room.id,
      type: 'room',
      contentType: room.roomType,
      title: room.name,
      description: room.description,
      image: room.brand?.logoUrl,
      engagement: {
        likes: 0,
        comments: room._count.messages,
        shares: 0,
        views: room._count.participants,
      },
      reward: {
        action: 'Join Live Room',
        amount: 70,
      },
      metadata: {
        brandId: room.brandId,
        brandName: room.brand?.name,
        hostName: room.hosts[0]?.user?.profile?.displayName || room.hosts[0]?.user?.username,
        messageCount: room._count.messages,
      },
      score: (room._count.participants * 10) + (room._count.messages * 2),
      createdAt: room.createdAt,
    }));
  }

  /**
   * Get trending campaigns
   */
  private async getTrendingCampaigns(limit: number): Promise<FeedItem[]> {
    const trendingCampaigns = await prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        brand: true,
        _count: {
          select: {
            ads: {
              where: {
                impressions: {
                  some: {
                    viewedAt: {
                      gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        ads: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return trendingCampaigns.map(campaign => ({
      id: campaign.id,
      type: 'campaign',
      contentType: 'campaign',
      title: campaign.name,
      description: campaign.description,
      image: campaign.brand?.logoUrl,
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0,
        views: campaign._count.ads,
      },
      reward: {
        action: 'View Campaign',
        amount: 50,
      },
      metadata: {
        brandId: campaign.brandId,
        brandName: campaign.brand?.name,
        objective: campaign.objective,
        endDate: campaign.endDate,
      },
      score: campaign._count.ads * 5,
      createdAt: campaign.createdAt,
    }));
  }

  /**
   * Get ads by user interests
   */
  private async getAdsByInterests(interests: string[], limit: number): Promise<FeedItem[]> {
    if (!interests.length) return [];

    const ads = await prisma.ad.findMany({
      where: {
        status: 'ACTIVE',
        campaign: {
          status: 'ACTIVE',
          brand: {
            category: {
              in: interests,
            },
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
        },
      },
      take: limit,
    });

    return ads.map(ad => ({
      id: ad.id,
      type: 'ad',
      contentType: ad.type,
      title: ad.name,
      description: ad.content?.body,
      image: ad.assets[0]?.assetUrl,
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
      },
      reward: {
        action: 'Watch Ad',
        amount: ad.rewardWeights?.view || 30,
      },
      metadata: {
        campaignId: ad.campaignId,
        brandId: ad.campaign?.brandId,
        brandName: ad.campaign?.brand?.name,
        category: ad.campaign?.brand?.category,
      },
      score: 50,
      createdAt: ad.createdAt,
    }));
  }

  /**
   * Get rooms by user interests
   */
  private async getRoomsByInterests(interests: string[], limit: number): Promise<FeedItem[]> {
    if (!interests.length) return [];

    const rooms = await prisma.room.findMany({
      where: {
        status: 'live',
        visibility: 'public',
        brand: {
          category: {
            in: interests,
          },
        },
      },
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
    });

    return rooms.map(room => ({
      id: room.id,
      type: 'room',
      contentType: room.roomType,
      title: room.name,
      description: room.description,
      image: room.brand?.logoUrl,
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0,
        views: room._count.participants,
      },
      reward: {
        action: 'Join Live Room',
        amount: 70,
      },
      metadata: {
        brandId: room.brandId,
        brandName: room.brand?.name,
        hostName: room.hosts[0]?.user?.profile?.displayName || room.hosts[0]?.user?.username,
        category: room.brand?.category,
      },
      score: room._count.participants * 5,
      createdAt: room.createdAt,
    }));
  }

  /**
   * Calculate interest score for item
   */
  private calculateInterestScore(item: FeedItem, interests: string[]): number {
    let score = 50; // Base score

    if (interests.includes(item.metadata.category)) {
      score += 30;
    }

    if (item.type === 'room' && item.metadata.hostName) {
      // Boost for live rooms with hosts
      score += 10;
    }

    return score;
  }

  /**
   * Score and rank feed items
   */
  private async scoreFeedItems(items: FeedItem[], userId: string): Promise<FeedItem[]> {
    // Get user's past engagement for personalization
    const pastEngagements = await prisma.userEngagement.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        targetType: true,
        targetId: true,
      },
    });

    const engagedItemIds = new Set(
      pastEngagements.map(e => `${e.targetType}:${e.targetId}`)
    );

    for (const item of items) {
      let score = item.score || 50;

      // Boost for fresh content
      const ageInHours = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60);
      score += Math.max(0, 20 - ageInHours); // Higher boost for newer content

      // Boost for high engagement
      score += item.engagement.views * 0.1;
      score += item.engagement.comments * 0.5;
      score += item.engagement.shares * 2;

      // Penalize if already seen
      if (engagedItemIds.has(`${item.type}:${item.id}`)) {
        score *= 0.5;
      }

      // Boost for high reward
      if (item.reward) {
        score += item.reward.amount * 0.2;
      }

      item.score = Math.round(score);
    }

    return items.sort((a, b) => b.score - a.score);
  }

  /**
   * Interleave items from multiple sources
   */
  private interleaveItems(arrays: FeedItem[][]): FeedItem[] {
    const result: FeedItem[] = [];
    const maxLength = Math.max(...arrays.map(arr => arr.length));

    for (let i = 0; i < maxLength; i++) {
      for (const arr of arrays) {
        if (i < arr.length) {
          result.push(arr[i]);
        }
      }
    }

    return result;
  }
}

export const feedService = new FeedService();