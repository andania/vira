/**
 * Billboard Repository
 * Handles database operations for billboard data aggregation
 */

import { prisma } from '../../../../../core/database/client';
import { BaseRepository } from '../../../../../core/database/repositories/base.repository';
import { Prisma } from '@prisma/client';

export interface BillboardStats {
  totalAds: number;
  totalLiveRooms: number;
  totalCampaigns: number;
  totalProducts: number;
  totalBrands: number;
  activeUsers: number;
  viewsToday: number;
  clicksToday: number;
}

export interface TrendingItem {
  id: string;
  type: 'ad' | 'room' | 'campaign' | 'product' | 'brand';
  score: number;
  views: number;
  engagements: number;
  trend: 'up' | 'down' | 'stable';
  period: 'hour' | 'day' | 'week';
}

export class BillboardRepository extends BaseRepository<any, any, any> {
  protected modelName = 'billboard';
  protected prismaModel = prisma.billboard;

  /**
   * Get billboard statistics
   */
  async getStats(): Promise<BillboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalAds,
      totalLiveRooms,
      totalCampaigns,
      totalProducts,
      totalBrands,
      activeUsers,
      viewsToday,
      clicksToday,
    ] = await Promise.all([
      // Total active ads
      prisma.ad.count({
        where: { status: 'ACTIVE' },
      }),

      // Total live rooms
      prisma.room.count({
        where: {
          status: 'live',
          visibility: 'public',
        },
      }),

      // Total active campaigns
      prisma.campaign.count({
        where: {
          status: 'ACTIVE',
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      }),

      // Total active products
      prisma.product.count({
        where: { status: 'ACTIVE' },
      }),

      // Total active brands
      prisma.brand.count({
        where: { isActive: true },
      }),

      // Active users today
      prisma.userSession.count({
        where: {
          lastActivity: { gte: today },
        },
      }),

      // Views today
      prisma.adImpression.count({
        where: {
          viewedAt: { gte: today },
        },
      }),

      // Clicks today
      prisma.adClick.count({
        where: {
          clickedAt: { gte: today },
        },
      }),
    ]);

    return {
      totalAds,
      totalLiveRooms,
      totalCampaigns,
      totalProducts,
      totalBrands,
      activeUsers,
      viewsToday,
      clicksToday,
    };
  }

  /**
   * Get trending items across all types
   */
  async getTrendingItems(limit: number = 20): Promise<TrendingItem[]> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get trending ads
    const trendingAds = await prisma.$queryRaw`
      SELECT 
        a.id,
        'ad' as type,
        COUNT(DISTINCT i.id) as views,
        COUNT(DISTINCT c.id) as clicks,
        COUNT(DISTINCT e.id) as engagements,
        COUNT(DISTINCT CASE WHEN i.viewed_at >= ${oneHourAgo} THEN i.id END) as hour_views,
        COUNT(DISTINCT CASE WHEN i.viewed_at >= ${oneDayAgo} THEN i.id END) as day_views
      FROM ads a
      LEFT JOIN ad_impressions i ON a.id = i.ad_id AND i.viewed_at >= ${oneWeekAgo}
      LEFT JOIN ad_clicks c ON a.id = c.ad_id AND c.clicked_at >= ${oneWeekAgo}
      LEFT JOIN user_engagements e ON e.target_type = 'ad' AND e.target_id = a.id AND e.created_at >= ${oneWeekAgo}
      WHERE a.status = 'ACTIVE'
      GROUP BY a.id
      ORDER BY views DESC
      LIMIT ${limit}
    `;

    // Get trending rooms
    const trendingRooms = await prisma.$queryRaw`
      SELECT 
        r.id,
        'room' as type,
        COUNT(DISTINCT p.id) as participants,
        COUNT(DISTINCT m.id) as messages,
        COUNT(DISTINCT CASE WHEN p.joined_at >= ${oneHourAgo} THEN p.id END) as hour_participants
      FROM rooms r
      LEFT JOIN room_participants p ON r.id = p.room_id AND p.joined_at >= ${oneWeekAgo}
      LEFT JOIN room_messages m ON r.id = m.room_id AND m.created_at >= ${oneWeekAgo}
      WHERE r.status = 'live' AND r.visibility = 'public'
      GROUP BY r.id
      ORDER BY participants DESC
      LIMIT ${limit}
    `;

    // Get trending campaigns
    const trendingCampaigns = await prisma.$queryRaw`
      SELECT 
        c.id,
        'campaign' as type,
        COUNT(DISTINCT a.id) as ads,
        COUNT(DISTINCT i.id) as impressions,
        COUNT(DISTINCT e.id) as engagements
      FROM campaigns c
      LEFT JOIN ads a ON c.id = a.campaign_id
      LEFT JOIN ad_impressions i ON a.id = i.ad_id AND i.viewed_at >= ${oneWeekAgo}
      LEFT JOIN user_engagements e ON e.target_type = 'campaign' AND e.target_id = c.id AND e.created_at >= ${oneWeekAgo}
      WHERE c.status = 'ACTIVE'
      GROUP BY c.id
      ORDER BY impressions DESC
      LIMIT ${limit}
    `;

    // Get trending products
    const trendingProducts = await prisma.$queryRaw`
      SELECT 
        p.id,
        'product' as type,
        p.views_count as views,
        COUNT(DISTINCT o.id) as orders,
        COUNT(DISTINCT r.id) as reviews
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.placed_at >= ${oneWeekAgo}
      LEFT JOIN product_reviews r ON p.id = r.product_id AND r.created_at >= ${oneWeekAgo}
      WHERE p.status = 'ACTIVE'
      GROUP BY p.id, p.views_count
      ORDER BY views DESC
      LIMIT ${limit}
    `;

    // Combine and process results
    const allTrending = [
      ...(trendingAds as any[]).map(item => this.calculateTrendScore(item, 'hour_views', 'day_views')),
      ...(trendingRooms as any[]).map(item => this.calculateTrendScore(item, 'hour_participants', 'participants')),
      ...(trendingCampaigns as any[]).map(item => this.calculateTrendScore(item, 'impressions', 'impressions')),
      ...(trendingProducts as any[]).map(item => this.calculateTrendScore(item, 'views', 'views')),
    ];

    // Sort by score and return top results
    return allTrending
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Calculate trend score for an item
   */
  private calculateTrendScore(
    item: any,
    recentField: string,
    totalField: string
  ): TrendingItem {
    const recent = Number(item[recentField]) || 0;
    const total = Number(item[totalField]) || 0;
    
    // Calculate trend direction
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (total > 0) {
      const recentRatio = recent / total;
      if (recentRatio > 0.3) trend = 'up';
      else if (recentRatio < 0.1) trend = 'down';
    }

    // Calculate score (weighted combination of recent and total)
    const score = (recent * 3) + (total * 0.5);

    return {
      id: item.id,
      type: item.type,
      score,
      views: total,
      engagements: item.engagements || item.messages || item.orders || 0,
      trend,
      period: 'day',
    };
  }

  /**
   * Get items by category with pagination
   */
  async getItemsByCategory(
    category: string,
    type?: string,
    limit: number = 20,
    offset: number = 0
  ) {
    const where: any = {};

    if (type === 'ad') {
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
          },
        },
        take: limit,
        skip: offset,
      });
    }

    if (type === 'room') {
      return prisma.room.findMany({
        where: {
          status: 'live',
          visibility: 'public',
          brand: {
            industry: category,
          },
        },
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
        take: limit,
        skip: offset,
      });
    }

    if (type === 'product') {
      return prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          brand: {
            industry: category,
          },
        },
        include: {
          brand: true,
          images: {
            take: 1,
          },
        },
        take: limit,
        skip: offset,
      });
    }

    // If no type specified, return mixed results
    const [ads, rooms, products] = await Promise.all([
      prisma.ad.findMany({
        where: {
          status: 'ACTIVE',
          campaign: {
            brand: {
              industry: category,
            },
          },
        },
        take: Math.ceil(limit * 0.4),
      }),
      prisma.room.findMany({
        where: {
          status: 'live',
          visibility: 'public',
          brand: {
            industry: category,
          },
        },
        take: Math.ceil(limit * 0.3),
      }),
      prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          brand: {
            industry: category,
          },
        },
        take: Math.ceil(limit * 0.3),
      }),
    ]);

    return {
      ads,
      rooms,
      products,
    };
  }

  /**
   * Get featured items for hero section
   */
  async getFeaturedItems(limit: number = 5) {
    const [featuredAds, featuredRooms, featuredCampaigns] = await Promise.all([
      prisma.ad.findMany({
        where: {
          status: 'ACTIVE',
          campaign: {
            status: 'ACTIVE',
          },
        },
        include: {
          campaign: {
            include: {
              brand: true,
            },
          },
          assets: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: Math.ceil(limit * 0.4),
      }),
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
          },
        },
        orderBy: {
          participants: {
            _count: 'desc',
          },
        },
        take: Math.ceil(limit * 0.3),
      }),
      prisma.campaign.findMany({
        where: {
          status: 'ACTIVE',
          isFeatured: true,
        },
        include: {
          brand: true,
        },
        take: Math.ceil(limit * 0.3),
      }),
    ]);

    // Interleave results for variety
    const featured = [];
    const maxLength = Math.max(
      featuredAds.length,
      featuredRooms.length,
      featuredCampaigns.length
    );

    for (let i = 0; i < maxLength; i++) {
      if (i < featuredAds.length) {
        featured.push({
          ...featuredAds[i],
          type: 'ad',
          priority: 1,
        });
      }
      if (i < featuredRooms.length) {
        featured.push({
          ...featuredRooms[i],
          type: 'room',
          priority: 2,
        });
      }
      if (i < featuredCampaigns.length) {
        featured.push({
          ...featuredCampaigns[i],
          type: 'campaign',
          priority: 3,
        });
      }
    }

    return featured.slice(0, limit);
  }

  /**
   * Get items by location (geographic)
   */
  async getItemsByLocation(
    latitude: number,
    longitude: number,
    radius: number = 50,
    limit: number = 20
  ) {
    // Find nearby rooms using PostGIS
    const nearbyRooms = await prisma.$queryRaw`
      SELECT 
        r.*,
        b.name as brand_name,
        b.logo_url as brand_logo,
        ST_Distance(
          ST_MakePoint(${longitude}, ${latitude})::geography,
          bl.coordinates::geography
        ) as distance
      FROM rooms r
      JOIN brands b ON r.brand_id = b.id
      JOIN brand_locations bl ON b.id = bl.brand_id
      WHERE r.status = 'live'
        AND r.visibility = 'public'
        AND ST_DWithin(
          ST_MakePoint(${longitude}, ${latitude})::geography,
          bl.coordinates::geography,
          ${radius * 1000}
        )
      ORDER BY distance
      LIMIT ${limit}
    `;

    // Find nearby campaigns
    const nearbyCampaigns = await prisma.$queryRaw`
      SELECT 
        c.*,
        b.name as brand_name,
        b.logo_url as brand_logo,
        ST_Distance(
          ST_MakePoint(${longitude}, ${latitude})::geography,
          bl.coordinates::geography
        ) as distance
      FROM campaigns c
      JOIN brands b ON c.brand_id = b.id
      JOIN brand_locations bl ON b.id = bl.brand_id
      WHERE c.status = 'ACTIVE'
        AND ST_DWithin(
          ST_MakePoint(${longitude}, ${latitude})::geography,
          bl.coordinates::geography,
          ${radius * 1000}
        )
      ORDER BY distance
      LIMIT ${limit}
    `;

    return {
      rooms: nearbyRooms,
      campaigns: nearbyCampaigns,
    };
  }

  /**
   * Get personalized feed for user based on interests
   */
  async getPersonalizedFeed(userId: string, limit: number = 50) {
    // Get user interests
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        preferences: true,
      },
    });

    const interests = user?.profile?.interests || [];

    if (interests.length === 0) {
      // Return popular content if no interests
      return this.getTrendingItems(limit);
    }

    // Get content matching interests
    const [matchingAds, matchingRooms, matchingProducts] = await Promise.all([
      prisma.ad.findMany({
        where: {
          status: 'ACTIVE',
          campaign: {
            brand: {
              industry: { in: interests },
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
        take: Math.ceil(limit * 0.4),
      }),
      prisma.room.findMany({
        where: {
          status: 'live',
          visibility: 'public',
          brand: {
            industry: { in: interests },
          },
        },
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
        take: Math.ceil(limit * 0.3),
      }),
      prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          brand: {
            industry: { in: interests },
          },
        },
        include: {
          brand: true,
          images: {
            take: 1,
          },
        },
        take: Math.ceil(limit * 0.3),
      }),
    ]);

    // Combine and return
    return [
      ...matchingAds.map(ad => ({ ...ad, type: 'ad' })),
      ...matchingRooms.map(room => ({ ...room, type: 'room' })),
      ...matchingProducts.map(product => ({ ...product, type: 'product' })),
    ].slice(0, limit);
  }

  /**
   * Record billboard view
   */
  async recordView(userId: string | undefined, section: string, itemId?: string) {
    return prisma.billboardView.create({
      data: {
        userId,
        section,
        itemId,
        viewedAt: new Date(),
      },
    });
  }

  /**
   * Get billboard view statistics
   */
  async getViewStats(startDate: Date, endDate: Date) {
    const views = await prisma.billboardView.groupBy({
      by: ['section'],
      where: {
        viewedAt: { gte: startDate, lte: endDate },
      },
      _count: true,
    });

    const totalViews = await prisma.billboardView.count({
      where: {
        viewedAt: { gte: startDate, lte: endDate },
      },
    });

    return {
      total: totalViews,
      bySection: views.map(v => ({
        section: v.section,
        count: v._count,
      })),
    };
  }

  /**
   * Clear billboard cache
   */
  async clearCache(): Promise<void> {
    // This would be handled by Redis, but keeping for completeness
    return Promise.resolve();
  }
}

export const billboardRepository = new BillboardRepository();