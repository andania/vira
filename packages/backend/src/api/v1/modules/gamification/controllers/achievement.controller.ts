/**
 * Achievement Controller
 * Handles HTTP requests for achievement operations
 */

import { Request, Response } from 'express';
import { achievementService } from '../services/achievement.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class AchievementController {
  /**
   * Get user's achievements
   */
  async getUserAchievements(req: Request, res: Response) {
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

      const achievements = await achievementService.getUserAchievements(userId);

      return res.json({
        success: true,
        data: achievements,
      });
    } catch (error) {
      logger.error('Error in getUserAchievements:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get user achievements',
        },
      });
    }
  }

  /**
   * Get all achievements
   */
  async getAllAchievements(req: Request, res: Response) {
    try {
      const achievements = await achievementService.getAllAchievements();

      return res.json({
        success: true,
        data: achievements,
      });
    } catch (error) {
      logger.error('Error in getAllAchievements:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get achievements',
        },
      });
    }
  }

  /**
   * Get achievement progress
   */
  async getAchievementProgress(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { achievementId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const progress = await achievementService.getAchievementProgress(userId, achievementId);

      return res.json({
        success: true,
        data: { progress },
      });
    } catch (error) {
      logger.error('Error in getAchievementProgress:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get achievement progress',
        },
      });
    }
  }

  /**
   * Claim achievement reward
   */
  async claimReward(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { achievementId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const result = await achievementService.claimReward(userId, achievementId);

      return res.json({
        success: true,
        data: result,
        message: 'Reward claimed successfully',
      });
    } catch (error) {
      logger.error('Error in claimReward:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to claim reward',
        },
      });
    }
  }

  /**
   * Get achievement statistics
   */
  async getAchievementStats(req: Request, res: Response) {
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

      const stats = await achievementService.getAchievementStats(userId);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getAchievementStats:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get achievement statistics',
        },
      });
    }
  }

  /**
   * Get top achievers
   */
  async getTopAchievers(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const achievers = await achievementService.getTopAchievers(limit);

      return res.json({
        success: true,
        data: achievers,
      });
    } catch (error) {
      logger.error('Error in getTopAchievers:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get top achievers',
        },
      });
    }
  }
}

export const achievementController = new AchievementController();