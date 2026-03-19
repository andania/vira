/**
 * Follower Controller
 * Handles HTTP requests for follow/unfollow operations
 */

import { Request, Response } from 'express';
import { followerService } from '../services/follower.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class FollowerController {
  /**
   * Follow a user
   */
  async followUser(req: Request, res: Response) {
    try {
      const followerId = req.user?.id;
      const { userId } = req.params;

      if (!followerId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await followerService.followUser(followerId, userId);
      
      return res.json({
        success: true,
        message: 'Successfully followed user',
      });
    } catch (error) {
      logger.error('Error in followUser:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.BUSINESS_ERROR,
          message: error.message || 'Failed to follow user',
        },
      });
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(req: Request, res: Response) {
    try {
      const followerId = req.user?.id;
      const { userId } = req.params;

      if (!followerId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await followerService.unfollowUser(followerId, userId);
      
      return res.json({
        success: true,
        message: 'Successfully unfollowed user',
      });
    } catch (error) {
      logger.error('Error in unfollowUser:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.BUSINESS_ERROR,
          message: error.message || 'Failed to unfollow user',
        },
      });
    }
  }

  /**
   * Get followers list
   */
  async getFollowers(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const followers = await followerService.getFollowers(userId, limit, offset);
      
      return res.json({
        success: true,
        data: followers,
      });
    } catch (error) {
      logger.error('Error in getFollowers:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get followers',
        },
      });
    }
  }

  /**
   * Get following list
   */
  async getFollowing(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const following = await followerService.getFollowing(userId, limit, offset);
      
      return res.json({
        success: true,
        data: following,
      });
    } catch (error) {
      logger.error('Error in getFollowing:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get following',
        },
      });
    }
  }

  /**
   * Check if following
   */
  async isFollowing(req: Request, res: Response) {
    try {
      const followerId = req.user?.id;
      const { userId } = req.params;

      if (!followerId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const isFollowing = await followerService.isFollowing(followerId, userId);
      
      return res.json({
        success: true,
        data: { isFollowing },
      });
    } catch (error) {
      logger.error('Error in isFollowing:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to check follow status',
        },
      });
    }
  }

  /**
   * Get follower suggestions
   */
  async getSuggestions(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const suggestions = await followerService.getFollowerSuggestions(userId, limit);
      
      return res.json({
        success: true,
        data: suggestions,
      });
    } catch (error) {
      logger.error('Error in getSuggestions:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get suggestions',
        },
      });
    }
  }

  /**
   * Get follower counts
   */
  async getFollowerCounts(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const [followers, following] = await Promise.all([
        followerService.getFollowerCount(userId),
        followerService.getFollowingCount(userId),
      ]);
      
      return res.json({
        success: true,
        data: { followers, following },
      });
    } catch (error) {
      logger.error('Error in getFollowerCounts:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get follower counts',
        },
      });
    }
  }
}

export const followerController = new FollowerController();