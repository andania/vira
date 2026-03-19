/**
 * Leaderboard Controller
 * Handles HTTP requests for leaderboard operations
 */

import { Request, Response } from 'express';
import { leaderboardService } from '../services/leaderboard.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class LeaderboardController {
  /**
   * Get leaderboard
   */
  async getLeaderboard(req: Request, res: Response) {
    try {
      const type = req.query.type as string || 'global';
      const period = req.query.period as string || 'allTime';
      const brandId = req.query.brandId as string;
      const category = req.query.category as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const leaderboard = await leaderboardService.getLeaderboard({
        type: type as any,
        period: period as any,
        brandId,
        category,
        limit,
        offset,
      });

      return res.json({
        success: true,
        data: leaderboard,
        meta: {
          type,
          period,
          limit,
          offset,
          total: leaderboard.length,
        },
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
   * Get global leaderboard
   */
  async getGlobalLeaderboard(req: Request, res: Response) {
    try {
      const period = req.query.period as string || 'allTime';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const leaderboard = await leaderboardService.getLeaderboard({
        type: 'global',
        period: period as any,
        limit,
        offset,
      });

      return res.json({
        success: true,
        data: leaderboard,
        meta: {
          period,
          limit,
          offset,
        },
      });
    } catch (error) {
      logger.error('Error in getGlobalLeaderboard:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get global leaderboard',
        },
      });
    }
  }

  /**
   * Get weekly leaderboard
   */
  async getWeeklyLeaderboard(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const leaderboard = await leaderboardService.getLeaderboard({
        type: 'weekly',
        limit,
        offset,
      });

      return res.json({
        success: true,
        data: leaderboard,
        meta: { limit, offset },
      });
    } catch (error) {
      logger.error('Error in getWeeklyLeaderboard:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get weekly leaderboard',
        },
      });
    }
  }

  /**
   * Get monthly leaderboard
   */
  async getMonthlyLeaderboard(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const leaderboard = await leaderboardService.getLeaderboard({
        type: 'monthly',
        limit,
        offset,
      });

      return res.json({
        success: true,
        data: leaderboard,
        meta: { limit, offset },
      });
    } catch (error) {
      logger.error('Error in getMonthlyLeaderboard:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get monthly leaderboard',
        },
      });
    }
  }

  /**
   * Get brand leaderboard
   */
  async getBrandLeaderboard(req: Request, res: Response) {
    try {
      const { brandId } = req.params;
      const period = req.query.period as string || 'allTime';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const leaderboard = await leaderboardService.getLeaderboard({
        type: 'brand',
        brandId,
        period: period as any,
        limit,
        offset,
      });

      return res.json({
        success: true,
        data: leaderboard,
        meta: { brandId, period, limit, offset },
      });
    } catch (error) {
      logger.error('Error in getBrandLeaderboard:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get brand leaderboard',
        },
      });
    }
  }

  /**
   * Get category leaderboard
   */
  async getCategoryLeaderboard(req: Request, res: Response) {
    try {
      const { category } = req.params;
      const period = req.query.period as string || 'allTime';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const leaderboard = await leaderboardService.getLeaderboard({
        type: 'category',
        category,
        period: period as any,
        limit,
        offset,
      });

      return res.json({
        success: true,
        data: leaderboard,
        meta: { category, period, limit, offset },
      });
    } catch (error) {
      logger.error('Error in getCategoryLeaderboard:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get category leaderboard',
        },
      });
    }
  }

  /**
   * Get user's rank
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

      const type = req.query.type as string || 'global';
      const rank = await leaderboardService.getUserRank(userId, type);

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
   * Get leaderboard statistics
   */
  async getLeaderboardStats(req: Request, res: Response) {
    try {
      const stats = await leaderboardService.getLeaderboardStats();

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getLeaderboardStats:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get leaderboard statistics',
        },
      });
    }
  }

  /**
   * Clear leaderboard cache (admin only)
   */
  async clearCache(req: Request, res: Response) {
    try {
      await leaderboardService.clearCache();

      return res.json({
        success: true,
        message: 'Leaderboard cache cleared successfully',
      });
    } catch (error) {
      logger.error('Error in clearCache:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to clear leaderboard cache',
        },
      });
    }
  }
}

export const leaderboardController = new LeaderboardController();