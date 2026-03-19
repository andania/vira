/**
 * Personalization Service
 * Handles user personalization and content tailoring
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { subDays } from '@viraz/shared';

export interface UserPersonalization {
  userId: string;
  interests: Record<string, number>;
  preferences: {
    contentTypes: string[];
    categories: string[];
    languages: string[];
    notificationPreferences: Record<string, boolean>;
  };
  behavior: {
    activeHours: number[];
    activeDays: number[];
    avgSessionDuration: number;
    preferredDevice: string;
  };
  recommendations: {
    lastUpdated: Date;
    items: any[];
  };
}

export class PersonalizationService {
  /**
   * Get user personalization profile
   */
  async getUserPersonalization(userId: string): Promise<UserPersonalization> {
    try {
      // Try cache first
      const cacheKey = `ai:personalization:${userId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get user data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          preferences: true,
          engagements: {
            where: {
              createdAt: { gte: subDays(new Date(), 30) },
            },
            take: 500,
          },
          sessions: {
            where: {
              createdAt: { gte: subDays(new Date(), 30) },
            },
            take: 100,
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Calculate interests
      const interests = await this.calculateInterests(user);

      // Get preferences
      const preferences = {
        contentTypes: await this.getPreferredContentTypes(user),
        categories: await this.getPreferredCategories(user),
        languages: user.profile?.languages || ['en'],
        notificationPreferences: await this.getNotificationPreferences(user),
      };

      // Analyze behavior
      const behavior = await this.analyzeBehavior(user);

      const personalization: UserPersonalization = {
        userId,
        interests,
        preferences,
        behavior,
        recommendations: {
          lastUpdated: new Date(),
          items: [],
        },
      };

      // Cache for 1 hour
      await redis.setex(cacheKey, 3600, JSON.stringify(personalization));

      return personalization;
    } catch (error) {
      logger.error('Error getting user personalization:', error);
      throw error;
    }
  }

  /**
   * Calculate user interests based on engagement
   */
  private async calculateInterests(user: any): Promise<Record<string, number>> {
    const interests: Record<string, number> = {};

    // Explicit interests from profile
    if (user.profile?.interests) {
      for (const interest of user.profile.interests) {
        interests[interest] = (interests[interest] || 0) + 10;
      }
    }

    // Engagement-based interests
    for (const engagement of user.engagements || []) {
      const weight = this.getEngagementWeight(engagement.type);
      
      const itemDetails = await this.getItemDetails(engagement.targetType, engagement.targetId);
      if (itemDetails?.category) {
        interests[itemDetails.category] = (interests[itemDetails.category] || 0) + weight;
      }
      if (itemDetails?.tags) {
        for (const tag of itemDetails.tags) {
          interests[tag] = (interests[tag] || 0) + weight * 0.3;
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
   * Get engagement weight
   */
  private getEngagementWeight(type: string): number {
    const weights: Record<string, number> = {
      like: 2,
      comment: 3,
      share: 4,
      save: 2.5,
      click: 1.5,
      view: 1,
      purchase: 5,
    };
    return weights[type] || 1;
  }

  /**
   * Get item details
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
            brand: true,
          },
        });
        return {
          category: product?.category?.name,
          tags: [product?.brand?.name],
        };

      default:
        return null;
    }
  }

  /**
   * Get preferred content types
   */
  private async getPreferredContentTypes(user: any): Promise<string[]> {
    const typeCounts: Record<string, number> = {};

    for (const engagement of user.engagements || []) {
      typeCounts[engagement.targetType] = (typeCounts[engagement.targetType] || 0) + 1;
    }

    const sorted = Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([type]) => type);

    return sorted.slice(0, 3);
  }

  /**
   * Get preferred categories
   */
  private async getPreferredCategories(user: any): Promise<string[]> {
    const categoryCounts: Record<string, number> = {};

    for (const engagement of user.engagements || []) {
      const details = await this.getItemDetails(engagement.targetType, engagement.targetId);
      if (details?.category) {
        categoryCounts[details.category] = (categoryCounts[details.category] || 0) + 1;
      }
    }

    const sorted = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([category]) => category);

    return sorted.slice(0, 5);
  }

  /**
   * Get notification preferences
   */
  private async getNotificationPreferences(user: any): Promise<Record<string, boolean>> {
    const prefs = user.preferences || {};
    
    return {
      push: prefs.pushEnabled ?? true,
      email: prefs.emailEnabled ?? true,
      sms: prefs.smsEnabled ?? false,
      marketing: prefs.marketingEnabled ?? true,
      updates: prefs.updatesEnabled ?? true,
    };
  }

  /**
   * Analyze user behavior
   */
  private async analyzeBehavior(user: any): Promise<any> {
    const sessions = user.sessions || [];
    
    // Active hours
    const hourCounts = new Array(24).fill(0);
    let totalDuration = 0;
    const deviceCounts: Record<string, number> = {};

    for (const session of sessions) {
      const hour = new Date(session.createdAt).getHours();
      hourCounts[hour]++;

      if (session.duration) {
        totalDuration += session.duration;
      }

      if (session.deviceType) {
        deviceCounts[session.deviceType] = (deviceCounts[session.deviceType] || 0) + 1;
      }
    }

    // Find active hours (hours with > average activity)
    const avgActivity = sessions.length / 24;
    const activeHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter(h => h.count > avgActivity)
      .map(h => h.hour);

    // Find active days
    const dayCounts = new Array(7).fill(0);
    for (const session of sessions) {
      const day = new Date(session.createdAt).getDay();
      dayCounts[day]++;
    }
    
    const avgDayActivity = sessions.length / 7;
    const activeDays = dayCounts
      .map((count, day) => ({ day, count }))
      .filter(d => d.count > avgDayActivity)
      .map(d => d.day);

    // Preferred device
    let preferredDevice = 'desktop';
    let maxCount = 0;
    for (const [device, count] of Object.entries(deviceCounts)) {
      if (count > maxCount) {
        maxCount = count;
        preferredDevice = device;
      }
    }

    return {
      activeHours,
      activeDays,
      avgSessionDuration: sessions.length > 0 ? totalDuration / sessions.length : 0,
      preferredDevice,
    };
  }

  /**
   * Update personalization based on new interaction
   */
  async updatePersonalization(userId: string, interaction: {
    type: string;
    targetType: string;
    targetId: string;
  }): Promise<void> {
    try {
      // Invalidate cache
      await redis.del(`ai:personalization:${userId}`);
      
      // Update real-time signals (for future use)
      const signalKey = `ai:signals:${userId}`;
      await redis.lpush(signalKey, JSON.stringify({
        ...interaction,
        timestamp: new Date(),
      }));
      await redis.ltrim(signalKey, 0, 99); // Keep last 100 signals

      logger.debug(`Personalization updated for user ${userId}`);
    } catch (error) {
      logger.error('Error updating personalization:', error);
    }
  }

  /**
   * Get personalized feed order
   */
  async personalizeFeed(userId: string, items: any[]): Promise<any[]> {
    try {
      const personalization = await this.getUserPersonalization(userId);

      // Score each item based on personalization
      const scoredItems = items.map(item => {
        let score = 50; // Base score

        // Boost based on interests
        if (item.category && personalization.interests[item.category]) {
          score += personalization.interests[item.category] * 30;
        }

        // Boost based on preferred content types
        if (personalization.preferences.contentTypes.includes(item.type)) {
          score += 10;
        }

        // Time-based boost (active hours)
        const hour = new Date().getHours();
        if (personalization.behavior.activeHours.includes(hour)) {
          score += 5;
        }

        return { ...item, score };
      });

      return scoredItems.sort((a, b) => b.score - a.score);
    } catch (error) {
      logger.error('Error personalizing feed:', error);
      return items;
    }
  }

  /**
   * Get personalized search results
   */
  async personalizeSearch(userId: string, results: any[]): Promise<any[]> {
    try {
      const personalization = await this.getUserPersonalization(userId);

      // Boost results that match user interests
      return results.map(result => {
        let boost = 1.0;

        if (result.category && personalization.interests[result.category]) {
          boost += personalization.interests[result.category] * 0.5;
        }

        return {
          ...result,
          score: result.score * boost,
        };
      }).sort((a, b) => b.score - a.score);
    } catch (error) {
      logger.error('Error personalizing search:', error);
      return results;
    }
  }

  /**
   * Get personalized notifications
   */
  async getPersonalizedNotifications(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const personalization = await this.getUserPersonalization(userId);

      // Get recent notifications
      const notifications = await prisma.notification.findMany({
        where: { userId, isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      // Filter and score based on preferences
      const scored = notifications
        .filter(n => personalization.preferences.notificationPreferences[n.type])
        .map(n => ({
          ...n,
          score: this.scoreNotification(n, personalization),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return scored;
    } catch (error) {
      logger.error('Error getting personalized notifications:', error);
      return [];
    }
  }

  /**
   * Score notification for personalization
   */
  private scoreNotification(notification: any, personalization: UserPersonalization): number {
    let score = 50;

    // Priority boost
    if (notification.priority === 'high') {
      score += 30;
    }

    // Type preference boost
    const typePref = personalization.preferences.notificationPreferences[notification.type];
    if (typePref) {
      score += 10;
    }

    // Recency boost
    const ageInHours = (Date.now() - new Date(notification.createdAt).getTime()) / (1000 * 60 * 60);
    score += Math.max(0, 20 - ageInHours);

    return score;
  }

  /**
   * Get user segments for targeting
   */
  async getUserSegments(userId: string): Promise<string[]> {
    try {
      const personalization = await this.getUserPersonalization(userId);
      const segments: string[] = [];

      // Interest-based segments
      const topInterests = Object.entries(personalization.interests)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([interest]) => interest);

      segments.push(...topInterests.map(i => `interest:${i}`));

      // Behavior-based segments
      if (personalization.behavior.activeHours.length > 12) {
        segments.push('behavior:highly_active');
      }

      if (personalization.behavior.preferredDevice) {
        segments.push(`device:${personalization.behavior.preferredDevice}`);
      }

      // Preference-based segments
      if (personalization.preferences.contentTypes.includes('ad')) {
        segments.push('pref:ad_engager');
      }

      if (personalization.preferences.contentTypes.includes('room')) {
        segments.push('pref:room_visitor');
      }

      return segments;
    } catch (error) {
      logger.error('Error getting user segments:', error);
      return [];
    }
  }
}

export const personalizationService = new PersonalizationService();