/**
 * Gamification Controller
 * Handles HTTP requests for main gamification operations
 */

import { Request, Response } from 'express';
import { gamificationService } from '../services/gamification.service';
import { rankService } from '../services/rank.service';
import { achievementService } from '../services/achievement.service';
import { leaderboardService } from '../services/leaderboard.service';
import { challengeService } from '../services/challenge.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class GamificationController {
  /**
   * Get user's complete gamification profile
   */
  async getUserProfile(req: Request, res: Response) {
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

      const profile = await gamificationService.getUserProfile(userId);

      return res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      logger.error('Error in getUserProfile:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get gamification profile',
        },
      });
    }
  }

  /**
   * Process a gamification event (internal/triggered by other modules)
   */
  async processEvent(req: Request, res: Response) {
    try {
      const { userId, type, value, metadata } = req.body;

      await gamificationService.processEvent({
        userId,
        type,
        value,
        metadata,
      });

      return res.json({
        success: true,
        message: 'Gamification event processed',
      });
    } catch (error) {
      logger.error('Error in processEvent:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to process gamification event',
        },
      });
    }
  }

  /**
   * Get gamification statistics (admin only)
   */
  async getGamificationStats(req: Request, res: Response) {
    try {
      const stats = await gamificationService.getGamificationStats();

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getGamificationStats:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get gamification statistics',
        },
      });
    }
  }

  /**
   * Get available badges
   */
  async getAvailableBadges(req: Request, res: Response) {
    try {
      const badges = await gamificationService.getAvailableBadges();

      return res.json({
        success: true,
        data: badges,
      });
    } catch (error) {
      logger.error('Error in getAvailableBadges:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get available badges',
        },
      });
    }
  }

  /**
   * Initialize gamification for a new user
   */
  async initializeUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      await gamificationService.initializeUser(userId);

      return res.json({
        success: true,
        message: 'Gamification initialized for user',
      });
    } catch (error) {
      logger.error('Error in initializeUser:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to initialize gamification',
        },
      });
    }
  }
}

export const gamificationController = new GamificationController();