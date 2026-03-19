/**
 * Rank Controller
 * Handles HTTP requests for rank operations
 */

import { Request, Response } from 'express';
import { rankService } from '../services/rank.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class RankController {
  /**
   * Get user's current rank
   */
  async getUserRank(req: Request, res: Response) {
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

      const rank = await rankService.getUserRank(userId);

      return res.json({
        success: true,
        data: rank,
      });
    } catch (error) {
      logger.error('Error in getUserRank:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get user rank',
        },
      });
    }
  }

  /**
   * Get leaderboard by rank
   */
  async getLeaderboard(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      const leaderboard = await rankService.getLeaderboardByRank(limit);

      return res.json({
        success: true,
        data: leaderboard,
      });
    } catch (error) {
      logger.error('Error in getLeaderboard:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get leaderboard',
        },
      });
    }
  }

  /**
   * Get rank statistics
   */
  async getRankStats(req: Request, res: Response) {
    try {
      const stats = await rankService.getRankStats();

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getRankStats:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get rank statistics',
        },
      });
    }
  }
}

export const rankController = new RankController();