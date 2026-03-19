/**
 * Trend Prediction Service
 * Handles trend detection and prediction algorithms
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { subDays, subHours } from '@viraz/shared';

export interface TrendData {
  id: string;
  type: 'ad' | 'room' | 'campaign' | 'product' | 'brand';
  name: string;
  score: number;
  velocity: number; // Rate of change
  momentum: number; // Acceleration of change
  peak: number; // Peak value in time window
  trend: 'up' | 'down' | 'stable';
  category?: string;
  metadata: Record<string, any>;
}

export interface TrendPrediction {
  itemId: string;
  itemType: string;
  predictedScore: number;
  confidence: number;
  peakTime: Date;
  duration: number; // Expected duration in hours
  factors: string[];
}

export class TrendService {
  /**
   * Get current trending items
   */
  async getTrendingItems(
    type?: string,
    category?: string,
    limit: number = 20
  ): Promise<TrendData[]> {
    try {
      const cacheKey = `ai:trending:${type || 'all'}:${category || 'all'}:${limit}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const oneHourAgo = subHours(new Date(), 1);
      const threeHoursAgo = subHours(new Date(), 3);
      const sixHoursAgo = subHours(new Date(), 6);
      const twentyFourHoursAgo = subHours(new Date(), 24);

      let trending: TrendData[] = [];

      if (!type || type === 'ad') {
        trending.push(...await this.getTrendingAds(
          oneHourAgo,
          threeHoursAgo,
          sixHoursAgo,
          twentyFourHoursAgo,
          category,
          Math.ceil(limit / 4)
        ));
      }

      if (!type || type === 'room') {
        trending.push(...await this.getTrendingRooms(
          oneHourAgo,
          threeHoursAgo,
          sixHoursAgo,
          twentyFourHoursAgo,
          category,
          Math.ceil(limit / 4)
        ));
      }

      if (!type || type === 'campaign') {
        trending.push(...await this.getTrendingCampaigns(
          oneHourAgo,
          threeHoursAgo,
          sixHoursAgo,
          twentyFourHoursAgo,
          category,
          Math.ceil(limit / 4)
        ));
      }

      if (!type || type === 'product') {
        trending.push(...await this.getTrendingProducts(
          oneHourAgo,
          threeHoursAgo,
          sixHoursAgo,
          twentyFourHoursAgo,
          category,
          Math.ceil(limit / 4)
        ));
      }

      if (!type || type === 'brand') {
        trending.push(...await this.getTrendingBrands(
          oneHourAgo,
          threeHoursAgo,
          sixHoursAgo,
          twentyFourHoursAgo,
          category,
          Math.ceil(limit / 4)
        ));
      }

      // Sort by score and limit
      trending = trending
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Cache for 5 minutes
      await redis.setex(cacheKey, 300, JSON.stringify(trending));

      return trending;
    } catch (error) {
      logger.error('Error getting trending items:', error);
      throw error;
    }
  }

  /**
   * Get trending ads
   */
  private async getTrendingAds(
    oneHourAgo: Date,
    threeHoursAgo: Date,
    sixHoursAgo: Date,
    twentyFourHoursAgo: Date,
    category?: string,
    limit: number = 10
  ): Promise<TrendData[]> {
    const where: any = {
      status: 'ACTIVE',
      campaign: {
        status: 'ACTIVE',
      },
    };

    if (category) {
      where.campaign.brand = { industry: category };
    }

    const ads = await prisma.ad.findMany({
      where,
      include: {
        campaign: {
          include: {
            brand: true,
          },
        },
        _count: {
          select: {
            impressions: {
              where: { viewedAt: { gte: oneHourAgo } },
            },
            clicks: {
              where: { clickedAt: { gte: oneHourAgo } },
            },
          },
        },
      },
    });

    const trending: TrendData[] = [];

    for (const ad of ads) {
      // Get historical counts
      const [oneHourCount, threeHourCount, sixHourCount, twentyFourHourCount] = await Promise.all([
        ad._count.impressions,
        prisma.adImpression.count({
          where: {
            adId: ad.id,
            viewedAt: { gte: threeHoursAgo, lt: oneHourAgo },
          },
        }),
        prisma.adImpression.count({
          where: {
            adId: ad.id,
            viewedAt: { gte: sixHoursAgo, lt: threeHoursAgo },
          },
        }),
        prisma.adImpression.count({
          where: {
            adId: ad.id,
            viewedAt: { gte: twentyFourHoursAgo, lt: sixHoursAgo },
          },
        }),
      ]);

      const scores = this.calculateTrendScores([
        oneHourCount,
        threeHourCount,
        sixHourCount,
        twentyFourHourCount,
      ]);

      trending.push({
        id: ad.id,
        type: 'ad',
        name: ad.name,
        score: scores.score,
        velocity: scores.velocity,
        momentum: scores.momentum,
        peak: Math.max(oneHourCount, threeHourCount, sixHourCount, twentyFourHourCount),
        trend: scores.trend,
        category: ad.campaign?.brand?.industry,
        metadata: {
          brandId: ad.campaign?.brandId,
          brandName: ad.campaign?.brand?.name,
          impressions: oneHourCount,
          clicks: ad._count.clicks,
        },
      });
    }

    return trending;
  }

  /**
   * Get trending rooms
   */
  private async getTrendingRooms(
    oneHourAgo: Date,
    threeHoursAgo: Date,
    sixHoursAgo: Date,
    twentyFourHoursAgo: Date,
    category?: string,
    limit: number = 10
  ): Promise<TrendData[]> {
    const where: any = {
      status: 'live',
      visibility: 'public',
    };

    if (category) {
      where.brand = { industry: category };
    }

    const rooms = await prisma.room.findMany({
      where,
      include: {
        brand: true,
        _count: {
          select: {
            participants: {
              where: { joinedAt: { gte: oneHourAgo } },
            },
            messages: {
              where: { createdAt: { gte: oneHourAgo } },
            },
          },
        },
      },
    });

    const trending: TrendData[] = [];

    for (const room of rooms) {
      const [oneHourParticipants, threeHourParticipants, sixHourParticipants, twentyFourHourParticipants] = await Promise.all([
        room._count.participants,
        prisma.roomParticipant.count({
          where: {
            roomId: room.id,
            joinedAt: { gte: threeHoursAgo, lt: oneHourAgo },
          },
        }),
        prisma.roomParticipant.count({
          where: {
            roomId: room.id,
            joinedAt: { gte: sixHoursAgo, lt: threeHoursAgo },
          },
        }),
        prisma.roomParticipant.count({
          where: {
            roomId: room.id,
            joinedAt: { gte: twentyFourHoursAgo, lt: sixHoursAgo },
          },
        }),
      ]);

      const scores = this.calculateTrendScores([
        oneHourParticipants,
        threeHourParticipants,
        sixHourParticipants,
        twentyFourHourParticipants,
      ]);

      trending.push({
        id: room.id,
        type: 'room',
        name: room.name,
        score: scores.score,
        velocity: scores.velocity,
        momentum: scores.momentum,
        peak: Math.max(oneHourParticipants, threeHourParticipants, sixHourParticipants, twentyFourHourParticipants),
        trend: scores.trend,
        category: room.brand?.industry,
        metadata: {
          brandId: room.brandId,
          brandName: room.brand?.name,
          participants: oneHourParticipants,
          messages: room._count.messages,
        },
      });
    }

    return trending;
  }

  /**
   * Get trending campaigns
   */
  private async getTrendingCampaigns(
    oneHourAgo: Date,
    threeHoursAgo: Date,
    sixHoursAgo: Date,
    twentyFourHoursAgo: Date,
    category?: string,
    limit: number = 10
  ): Promise<TrendData[]> {
    const where: any = {
      status: 'ACTIVE',
    };

    if (category) {
      where.brand = { industry: category };
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        brand: true,
      },
    });

    const trending: TrendData[] = [];

    for (const campaign of campaigns) {
      const [oneHourEngagements, threeHourEngagements, sixHourEngagements, twentyFourHourEngagements] = await Promise.all([
        prisma.userEngagement.count({
          where: {
            targetType: 'campaign',
            targetId: campaign.id,
            createdAt: { gte: oneHourAgo },
          },
        }),
        prisma.userEngagement.count({
          where: {
            targetType: 'campaign',
            targetId: campaign.id,
            createdAt: { gte: threeHoursAgo, lt: oneHourAgo },
          },
        }),
        prisma.userEngagement.count({
          where: {
            targetType: 'campaign',
            targetId: campaign.id,
            createdAt: { gte: sixHoursAgo, lt: threeHoursAgo },
          },
        }),
        prisma.userEngagement.count({
          where: {
            targetType: 'campaign',
            targetId: campaign.id,
            createdAt: { gte: twentyFourHoursAgo, lt: sixHoursAgo },
          },
        }),
      ]);

      const scores = this.calculateTrendScores([
        oneHourEngagements,
        threeHourEngagements,
        sixHourEngagements,
        twentyFourHourEngagements,
      ]);

      trending.push({
        id: campaign.id,
        type: 'campaign',
        name: campaign.name,
        score: scores.score,
        velocity: scores.velocity,
        momentum: scores.momentum,
        peak: Math.max(oneHourEngagements, threeHourEngagements, sixHourEngagements, twentyFourHourEngagements),
        trend: scores.trend,
        category: campaign.brand?.industry,
        metadata: {
          brandId: campaign.brandId,
          brandName: campaign.brand?.name,
          engagements: oneHourEngagements,
        },
      });
    }

    return trending;
  }

  /**
   * Get trending products
   */
  private async getTrendingProducts(
    oneHourAgo: Date,
    threeHoursAgo: Date,
    sixHoursAgo: Date,
    twentyFourHoursAgo: Date,
    category?: string,
    limit: number = 10
  ): Promise<TrendData[]> {
    const where: any = {
      status: 'ACTIVE',
    };

    if (category) {
      where.category = { name: category };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        brand: true,
        category: true,
      },
    });

    const trending: TrendData[] = [];

    for (const product of products) {
      const [oneHourViews, threeHourViews, sixHourViews, twentyFourHourViews] = await Promise.all([
        prisma.contentView.count({
          where: {
            targetType: 'product',
            targetId: product.id,
            createdAt: { gte: oneHourAgo },
          },
        }),
        prisma.contentView.count({
          where: {
            targetType: 'product',
            targetId: product.id,
            createdAt: { gte: threeHoursAgo, lt: oneHourAgo },
          },
        }),
        prisma.contentView.count({
          where: {
            targetType: 'product',
            targetId: product.id,
            createdAt: { gte: sixHoursAgo, lt: threeHoursAgo },
          },
        }),
        prisma.contentView.count({
          where: {
            targetType: 'product',
            targetId: product.id,
            createdAt: { gte: twentyFourHoursAgo, lt: sixHoursAgo },
          },
        }),
      ]);

      const scores = this.calculateTrendScores([
        oneHourViews,
        threeHourViews,
        sixHourViews,
        twentyFourHourViews,
      ]);

      trending.push({
        id: product.id,
        type: 'product',
        name: product.name,
        score: scores.score,
        velocity: scores.velocity,
        momentum: scores.momentum,
        peak: Math.max(oneHourViews, threeHourViews, sixHourViews, twentyFourHourViews),
        trend: scores.trend,
        category: product.category?.name,
        metadata: {
          brandId: product.brandId,
          brandName: product.brand?.name,
          views: oneHourViews,
          price: product.priceFiat,
        },
      });
    }

    return trending;
  }

  /**
   * Get trending brands
   */
  private async getTrendingBrands(
    oneHourAgo: Date,
    threeHoursAgo: Date,
    sixHoursAgo: Date,
    twentyFourHoursAgo: Date,
    category?: string,
    limit: number = 10
  ): Promise<TrendData[]> {
    const where: any = {
      isActive: true,
    };

    if (category) {
      where.industry = category;
    }

    const brands = await prisma.brand.findMany({
      where,
    });

    const trending: TrendData[] = [];

    for (const brand of brands) {
      const [oneHourMentions, threeHourMentions, sixHourMentions, twentyFourHourMentions] = await Promise.all([
        prisma.userEngagement.count({
          where: {
            targetType: 'brand',
            targetId: brand.id,
            createdAt: { gte: oneHourAgo },
          },
        }),
        prisma.userEngagement.count({
          where: {
            targetType: 'brand',
            targetId: brand.id,
            createdAt: { gte: threeHoursAgo, lt: oneHourAgo },
          },
        }),
        prisma.userEngagement.count({
          where: {
            targetType: 'brand',
            targetId: brand.id,
            createdAt: { gte: sixHoursAgo, lt: threeHoursAgo },
          },
        }),
        prisma.userEngagement.count({
          where: {
            targetType: 'brand',
            targetId: brand.id,
            createdAt: { gte: twentyFourHoursAgo, lt: sixHoursAgo },
          },
        }),
      ]);

      const scores = this.calculateTrendScores([
        oneHourMentions,
        threeHourMentions,
        sixHourMentions,
        twentyFourHourMentions,
      ]);

      trending.push({
        id: brand.id,
        type: 'brand',
        name: brand.name,
        score: scores.score,
        velocity: scores.velocity,
        momentum: scores.momentum,
        peak: Math.max(oneHourMentions, threeHourMentions, sixHourMentions, twentyFourHourMentions),
        trend: scores.trend,
        category: brand.industry,
        metadata: {
          followers: await prisma.brandFollower.count({ where: { brandId: brand.id } }),
        },
      });
    }

    return trending;
  }

  /**
   * Calculate trend scores
   */
  private calculateTrendScores(counts: number[]): {
    score: number;
    velocity: number;
    momentum: number;
    trend: 'up' | 'down' | 'stable';
  } {
    const [current, prev1, prev2, prev3] = counts;

    // Calculate velocity (rate of change)
    const velocity1 = current - prev1;
    const velocity2 = prev1 - prev2;
    const velocity3 = prev2 - prev3;

    const avgVelocity = (velocity1 + velocity2 + velocity3) / 3;

    // Calculate momentum (acceleration)
    const momentum = velocity1 - avgVelocity;

    // Calculate overall score (weighted by recency)
    const score = current * 1.0 + prev1 * 0.5 + prev2 * 0.25 + prev3 * 0.125;

    // Determine trend direction
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (avgVelocity > 2) {
      trend = 'up';
    } else if (avgVelocity < -1) {
      trend = 'down';
    }

    return {
      score,
      velocity: avgVelocity,
      momentum,
      trend,
    };
  }

  /**
   * Predict future trends
   */
  async predictTrends(itemId: string, itemType: string): Promise<TrendPrediction | null> {
    try {
      // Get historical data
      const thirtyDaysAgo = subDays(new Date(), 30);
      let historicalData: any[] = [];

      switch (itemType) {
        case 'ad':
          historicalData = await prisma.adImpression.findMany({
            where: {
              adId: itemId,
              viewedAt: { gte: thirtyDaysAgo },
            },
            orderBy: { viewedAt: 'asc' },
          });
          break;
        case 'room':
          historicalData = await prisma.roomParticipant.findMany({
            where: {
              roomId: itemId,
              joinedAt: { gte: thirtyDaysAgo },
            },
            orderBy: { joinedAt: 'asc' },
          });
          break;
        case 'product':
          historicalData = await prisma.contentView.findMany({
            where: {
              targetType: 'product',
              targetId: itemId,
              createdAt: { gte: thirtyDaysAgo },
            },
            orderBy: { createdAt: 'asc' },
          });
          break;
        default:
          return null;
      }

      if (historicalData.length < 10) {
        return null; // Not enough data
      }

      // Group by day
      const dailyCounts: Record<string, number> = {};
      for (const item of historicalData) {
        const date = (item.viewedAt || item.joinedAt || item.createdAt).toISOString().split('T')[0];
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      }

      const values = Object.values(dailyCounts);
      
      // Simple linear regression for prediction
      const n = values.length;
      const x = Array.from({ length: n }, (_, i) => i);
      const y = values;

      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((a, _, i) => a + x[i] * y[i], 0);
      const sumXX = x.reduce((a, _, i) => a + x[i] * x[i], 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Predict next 7 days
      const predictions = [];
      for (let i = 1; i <= 7; i++) {
        predictions.push(slope * (n + i) + intercept);
      }

      // Calculate confidence based on R-squared
      const meanY = sumY / n;
      const ssTotal = y.reduce((a, b) => a + Math.pow(b - meanY, 2), 0);
      const ssResidual = y.reduce((a, _, i) => a + Math.pow(y[i] - (slope * x[i] + intercept), 2), 0);
      const rSquared = 1 - (ssResidual / ssTotal);

      // Find peak
      const maxPrediction = Math.max(...predictions);
      const peakDay = predictions.indexOf(maxPrediction) + 1;

      return {
        itemId,
        itemType,
        predictedScore: maxPrediction,
        confidence: rSquared,
        peakTime: new Date(Date.now() + peakDay * 24 * 60 * 60 * 1000),
        duration: 7, // days
        factors: [
          `Based on ${n} days of historical data`,
          `Trend ${slope > 0 ? 'upward' : 'downward'}`,
          `R² = ${rSquared.toFixed(2)}`,
        ],
      };
    } catch (error) {
      logger.error('Error predicting trends:', error);
      return null;
    }
  }

  /**
   * Get trend categories
   */
  async getTrendCategories(): Promise<string[]> {
    try {
      const cacheKey = 'ai:trend:categories';
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get categories from various sources
      const [adCategories, roomCategories, productCategories] = await Promise.all([
        prisma.ad.groupBy({
          by: ['type'],
          where: { status: 'ACTIVE' },
          _count: true,
        }),
        prisma.room.groupBy({
          by: ['roomType'],
          where: { status: 'live' },
          _count: true,
        }),
        prisma.productCategory.findMany({
          select: { name: true },
        }),
      ]);

      const categories = [
        ...adCategories.map(c => c.type),
        ...roomCategories.map(c => c.roomType),
        ...productCategories.map(c => c.name),
      ];

      await redis.setex(cacheKey, 3600, JSON.stringify(categories));
      return categories;
    } catch (error) {
      logger.error('Error getting trend categories:', error);
      return [];
    }
  }

  /**
   * Get trend insights
   */
  async getTrendInsights(): Promise<any> {
    try {
      const trending = await this.getTrendingItems(undefined, undefined, 10);
      
      return {
        timestamp: new Date(),
        topTrends: trending.slice(0, 5),
        insights: trending.map(t => ({
          item: t.name,
          trend: t.trend,
          velocity: t.velocity.toFixed(2),
          reason: this.generateInsight(t),
        })),
      };
    } catch (error) {
      logger.error('Error getting trend insights:', error);
      throw error;
    }
  }

  /**
   * Generate insight text
   */
  private generateInsight(trend: TrendData): string {
    if (trend.velocity > 10) {
      return `Rapidly gaining popularity with ${trend.velocity.toFixed(1)} engagements per hour`;
    } else if (trend.velocity > 5) {
      return `Steady growth with ${trend.velocity.toFixed(1)} new engagements per hour`;
    } else if (trend.velocity < -5) {
      return `Declining interest, down ${Math.abs(trend.velocity).toFixed(1)} per hour`;
    } else {
      return `Stable engagement levels`;
    }
  }
}

export const trendService = new TrendService();