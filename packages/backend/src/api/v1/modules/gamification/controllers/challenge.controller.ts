/**
 * Challenge Controller
 * Handles HTTP requests for challenge operations
 */

import { Request, Response } from 'express';
import { challengeService } from '../services/challenge.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class ChallengeController {
  /**
   * Get active challenges
   */
  async getActiveChallenges(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const challenges = await challengeService.getActiveChallenges(userId);

      return res.json({
        success: true,
        data: challenges,
      });
    } catch (error) {
      logger.error('Error in getActiveChallenges:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get active challenges',
        },
      });
    }
  }

  /**
   * Get user's challenges
   */
  async getUserChallenges(req: Request, res: Response) {
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

      const challenges = await challengeService.getUserChallenges(userId);

      return res.json({
        success: true,
        data: challenges,
      });
    } catch (error) {
      logger.error('Error in getUserChallenges:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get user challenges',
        },
      });
    }
  }

  /**
   * Get challenge details
   */
  async getChallenge(req: Request, res: Response) {
    try {
      const { challengeId } = req.params;
      const userId = req.user?.id;

      const challenges = await challengeService.getActiveChallenges(userId);
      const challenge = challenges.find(c => c.id === challengeId);

      if (!challenge) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'Challenge not found',
          },
        });
      }

      return res.json({
        success: true,
        data: challenge,
      });
    } catch (error) {
      logger.error('Error in getChallenge:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get challenge',
        },
      });
    }
  }

  /**
   * Claim challenge reward
   */
  async claimReward(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { challengeId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const result = await challengeService.claimReward(userId, challengeId);

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
   * Get challenge statistics
   */
  async getChallengeStats(req: Request, res: Response) {
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

      const stats = await challengeService.getChallengeStats(userId);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getChallengeStats:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get challenge statistics',
        },
      });
    }
  }

  /**
   * Get challenge leaderboard
   */
  async getChallengeLeaderboard(req: Request, res: Response) {
    try {
      const { challengeId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const leaderboard = await challengeService.getChallengeLeaderboard(challengeId, limit);

      return res.json({
        success: true,
        data: leaderboard,
      });
    } catch (error) {
      logger.error('Error in getChallengeLeaderboard:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get challenge leaderboard',
        },
      });
    }
  }

  /**
   * Create weekly challenges (admin only)
   */
  async createWeeklyChallenges(req: Request, res: Response) {
    try {
      await challengeService.createWeeklyChallenges();

      return res.json({
        success: true,
        message: 'Weekly challenges created successfully',
      });
    } catch (error) {
      logger.error('Error in createWeeklyChallenges:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to create weekly challenges',
        },
      });
    }
  }

  /**
   * Update challenge progress (internal/triggered by events)
   */
  async updateProgress(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { action, value } = req.body;

      await challengeService.updateProgress(userId, action, value);

      return res.json({
        success: true,
        message: 'Challenge progress updated',
      });
    } catch (error) {
      logger.error('Error in updateProgress:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to update challenge progress',
        },
      });
    }
  }
}

export const challengeController = new ChallengeController();