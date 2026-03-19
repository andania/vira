/**
 * Recommendation Service
 * Handles AI-powered content recommendations and personalization
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { feedService } from './feed.service';

export interface RecommendationContext {
  userId: string;
  limit?: number;
  excludeIds?: string[];
  context?: {
    timeOfDay?: string;
    device?: string;
    location?: {
      latitude: number;
      longitude: number;
    };
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
      const { userId, limit = 20, excludeIds = [], context: userContext } = context;

      // Get user profile and history
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          engagements: {
            where: {
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
          },
          views: {
            where: {
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
            take: 100,
          },
        },
      });

      // Calculate user interest vector
      const interestVector = await this.calculateInterestVector(user);

      // Get candidate items
      const candidates = await this.getCandidateItems(userId, excludeIds, limit * 3);

      // Score each candidate
      const scoredItems = await Promise.all(
        candidates.map(item => this.scoreItem(item, user, interestVector, userContext))
      );

      // Sort by score and return top results
      const recommendations = scoredItems
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.item);

      return recommendations;
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      // Fallback to popular content
      return feedService.getTrendingFeed(limit, 0);
    }
  }

  /**
   * Calculate user interest vector based on history
   */
  private async calculateInterestVector(user: any): Promise<Record<string, number>> {
    const interests: Record<string, number> = {};

    // Add explicit interests from profile
    if (user.profile?.interests) {
      for (const interest of user.profile.interests) {
        interests[interest] = (interests[interest] || 0) + 10;
      }
    }

    // Analyze engagement history
    for (const engagement of user.engagements) {
      const weight = this.getEngagementWeight(engagement.type);
      
      // Get item details to extract categories/interests
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
      click: 1.5,
      view: 1,
      save: 2.5,
      purchase: 5,
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
   * Get candidate items for recommendation
   */
  private async getCandidateItems(
    userId: string,
    excludeIds: string[],
    limit: number
  ): Promise<any[]> {
    const candidates = [];

    // Get popular items
    const popularItems = await this.getPopularItems(limit / 2);
    candidates.push(...popularItems);

    // Get items similar to user's past engagements
    const similarItems = await this.getSimilarItems(userId, limit / 2);
    candidates.push(...similarItems);

    // Deduplicate by id
    const seen = new Set();
    return candidates.filter(item => {
      if (seen.has(item.id) || excludeIds.includes(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    });
  }

  /**
   * Get popular items across all types
   */
  private async getPopularItems(limit: number): Promise<any[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [popularAds, popularRooms, popularCampaigns, popularProducts] = await Promise.all([
      // Popular ads based on impressions
      prisma.ad.findMany({
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
          assets: { take: 1 },
          _count: {
            select: {
              impressions: {
                where: { viewedAt: { gte: sevenDaysAgo } },
              },
            },
          },
        },
        orderBy: {
          impressions: {
            _count: 'desc',
          },
        },
        take: Math.ceil(limit * 0.3),
      }),

      // Popular rooms based on participants
      prisma.room.findMany({
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
        take: Math.ceil(limit * 0.3),
      }),

      // Popular campaigns based on ad impressions
      prisma.campaign.findMany({
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
                      viewedAt: { gte: sevenDaysAgo },
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
        take: Math.ceil(limit * 0.2),
      }),

      // Popular products based on views
      prisma.product.findMany({
        where: {
          status: 'ACTIVE',
        },
        include: {
          brand: true,
          images: { take: 1 },
        },
        orderBy: {
          viewsCount: 'desc',
        },
        take: Math.ceil(limit * 0.2),
      }),
    ]);

    return [
      ...popularAds.map(ad => ({
        ...ad,
        type: 'ad',
        popularity: ad._count.impressions,
      })),
      ...popularRooms.map(room => ({
        ...room,
        type: 'room',
        popularity: room._count.participants,
      })),
      ...popularCampaigns.map(campaign => ({
        ...campaign,
        type: 'campaign',
        popularity: campaign._count.ads,
      })),
      ...popularProducts.map(product => ({
        ...product,
        type: 'product',
        popularity: product.viewsCount,
      })),
    ];
  }

  /**
   * Get items similar to user's past engagements
   */
  private async getSimilarItems(userId: string, limit: number): Promise<any[]> {
    // Get user's recent engagements
    const recentEngagements = await prisma.userEngagement.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (recentEngagements.length === 0) {
      return [];
    }

    // Extract categories from engagements
    const categories = new Set<string>();
    for (const engagement of recentEngagements) {
      const details = await this.getItemDetails(engagement.targetType, engagement.targetId);
      if (details?.category) {
        categories.add(details.category);
      }
    }

    if (categories.size === 0) {
      return [];
    }

    // Find items in same categories
    const categoryArray = Array.from(categories);
    const [similarAds, similarRooms, similarProducts] = await Promise.all([
      prisma.ad.findMany({
        where: {
          status: 'ACTIVE',
          campaign: {
            brand: {
              industry: { in: categoryArray },
            },
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
        take: Math.ceil(limit * 0.4),
      }),
      prisma.room.findMany({
        where: {
          status: 'live',
          visibility: 'public',
          brand: {
            industry: { in: categoryArray },
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
        },
        take: Math.ceil(limit * 0.3),
      }),
      prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          brand: {
            industry: { in: categoryArray },
          },
        },
        include: {
          brand: true,
          images: { take: 1 },
        },
        take: Math.ceil(limit * 0.3),
      }),
    ]);

    return [
      ...similarAds.map(ad => ({ ...ad, type: 'ad' })),
      ...similarRooms.map(room => ({ ...room, type: 'room' })),
      ...similarProducts.map(product => ({ ...product, type: 'product' })),
    ];
  }

  /**
   * Score an item for recommendation
   */
  private async scoreItem(
    item: any,
    user: any,
    interestVector: Record<string, number>,
    context: any
  ): Promise<{ item: any; score: number; reasons: string[] }> {
    let score = 0;
    const reasons: string[] = [];

    // Factor 1: Interest match
    const interestScore = this.calculateInterestMatch(item, interestVector);
    score += interestScore * 3;
    if (interestScore > 0.5) {
      reasons.push('Matches your interests');
    }

    // Factor 2: Popularity
    if (item.popularity) {
      const popularityScore = Math.min(item.popularity / 1000, 1) * 2;
      score += popularityScore;
      if (popularityScore > 1) {
        reasons.push('Popular now');
      }
    }

    // Factor 3: Recency
    const recencyScore = this.calculateRecencyScore(item);
    score += recencyScore;
    if (recencyScore > 1) {
      reasons.push('Fresh content');
    }

    // Factor 4: Engagement potential (reward)
    if (item.type === 'ad' && item.rewardWeights?.view) {
      const rewardScore = Math.min(item.rewardWeights.view / 50, 1) * 1.5;
      score += rewardScore;
      if (rewardScore > 1) {
        reasons.push('High reward');
      }
    }

    // Factor 5: Contextual relevance
    if (context) {
      const contextScore = this.calculateContextScore(item, context);
      score += contextScore;
      if (contextScore > 0.5) {
        reasons.push('Relevant now');
      }
    }

    // Factor 6: User behavior patterns
    const behaviorScore = await this.calculateBehaviorScore(item, user.id);
    score += behaviorScore;
    if (behaviorScore > 0.5) {
      reasons.push('Based on your activity');
    }

    return { item, score, reasons };
  }

  /**
   * Calculate interest match score
   */
  private calculateInterestMatch(item: any, interestVector: Record<string, number>): number {
    let matchScore = 0;
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

    if (category && interestVector[category]) {
      matchScore = interestVector[category];
    }

    return matchScore;
  }

  /**
   * Calculate recency score
   */
  private calculateRecencyScore(item: any): number {
    const createdAt = item.createdAt || item.scheduledStart;
    if (!createdAt) return 0;

    const ageInHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    
    if (ageInHours < 1) return 2; // Last hour
    if (ageInHours < 6) return 1.5; // Last 6 hours
    if (ageInHours < 24) return 1; // Last day
    if (ageInHours < 168) return 0.5; // Last week
    
    return 0.1;
  }

  /**
   * Calculate contextual relevance score
   */
  private calculateContextScore(item: any, context: any): number {
    let score = 0;

    // Time of day relevance
    if (context.timeOfDay) {
      const hour = new Date().getHours();
      
      // Entertainment content in evenings
      if (hour >= 18 || hour <= 22) {
        if (item.type === 'room' || item.type === 'ad') {
          score += 0.5;
        }
      }
      
      // Shopping during day
      if (hour >= 9 && hour <= 17) {
        if (item.type === 'product') {
          score += 0.5;
        }
      }
    }

    // Device relevance
    if (context.device === 'mobile' && item.type === 'ad') {
      // Mobile-optimized content
      score += 0.3;
    }

    return score;
  }

  /**
   * Calculate behavior-based score
   */
  private async calculateBehaviorScore(item: any, userId: string): Promise<number> {
    let score = 0;

    // Check if user has engaged with similar items
    const similarEngagements = await prisma.userEngagement.count({
      where: {
        userId,
        targetType: item.type,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (similarEngagements > 10) {
      score += 0.5; // User likes this type of content
    }

    // Check if user has engaged with this specific brand
    const brandId = item.brandId || item.campaign?.brandId;
    if (brandId) {
      const brandEngagements = await prisma.userEngagement.count({
        where: {
          userId,
          targetType: 'brand',
          targetId: brandId,
        },
      });

      if (brandEngagements > 0) {
        score += 0.7; // User likes this brand
      }
    }

    return score;
  }

  /**
   * Get similar users based on engagement patterns
   */
  async getSimilarUsers(userId: string, limit: number = 10): Promise<string[]> {
    try {
      // Get user's engaged items
      const userEngagements = await prisma.userEngagement.findMany({
        where: { userId },
        select: {
          targetType: true,
          targetId: true,
        },
        take: 100,
      });

      if (userEngagements.length === 0) {
        return [];
      }

      // Find users who engaged with same items
      const similarUsers = await prisma.userEngagement.groupBy({
        by: ['userId'],
        where: {
          OR: userEngagements.map(e => ({
            targetType: e.targetType,
            targetId: e.targetId,
          })),
          userId: { not: userId },
        },
        _count: true,
        orderBy: {
          _count: 'desc',
        },
        take: limit,
      });

      return similarUsers.map(u => u.userId);
    } catch (error) {
      logger.error('Error finding similar users:', error);
      return [];
    }
  }

  /**
   * Get collaborative filtering recommendations
   */
  async getCollaborativeRecommendations(userId: string, limit: number = 20): Promise<any[]> {
    try {
      // Get similar users
      const similarUsers = await this.getSimilarUsers(userId, 50);

      if (similarUsers.length === 0) {
        return [];
      }

      // Get items liked by similar users but not by current user
      const userEngagedItems = await prisma.userEngagement.findMany({
        where: { userId },
        select: {
          targetType: true,
          targetId: true,
        },
      });

      const engagedSet = new Set(
        userEngagedItems.map(e => `${e.targetType}:${e.targetId}`)
      );

      // Find popular items among similar users
      const recommendations = await prisma.userEngagement.groupBy({
        by: ['targetType', 'targetId'],
        where: {
          userId: { in: similarUsers },
          NOT: {
            OR: userEngagedItems.map(e => ({
              targetType: e.targetType,
              targetId: e.targetId,
            })),
          },
        },
        _count: true,
        orderBy: {
          _count: 'desc',
        },
        take: limit,
      });

      // Fetch full item details
      const items = [];
      for (const rec of recommendations) {
        if (engagedSet.has(`${rec.targetType}:${rec.targetId}`)) continue;

        let item = null;
        switch (rec.targetType) {
          case 'ad':
            item = await prisma.ad.findUnique({
              where: { id: rec.targetId },
              include: {
                campaign: {
                  include: {
                    brand: true,
                  },
                },
                assets: { take: 1 },
              },
            });
            if (item) items.push({ ...item, type: 'ad' });
            break;
          case 'room':
            item = await prisma.room.findUnique({
              where: { id: rec.targetId },
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
              },
            });
            if (item) items.push({ ...item, type: 'room' });
            break;
        }
      }

      return items;
    } catch (error) {
      logger.error('Error getting collaborative recommendations:', error);
      return [];
    }
  }

  /**
   * Refresh recommendation cache for user
   */
  async refreshUserCache(userId: string): Promise<void> {
    try {
      const cacheKey = `recommendations:${userId}`;
      await redis.del(cacheKey);
      
      // Pre-compute and cache new recommendations
      const recommendations = await this.getRecommendations({ userId, limit: 50 });
      await redis.setex(cacheKey, 3600, JSON.stringify(recommendations)); // Cache for 1 hour
      
      logger.info(`Recommendation cache refreshed for user ${userId}`);
    } catch (error) {
      logger.error('Error refreshing recommendation cache:', error);
    }
  }

  /**
   * Get explanation for recommendation
   */
  async getRecommendationExplanation(itemId: string, itemType: string, userId: string): Promise<string[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
        },
      });

      const interestVector = await this.calculateInterestVector(user);
      const item = await this.getItemDetails(itemType, itemId);
      
      const reasons: string[] = [];

      // Interest-based explanation
      if (item?.category && interestVector[item.category] > 0.7) {
        reasons.push(`Based on your interest in ${item.category}`);
      } else if (item?.category && interestVector[item.category] > 0.3) {
        reasons.push(`You might like this ${item.category} content`);
      }

      // Popularity explanation
      const popular = await this.getPopularItems(1);
      if (popular.some(p => p.id === itemId)) {
        reasons.push('Trending now');
      }

      // Similar users explanation
      const similarUsers = await this.getSimilarUsers(userId, 5);
      if (similarUsers.length > 0) {
        reasons.push('People with similar interests liked this');
      }

      return reasons;
    } catch (error) {
      logger.error('Error getting recommendation explanation:', error);
      return [];
    }
  }
}

export const recommendationService = new RecommendationService();