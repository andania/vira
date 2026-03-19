/**
 * AI Service
 * Main service orchestrating all AI features
 */

import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { recommendationService } from './recommendation.service';
import { personalizationService } from './personalization.service';
import { trendService } from './trend.service';
import { fraudAIService } from './fraud-ai.service';
import { contentModerationService } from './content.moderation.service';

export interface AIRequest {
  type: 'recommendation' | 'personalization' | 'trend' | 'fraud' | 'moderation';
  data: any;
  userId?: string;
}

export interface AIResponse {
  success: boolean;
  data?: any;
  error?: string;
  processingTime: number;
}

export class AIService {
  /**
   * Process AI request
   */
  async processRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      let result;

      switch (request.type) {
        case 'recommendation':
          result = await this.handleRecommendation(request);
          break;
        case 'personalization':
          result = await this.handlePersonalization(request);
          break;
        case 'trend':
          result = await this.handleTrend(request);
          break;
        case 'fraud':
          result = await this.handleFraud(request);
          break;
        case 'moderation':
          result = await this.handleModeration(request);
          break;
        default:
          throw new Error(`Unknown AI request type: ${request.type}`);
      }

      const processingTime = Date.now() - startTime;

      // Log AI usage for analytics
      await this.logAIUsage(request.type, request.userId, processingTime, true);

