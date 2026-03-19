/**
 * Trend Controller
 * Handles HTTP requests for trend analysis and prediction
 */

import { Request, Response } from 'express';
import { trendService } from '../services/trend.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class TrendController {
  /**
   * Get trending items
   */
  async getTrendingItems(req: Request, res: Response) {
    try {
      const type = req.query.type as string;
      const category = req.query.category as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const trending = await trendService.getTrendingItems(type, category, limit);

      return res.json({
        success: true,
        data: trending,
      });
    } catch (error) {
      logger.error('Error in getTrendingItems:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get trending items',
        },
      });
    }
  }

  /**
   * Get trend predictions
   */
  async getPredictions(req: Request, res: Response) {
    try {
      const { itemId, itemType } = req.params;

      const prediction = await trendService.predictTrends(itemId, itemType);

      if (!prediction) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'Insufficient data for prediction',
          },
        });
      }

      return res.json({
        success: true,
        data: prediction,
      });
    } catch (error) {
      logger.error('Error in getPredictions:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get predictions',
        },
      });
    }
  }

  /**
   * Get trend categories
   */
  async getTrendCategories(req: Request, res: Response) {
    try {
      const categories = await trendService.getTrendCategories();

      return res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      logger.error('Error in getTrendCategories:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get trend categories',
        },
      });
    }
  }

  /**
   * Get trend insights
   */
  async getTrendInsights(req: Request, res: Response) {
    try {
      const insights = await trendService.getTrendInsights();

      return res.json({
        success: true,
        data: insights,
      });
    } catch (error) {
      logger.error('Error in getTrendInsights:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get trend insights',
        },
      });
    }
  }
}

export const trendController = new TrendController();