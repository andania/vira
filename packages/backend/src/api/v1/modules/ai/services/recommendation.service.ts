/**
 * AI Recommendation Service
 * Handles AI-powered content recommendations
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { subDays } from '@viraz/shared';

export interface RecommendationContext {
  userId: string;
  limit?: number;
  excludeIds?: string[];
  type?: 'ads' | 'rooms' | 'campaigns' | 'products' | 'all';
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface RecommendationScore {
  itemId: string;
  itemType: string;
  score: number;
  reasons: string[];
}

export class RecommendationService {
  /**
   * Get personalized recommendations for user
   */
  async getRecommendations(context: RecommendationContext): Promise<any[]> {
    try {
      const { userId, limit = 20, excludeIds = [], type = 'all', location } = context;

      // Try cache first
      const cacheKey = `ai:recommendations:${userId}:${type}:${limit}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get user profile and behavior data
      const user = await this.getUserProfile(userId);
      
      // Calculate user interest vector
      const interestVector = await this.calculateInterestVector(user);

      // Get candidate items based on type
      let candidates = [];
      
      if (type === 'all' || type === 'ads') {
        candidates.push(...await this.getCandidateAds(userId, limit * 2));
      }
      if (type === 'all' || type === 'rooms') {
        candidates.push(...await this.getCandidateRooms(userId, limit * 2, location));
      }
      if (type === 'all' || type === 'campaigns') {
        candidates.push(...await this.getCandidateCampaigns(userId, limit * 2));
      }
      if (type === 'all' || type === 'products') {
        candidates.push(...await this.getCandidateProducts(userId, limit * 2));
      }

      // Filter out excluded items
      candidates = candidates.filter(item => !excludeIds.includes(item.id));

      // Score each candidate
      const scoredItems = await Promise.all(
        candidates.map(item => this.scoreItem(item, user, interestVector, location))
      );

      // Sort by score and return top results
      const recommendations = scoredItems
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.item);

      // Cache for 1 hour
      await redis.setex(cacheKey, 3600, JSON.stringify(recommendations));

      return recommendations;
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      return [];
    }
  }

  /**
   * Get user profile with behavior data
   */
  private async getUserProfile(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        engagements: {
          where: {
            createdAt: { gte: subDays(new Date(), 30) },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        views: {
          where: {
            createdAt: { gte: subDays(new Date(), 30) },
          },
          take: 100,
        },
        purchases: {
          where: {
            createdAt: { gte: subDays(new Date(), 30) },
          },
          take: 50,
        },
        savedItems: {
          take: 50,
        },
      },
    });

    return user;
  }

  /**
   * Calculate user interest vector based on behavior
   */
  private async calculateInterestVector(user: any): Promise<Record<string, number>> {
    const interests: Record<string, number> = {};

    // Explicit interests from profile
    if (user.profile?.interests) {
      for (const interest of user.profile.interests) {
        interests[interest] = (interests[interest] || 0) + 10;
      }
    }

    // Engagement history
    for (const engagement of user.engagements || []) {
      const weight = this.getEngagementWeight(engagement.type);
      
      const itemDetails = await this.getItemDetails(engagement.targetType, engagement.targetId);
      if (itemDetails?.category) {
        interests[itemDetails.category] = (interests[itemDetails.category] || 0) + weight;
      }
      if (itemDetails?.tags) {
        for (const tag of itemDetails.tags) {
          interests[tag] = (interests[tag] || 0) + weight * 0.5;
        }
      }
    }

    // View history
    for (const view of user.views || []) {
      const itemDetails = await this.getItemDetails(view.targetType, view.targetId);
      if (itemDetails?.category) {
        interests[itemDetails.category] = (interests[itemDetails.category] || 0) + 0.5;
      }
    }

    // Purchase history (higher weight)
    for (const purchase of user.purchases || []) {
      const itemDetails = await this.getItemDetails('product', purchase.productId);
      if (itemDetails?.category) {
        interests[itemDetails.category] = (interests[itemDetails.category] || 0) + 5;
      }
    }

    // Normalize scores
    const maxScore = Math.max(...Object.values(interests), 1);
    for (const key in interests) {
      interests[key] = interests[key] / maxScore;
    }

    return interests;
  }

  /**
   * Get weight for different engagement types
   */
  private getEngagementWeight(type: string): number {
    const weights: Record<string, number> = {
      like: 2,
      comment: 3,
      share: 4,
      save: 2.5,
      click: 1.5,
      view: 1,
    };
    return weights[type] || 1;
  }

  /**
   * Get item details for interest extraction
   */
  private async getItemDetails(type: string, id: string): Promise<any> {
    switch (type) {
      case 'ad':
        const ad = await prisma.ad.findUnique({
          where: { id },
          include: {
            campaign: {
              include: {
                brand: true,
              },
            },
          },
        });
        return {
          category: ad?.campaign?.brand?.industry,
          tags: [ad?.type],
        };

      case 'room':
        const room = await prisma.room.findUnique({
          where: { id },
          include: {
            brand: true,
          },
        });
        return {
          category: room?.brand?.industry,
          tags: [room?.roomType],
        };

      case 'campaign':
        const campaign = await prisma.campaign.findUnique({
          where: { id },
          include: {
            brand: true,
          },
        });
        return {
          category: campaign?.brand?.industry,
          tags: [campaign?.objective],
        };

      case 'product':
        const product = await prisma.product.findUnique({
          where: { id },
          include: {
            category: true,
          },
        });
        return {
          category: product?.category?.name,
          tags: [],
        };

      default:
        return null;
    }
  }

  /**
   * Get candidate ads
   */
  private async getCandidateAds(userId: string, limit: number): Promise<any[]> {
    const ads = await prisma.ad.findMany({
      where: {
        status: 'ACTIVE',
        campaign: {
          status: 'ACTIVE',
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      },
      include: {
        campaign: {
          include: {
            brand: true,
          },
        },
        assets: { take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return ads.map(ad => ({
      ...ad,
      type: 'ad',
    }));
  }

  /**
   * Get candidate rooms
   */
  private async getCandidateRooms(userId: string, limit: number, location?: any): Promise<any[]> {
    const where: any = {
      status: 'live',
      visibility: 'public',
    };

    // If location provided, sort by distance
    if (location) {
      // This would use PostGIS for spatial queries
    }

    const rooms = await prisma.room.findMany({
      where,
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
      ...room,
      type: 'room',
    }));
  }

  /**
   * Get candidate campaigns
   */
  private async getCandidateCampaigns(userId: string, limit: number): Promise<any[]> {
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
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return campaigns.map(campaign => ({
      ...campaign,
      type: 'campaign',
    }));
  }

  /**
   * Get candidate products
   */
  private async getCandidateProducts(userId: string, limit: number): Promise<any[]> {
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        brand: true,
        category: true,
        images: { take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return products.map(product => ({
      ...product,
      type: 'product',
    }));
  }

  /**
   * Score an item for recommendation
   */
  private async scoreItem(
    item: any,
    user: any,
    interestVector: Record<string, number>,
    location?: any
  ): Promise<{ item: any; score: number; reasons: string[] }> {
    let score = 50; // Base score
    const reasons: string[] = [];

    // Factor 1: Interest match
    const interestScore = this.calculateInterestMatch(item, interestVector);
    score += interestScore * 30;
    if (interestScore > 0.7) {
      reasons.push('Strongly matches your interests');
    } else if (interestScore > 0.3) {
      reasons.push('Matches your interests');
    }

    // Factor 2: Popularity
    const popularityScore = this.calculatePopularityScore(item);
    score += popularityScore * 20;
    if (popularityScore > 0.7) {
      reasons.push('Popular now');
    }

    // Factor 3: Recency
    const recencyScore = this.calculateRecencyScore(item);
    score += recencyScore * 15;
    if (recencyScore > 0.8) {
      reasons.push('Fresh content');
    }

    // Factor 4: Engagement potential (reward)
    if (item.type === 'ad' && item.rewardWeights?.view) {
      const rewardScore = Math.min(item.rewardWeights.view / 100, 1);
      score += rewardScore * 15;
      if (rewardScore > 0.5) {
        reasons.push('High reward');
      }
    }

    // Factor 5: Location relevance
    if (location && item.type === 'room' && item.brand?.locations) {
      const locationScore = this.calculateLocationScore(item, location);
      score += locationScore * 10;
      if (locationScore > 0) {
        reasons.push('Near you');
      }
    }

    // Factor 6: Collaborative filtering
    const collabScore = await this.getCollaborativeScore(user.id, item);
    score += collabScore * 10;

    return { item, score, reasons };
  }

  /**
   * Calculate interest match score
   */
  private calculateInterestMatch(item: any, interestVector: Record<string, number>): number {
    let category = '';

    // Extract category from item
    if (item.type === 'ad' && item.campaign?.brand?.industry) {
      category = item.campaign.brand.industry;
    } else if (item.type === 'room' && item.brand?.industry) {
      category = item.brand.industry;
    } else if (item.type === 'campaign' && item.brand?.industry) {
      category = item.brand.industry;
    } else if (item.type === 'product' && item.brand?.industry) {
      category = item.brand.industry;
    }

    return category ? interestVector[category] || 0 : 0;
  }

  /**
   * Calculate popularity score
   */
  private calculatePopularityScore(item: any): number {
    let views = 0;
    let engagements = 0;

    if (item.type === 'ad') {
      views = item._count?.impressions || 0;
      engagements = item._count?.clicks || 0;
    } else if (item.type === 'room') {
      views = item._count?.participants || 0;
      engagements = item._count?.messages || 0;
    } else if (item.type === 'product') {
      views = item.viewsCount || 0;
      engagements = item.soldCount || 0;
    }

    const total = views + engagements * 10;
    return Math.min(total / 1000, 1);
  }

  /**
   * Calculate recency score
   */
  private calculateRecencyScore(item: any): number {
    const createdAt = item.createdAt || item.scheduledStart;
    if (!createdAt) return 0;

    const ageInHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    
    if (ageInHours < 24) return 1;
    if (ageInHours < 72) return 0.8;
    if (ageInHours < 168) return 0.5;
    if (ageInHours < 720) return 0.2;
    
    return 0;
  }

  /**
   * Calculate location score
   */
  private calculateLocationScore(item: any, location: any): number {
    // This would use actual distance calculation
    // Simplified for now
    return Math.random() * 0.5;
  }

  /**
   * Get collaborative filtering score
   */
  private async getCollaborativeScore(userId: string, item: any): Promise<number> {
    // Find users who liked similar items
    const similarUsers = await prisma.userEngagement.findMany({
      where: {
        targetType: item.type,
        targetId: item.id,
        type: 'like',
      },
      select: { userId: true },
      take: 50,
    });

    if (similarUsers.length === 0) return 0;

    const similarUserIds = similarUsers.map(u => u.userId);
    
    // Check if current user is similar to these users
    const commonInterests = await prisma.userEngagement.count({
      where: {
        userId: { in: similarUserIds },
        targetType: { in: ['ad', 'room', 'product'] },
        type: 'like',
      },
    });

    return Math.min(commonInterests / 100, 0.5);
  }

  /**
   * Get recommendation explanation
   */
  async getExplanation(itemId: string, itemType: string, userId: string): Promise<string[]> {
    try {
      const user = await this.getUserProfile(userId);
      const interestVector = await this.calculateInterestVector(user);
      
      let item: any;
      switch (itemType) {
        case 'ad':
          item = await prisma.ad.findUnique({
            where: { id: itemId },
            include: { campaign: { include: { brand: true } } },
          });
          break;
        case 'room':
          item = await prisma.room.findUnique({
            where: { id: itemId },
            include: { brand: true },
          });
          break;
        case 'campaign':
          item = await prisma.campaign.findUnique({
            where: { id: itemId },
            include: { brand: true },
          });
          break;
        case 'product':
          item = await prisma.product.findUnique({
            where: { id: itemId },
            include: { brand: true, category: true },
          });
          break;
      }

      const reasons: string[] = [];
      const interestScore = this.calculateInterestMatch({ ...item, type: itemType }, interestVector);

      if (interestScore > 0.7) {
        reasons.push('Based on your strong interest in this category');
      } else if (interestScore > 0.3) {
        reasons.push('Matches your interests');
      }

      const popularity = this.calculatePopularityScore({ ...item, type: itemType });
      if (popularity > 0.7) {
        reasons.push('Popular among users like you');
      }

      return reasons;
    } catch (error) {
      logger.error('Error getting recommendation explanation:', error);
      return [];
    }
  }

  /**
   * Refresh recommendation cache for user
   */
  async refreshUserCache(userId: string): Promise<void> {
    try {
      const patterns = await redis.keys(`ai:recommendations:${userId}:*`);
      if (patterns.length > 0) {
        await redis.del(...patterns);
      }
      logger.info(`Recommendation cache refreshed for user ${userId}`);
    } catch (error) {
      logger.error('Error refreshing recommendation cache:', error);
    }
  }
}

export const recommendationService = new RecommendationService();