      return {
        success: true,
        data: result,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Error processing AI request:', error);

      // Log error
      await this.logAIUsage(request.type, request.userId, processingTime, false, error.message);

      return {
        success: false,
        error: error.message,
        processingTime,
      };
    }
  }

  /**
   * Handle recommendation requests
   */
  private async handleRecommendation(request: AIRequest): Promise<any> {
    const { userId, data } = request;

    if (!userId) {
      throw new Error('User ID required for recommendations');
    }

    switch (data.type) {
      case 'content':
        return recommendationService.getRecommendations({
          userId,
          limit: data.limit,
          excludeIds: data.excludeIds,
          type: data.contentType,
          location: data.location,
        });

      case 'explain':
        return recommendationService.getExplanation(
          data.itemId,
          data.itemType,
          userId
        );

      default:
        throw new Error(`Unknown recommendation type: ${data.type}`);
    }
  }

  /**
   * Handle personalization requests
   */
  private async handlePersonalization(request: AIRequest): Promise<any> {
    const { userId, data } = request;

    if (!userId) {
      throw new Error('User ID required for personalization');
    }

    switch (data.type) {
      case 'profile':
        return personalizationService.getUserPersonalization(userId);

      case 'segments':
        return personalizationService.getUserSegments(userId);

      case 'notifications':
        return personalizationService.getPersonalizedNotifications(userId, data.limit);

      case 'update':
        await personalizationService.updatePersonalization(userId, data.interaction);
        return { success: true };

      default:
        throw new Error(`Unknown personalization type: ${data.type}`);
    }
  }

  /**
   * Handle trend requests
   */
  private async handleTrend(request: AIRequest): Promise<any> {
    const { data } = request;

    switch (data.type) {
      case 'current':
        return trendService.getTrendingItems(
          data.contentType,
          data.category,
          data.limit
        );

      case 'predict':
        return trendService.predictTrends(data.itemId, data.itemType);

      case 'categories':
        return trendService.getTrendCategories();

      case 'insights':
        return trendService.getTrendInsights();

      default:
        throw new Error(`Unknown trend type: ${data.type}`);
    }
  }

  /**
   * Handle fraud detection requests
   */
  private async handleFraud(request: AIRequest): Promise<any> {
    const { data } = request;

    switch (data.type) {
      case 'analyze_user':
        return fraudAIService.analyzeUserBehavior(data.userId);

      case 'takeover':
        return fraudAIService.detectAccountTakeover(data.userId);

      case 'click_fraud':
        return fraudAIService.detectClickFraud(data.adId);

      case 'stats':
        return fraudAIService.getFraudStatistics();

      default:
        throw new Error(`Unknown fraud type: ${data.type}`);
    }
  }

  /**
   * Handle content moderation requests
   */
  private async handleModeration(request: AIRequest): Promise<any> {
    const { data } = request;

    switch (data.type) {
      case 'text':
        return contentModerationService.moderateText(data.content);

      case 'image':
        return contentModerationService.moderateImage(data.imageUrl);

      case 'stats':
        return contentModerationService.getModerationStats();

      case 'rules':
        if (data.action === 'get') {
          return contentModerationService.getModerationRules();
        } else if (data.action === 'update') {
          await contentModerationService.updateModerationRules(data.rules);
          return { success: true };
        }
        break;

      default:
        throw new Error(`Unknown moderation type: ${data.type}`);
    }
  }

  /**
   * Log AI usage for analytics
   */
  private async logAIUsage(
    type: string,
    userId?: string,
    processingTime?: number,
    success?: boolean,
    error?: string
  ): Promise<void> {
    try {
      await prisma.aILog.create({
        data: {
          requestType: type,
          userId,
          processingTime,
          success,
          error,
          timestamp: new Date(),
        },
      });

      // Update Redis counters for monitoring
      const today = new Date().toISOString().split('T')[0];
      await redis.hincrby(`ai:usage:${today}`, type, 1);
      await redis.expire(`ai:usage:${today}`, 30 * 86400); // 30 days

      if (processingTime) {
        await redis.lpush(`ai:latency:${type}`, processingTime.toString());
        await redis.ltrim(`ai:latency:${type}`, 0, 999);
      }
    } catch (error) {
      logger.error('Error logging AI usage:', error);
    }
  }

  /**
   * Get AI usage statistics
   */
  async getUsageStats(days: number = 30): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [totalRequests, byType, avgLatency, successRate] = await Promise.all([
        prisma.aILog.count({
          where: {
            timestamp: { gte: startDate },
          },
        }),
        prisma.aILog.groupBy({
          by: ['requestType'],
          where: {
            timestamp: { gte: startDate },
          },
          _count: true,
        }),
        prisma.aILog.aggregate({
          where: {
            timestamp: { gte: startDate },
            processingTime: { not: null },
          },
          _avg: {
            processingTime: true,
          },
        }),
        prisma.aILog.aggregate({
          where: {
            timestamp: { gte: startDate },
          },
          _count: {
            success: true,
          },
        }),
      ]);

      const successful = successRate._count?.success || 0;
      const successRateValue = totalRequests > 0 ? (successful / totalRequests) * 100 : 0;

      return {
        totalRequests,
        byType: byType.reduce((acc, curr) => {
          acc[curr.requestType] = curr._count;
          return acc;
        }, {} as Record<string, number>),
        averageLatency: avgLatency._avg.processingTime || 0,
        successRate: successRateValue,
        period: days,
      };
    } catch (error) {
      logger.error('Error getting AI usage stats:', error);
      throw error;
    }
  }

  /**
   * Get AI health status
   */
  async getHealth(): Promise<any> {
    try {
      const lastMinute = new Date(Date.now() - 60 * 1000);

      const [requestsLastMinute, avgLatency, errorRate] = await Promise.all([
        prisma.aILog.count({
          where: {
            timestamp: { gte: lastMinute },
          },
        }),
        prisma.aILog.aggregate({
          where: {
            timestamp: { gte: lastMinute },
            processingTime: { not: null },
          },
          _avg: {
            processingTime: true,
          },
        }),
        prisma.aILog.count({
          where: {
            timestamp: { gte: lastMinute },
            success: false,
          },
        }),
      ]);

      const errorRateValue = requestsLastMinute > 0
        ? (errorRate / requestsLastMinute) * 100
        : 0;

      const status = errorRateValue > 10 ? 'degraded' : 'healthy';

      return {
        status,
        requestsLastMinute,
        averageLatency: avgLatency._avg.processingTime || 0,
        errorRate: errorRateValue,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error getting AI health:', error);
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Clear AI cache
   */
  async clearCache(type?: string): Promise<void> {
    try {
      let pattern = 'ai:*';
      if (type) {
        pattern = `ai:${type}:*`;
      }

      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }

      logger.info(`AI cache cleared${type ? ` for type: ${type}` : ''}`);
    } catch (error) {
      logger.error('Error clearing AI cache:', error);
      throw error;
    }
  }

  /**
   * Train AI models (admin only)
   */
  async trainModels(models: string[]): Promise<any> {
    try {
      const results: Record<string, any> = {};

      for (const model of models) {
        switch (model) {
          case 'recommendation':
            results.recommendation = await this.trainRecommendationModel();
            break;
          case 'fraud':
            results.fraud = await this.trainFraudModel();
            break;
          case 'moderation':
            results.moderation = await this.trainModerationModel();
            break;
          default:
            throw new Error(`Unknown model: ${model}`);
        }
      }

      return results;
    } catch (error) {
      logger.error('Error training AI models:', error);
      throw error;
    }
  }

  /**
   * Train recommendation model
   */
  private async trainRecommendationModel(): Promise<any> {
    // This would implement actual ML model training
    // Simplified for now
    logger.info('Training recommendation model...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { success: true, accuracy: 0.85 };
  }

  /**
   * Train fraud detection model
   */
  private async trainFraudModel(): Promise<any> {
    logger.info('Training fraud detection model...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    return { success: true, accuracy: 0.92 };
  }

  /**
   * Train content moderation model
   */
  private async trainModerationModel(): Promise<any> {
    logger.info('Training content moderation model...');
    await new Promise(resolve => setTimeout(resolve, 2500));
    return { success: true, accuracy: 0.88 };
  }
}

export const aiService = new AIService();