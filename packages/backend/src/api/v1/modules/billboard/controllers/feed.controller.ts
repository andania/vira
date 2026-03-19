/**
 * Feed Controller
 * Handles HTTP requests for feed generation
 */

import { Request, Response } from 'express';
import { feedService } from '../services/feed.service';
import { recommendationService } from '../services/recommendation.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class FeedController {
  /**
   * Get main feed
   */
  async getFeed(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const type = req.query.type as string || 'all';
      const categories = req.query.categories ? (req.query.categories as string).split(',') : undefined;

      let location;
      if (req.query.lat && req.query.lng) {
        location = {
          latitude: parseFloat(req.query.lat as string),
          longitude: parseFloat(req.query.lng as string),
          radius: req.query.radius ? parseInt(req.query.radius as string) : undefined,
        };
      }

      const feed = await feedService.generateFeed({
        userId,
        limit,
        offset,
        categories,
        type: type as any,
        location,
      });

      return res.json({
        success: true,
        data: {
          items: feed,
          pagination: {
            limit,
            offset,
            hasMore: feed.length === limit,
          },
        },
      });
    } catch (error) {
      logger.error('Error in getFeed:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to generate feed',
        },
      });
    }
  }

  /**
   * Get trending feed
   */
  async getTrending(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const feed = await feedService.generateFeed({
        userId: req.user?.id || 'anonymous',
        limit,
        offset,
        type: 'trending',
      });

      return res.json({
        success: true,
        data: feed,
      });
    } catch (error) {
      logger.error('Error in getTrending:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get trending content',
        },
      });
    }
  }

  /**
   * Get recommended feed
   */
  async getRecommended(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const feed = await feedService.generateFeed({
        userId,
        limit,
        offset,
        type: 'recommended',
      });

      return res.json({
        success: true,
        data: feed,
      });
    } catch (error) {
      logger.error('Error in getRecommended:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get recommendations',
        },
      });
    }
  }

  /**
   * Get nearby feed
   */
  async getNearby(req: Request, res: Response) {
    try {
      const { lat, lng, radius } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Latitude and longitude are required',
          },
        });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const feed = await feedService.generateFeed({
        userId: req.user?.id || 'anonymous',
        limit,
        offset,
        type: 'nearby',
        location: {
          latitude: parseFloat(lat as string),
          longitude: parseFloat(lng as string),
          radius: radius ? parseInt(radius as string) : undefined,
        },
      });

      return res.json({
        success: true,
        data: feed,
      });
    } catch (error) {
      logger.error('Error in getNearby:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get nearby content',
        },
      });
    }
  }

  /**
   * Get feed by category
   */
  async getByCategory(req: Request, res: Response) {
    try {
      const { category } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const feed = await feedService.generateFeed({
        userId: req.user?.id || 'anonymous',
        limit,
        offset,
        categories: [category],
      });

      return res.json({
        success: true,
        data: feed,
      });
    } catch (error) {
      logger.error('Error in getByCategory:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get category feed',
        },
      });
    }
  }

  /**
   * Refresh feed cache
   */
  async refreshFeed(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await recommendationService.refreshUserCache(userId);

      return res.json({
        success: true,
        message: 'Feed cache refreshed',
      });
    } catch (error) {
      logger.error('Error in refreshFeed:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to refresh feed',
        },
      });
    }
  }
}

export const feedController = new FeedController();