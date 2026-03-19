/**
 * Billboard Controller
 * Handles HTTP requests for main billboard operations
 */

import { Request, Response } from 'express';
import { billboardService } from '../services/billboard.service';
import { feedService } from '../services/feed.service';
import { recommendationService } from '../services/recommendation.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class BillboardController {
  /**
   * Get complete billboard
   */
  async getBillboard(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      let location;
      if (req.query.lat && req.query.lng) {
        location = {
          latitude: parseFloat(req.query.lat as string),
          longitude: parseFloat(req.query.lng as string),
          radius: req.query.radius ? parseInt(req.query.radius as string) : undefined,
        };
      }

      const sections = await billboardService.getBillboard({
        userId,
        limit,
        offset,
        location,
      });

      const greeting = billboardService.getTimeBasedGreeting(req.user?.profile?.displayName);

      return res.json({
        success: true,
        data: {
          greeting,
          sections,
        },
      });
    } catch (error) {
      logger.error('Error in getBillboard:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to load billboard',
        },
      });
    }
  }

  /**
   * Get single billboard section
   */
  async getSection(req: Request, res: Response) {
    try {
      const { sectionId } = req.params;
      const userId = req.user?.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      let location;
      if (req.query.lat && req.query.lng) {
        location = {
          latitude: parseFloat(req.query.lat as string),
          longitude: parseFloat(req.query.lng as string),
          radius: req.query.radius ? parseInt(req.query.radius as string) : undefined,
        };
      }

      const section = await billboardService.getSection(sectionId, {
        userId,
        limit,
        location,
      });

      if (!section) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'Section not found',
          },
        });
      }

      return res.json({
        success: true,
        data: section,
      });
    } catch (error) {
      logger.error('Error in getSection:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to load section',
        },
      });
    }
  }

  /**
   * Get billboard stats
   */
  async getStats(req: Request, res: Response) {
    try {
      const stats = await billboardService.getBillboardStats();

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getStats:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get billboard stats',
        },
      });
    }
  }

  /**
   * Track billboard interaction
   */
  async trackInteraction(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { itemId, itemType, action } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      if (!itemId || !itemType || !action) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Item ID, type, and action are required',
          },
        });
      }

      await billboardService.trackInteraction(userId, itemId, itemType, action);

      return res.json({
        success: true,
        message: 'Interaction tracked',
      });
    } catch (error) {
      logger.error('Error in trackInteraction:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to track interaction',
        },
      });
    }
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(req: Request, res: Response) {
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
      const excludeIds = req.query.exclude ? (req.query.exclude as string).split(',') : [];

      let location;
      if (req.query.lat && req.query.lng) {
        location = {
          latitude: parseFloat(req.query.lat as string),
          longitude: parseFloat(req.query.lng as string),
        };
      }

      const recommendations = await recommendationService.getRecommendations({
        userId,
        limit,
        excludeIds,
        context: {
          timeOfDay: this.getTimeOfDay(),
          device: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop',
          location,
        },
      });

      return res.json({
        success: true,
        data: recommendations,
      });
    } catch (error) {
      logger.error('Error in getRecommendations:', error);
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
   * Get recommendation explanation
   */
  async getRecommendationExplanation(req: Request, res: Response) {
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

      const { itemId, itemType } = req.params;

      const reasons = await recommendationService.getRecommendationExplanation(
        itemId,
        itemType,
        userId
      );

      return res.json({
        success: true,
        data: { reasons },
      });
    } catch (error) {
      logger.error('Error in getRecommendationExplanation:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get explanation',
        },
      });
    }
  }

  /**
   * Refresh recommendations cache
   */
  async refreshRecommendations(req: Request, res: Response) {
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
        message: 'Recommendations refreshed',
      });
    } catch (error) {
      logger.error('Error in refreshRecommendations:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to refresh recommendations',
        },
      });
    }
  }

  /**
   * Get time of day string
   */
  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  }
}

export const billboardController = new BillboardController();