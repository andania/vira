/**
 * Recommendation Controller
 * Handles HTTP requests for AI recommendations
 */

import { Request, Response } from 'express';
import { recommendationService } from '../services/recommendation.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class RecommendationController {
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
      const type = req.query.type as string || 'all';
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
        type: type as any,
        location,
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
  async getExplanation(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { itemId, itemType } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const reasons = await recommendationService.getExplanation(itemId, itemType, userId);

      return res.json({
        success: true,
        data: { reasons },
      });
    } catch (error) {
      logger.error('Error in getExplanation:', error);
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
  async refreshCache(req: Request, res: Response) {
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
        message: 'Recommendations cache refreshed',
      });
    } catch (error) {
      logger.error('Error in refreshCache:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to refresh cache',
        },
      });
    }
  }
}

export const recommendationController = new RecommendationController();