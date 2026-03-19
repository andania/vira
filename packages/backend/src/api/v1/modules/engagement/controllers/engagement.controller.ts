/**
 * Engagement Controller
 * Handles HTTP requests for engagement operations
 */

import { Request, Response } from 'express';
import { engagementService } from '../services/engagement.service';
import { rewardService } from '../services/reward.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class EngagementController {
  /**
   * Process engagement action
   */
  async processEngagement(req: Request, res: Response) {
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

      const { targetType, targetId, action, metadata } = req.body;

      if (!targetType || !targetId || !action) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Target type, target ID, and action are required',
          },
        });
      }

      const result = await engagementService.processEngagement({
        userId,
        targetType,
        targetId,
        action,
        metadata,
      });

      return res.json({
        success: true,
        data: result,
        message: `${action} successful`,
      });
    } catch (error) {
      logger.error('Error in processEngagement:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to process engagement',
        },
      });
    }
  }

  /**
   * Get engagement counts
   */
  async getEngagementCounts(req: Request, res: Response) {
    try {
      const { targetType, targetId } = req.params;

      const counts = await engagementService.getEngagementCounts(targetType, targetId);

      return res.json({
        success: true,
        data: counts,
      });
    } catch (error) {
      logger.error('Error in getEngagementCounts:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get engagement counts',
        },
      });
    }
  }

  /**
   * Get user engagement history
   */
  async getUserEngagement(req: Request, res: Response) {
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

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const history = await engagementService.getUserEngagement(userId, limit, offset);

      return res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('Error in getUserEngagement:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get user engagement',
        },
      });
    }
  }

  /**
   * Get reward weights
   */
  async getRewardWeights(req: Request, res: Response) {
    try {
      const weights = rewardService.getRewardWeights();

      return res.json({
        success: true,
        data: weights,
      });
    } catch (error) {
      logger.error('Error in getRewardWeights:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get reward weights',
        },
      });
    }
  }

  /**
   * Get user reward stats
   */
  async getUserRewardStats(req: Request, res: Response) {
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

      const stats = await rewardService.getRewardStats(userId);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getUserRewardStats:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get reward stats',
        },
      });
    }
  }

  /**
   * Get top earners
   */
  async getTopEarners(req: Request, res: Response) {
    try {
      const period = req.query.period as string || 'allTime';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      const topEarners = await rewardService.getTopEarners(period as any, limit);

      return res.json({
        success: true,
        data: topEarners,
      });
    } catch (error) {
      logger.error('Error in getTopEarners:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get top earners',
        },
      });
    }
  }
}

export const engagementController = new EngagementController();