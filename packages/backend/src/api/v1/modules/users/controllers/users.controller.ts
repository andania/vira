/**
 * User Controller
 * Handles HTTP requests for user operations
 */

import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { profileService } from '../services/profile.service';
import { followerService } from '../services/follower.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class UserController {
  /**
   * Get current user profile
   */
  async getCurrentUser(req: Request, res: Response) {
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

      const user = await userService.getUserById(userId);
      
      return res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Error in getCurrentUser:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get user profile',
        },
      });
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const viewerId = req.user?.id;

      const user = await profileService.getPublicProfile(userId, viewerId);
      
      return res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Error in getUserById:', error);
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: 'User not found',
        },
      });
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(req: Request, res: Response) {
    try {
      const { username } = req.params;
      const viewerId = req.user?.id;

      const user = await userService.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'User not found',
          },
        });
      }

      const profile = await profileService.getPublicProfile(user.id, viewerId);
      
      return res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      logger.error('Error in getUserByUsername:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get user',
        },
      });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req: Request, res: Response) {
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

      const profile = await userService.updateProfile(userId, req.body);
      
      return res.json({
        success: true,
        data: profile,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateProfile:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update profile',
        },
      });
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(req: Request, res: Response) {
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

      const preferences = await userService.updatePreferences(userId, req.body);
      
      return res.json({
        success: true,
        data: preferences,
        message: 'Preferences updated successfully',
      });
    } catch (error) {
      logger.error('Error in updatePreferences:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update preferences',
        },
      });
    }
  }

  /**
   * Upload avatar
   */
  async uploadAvatar(req: Request, res: Response) {
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

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'No file uploaded',
          },
        });
      }

      const profile = await profileService.updateAvatar(userId, { file: req.file });
      
      return res.json({
        success: true,
        data: profile,
        message: 'Avatar uploaded successfully',
      });
    } catch (error) {
      logger.error('Error in uploadAvatar:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.FILE_UPLOAD_FAILED,
          message: error.message || 'Failed to upload avatar',
        },
      });
    }
  }

  /**
   * Upload cover image
   */
  async uploadCover(req: Request, res: Response) {
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

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'No file uploaded',
          },
        });
      }

      const profile = await profileService.updateCover(userId, { file: req.file });
      
      return res.json({
        success: true,
        data: profile,
        message: 'Cover image uploaded successfully',
      });
    } catch (error) {
      logger.error('Error in uploadCover:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.FILE_UPLOAD_FAILED,
          message: error.message || 'Failed to upload cover',
        },
      });
    }
  }

  /**
   * Update interests
   */
  async updateInterests(req: Request, res: Response) {
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

      const { interests } = req.body;
      if (!Array.isArray(interests)) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Interests must be an array',
          },
        });
      }

      const profile = await profileService.updateInterests(userId, interests);
      
      return res.json({
        success: true,
        data: profile,
        message: 'Interests updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateInterests:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update interests',
        },
      });
    }
  }

  /**
   * Get user statistics
   */
  async getStatistics(req: Request, res: Response) {
    try {
      const userId = req.params.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const stats = await userService.getUserStatistics(userId);
      
      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getStatistics:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get statistics',
        },
      });
    }
  }

  /**
   * Get user activity
   */
  async getActivity(req: Request, res: Response) {
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

      const activity = await userService.getUserActivity(userId, limit, offset);
      
      return res.json({
        success: true,
        data: activity,
      });
    } catch (error) {
      logger.error('Error in getActivity:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get activity',
        },
      });
    }
  }

  /**
   * Search users
   */
  async searchUsers(req: Request, res: Response) {
    try {
      const { q, limit = 20, offset = 0 } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Search query required',
          },
        });
      }

      const results = await userService.searchUsers(
        q as string,
        parseInt(limit as string),
        parseInt(offset as string)
      );
      
      return res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      logger.error('Error in searchUsers:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to search users',
        },
      });
    }
  }

  /**
   * Check username availability
   */
  async checkUsername(req: Request, res: Response) {
    try {
      const { username } = req.params;
      const available = await userService.isUsernameAvailable(username);
      
      return res.json({
        success: true,
        data: { available, username },
      });
    } catch (error) {
      logger.error('Error in checkUsername:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to check username',
        },
      });
    }
  }

  /**
   * Check email availability
   */
  async checkEmail(req: Request, res: Response) {
    try {
      const { email } = req.params;
      const available = await userService.isEmailAvailable(email);
      
      return res.json({
        success: true,
        data: { available, email },
      });
    } catch (error) {
      logger.error('Error in checkEmail:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to check email',
        },
      });
    }
  }

  /**
   * Deactivate account
   */
  async deactivateAccount(req: Request, res: Response) {
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

      const { reason } = req.body;
      await userService.deactivateAccount(userId, reason);
      
      return res.json({
        success: true,
        message: 'Account deactivated successfully',
      });
    } catch (error) {
      logger.error('Error in deactivateAccount:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to deactivate account',
        },
      });
    }
  }

  /**
   * Delete account
   */
  async deleteAccount(req: Request, res: Response) {
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

      const { password } = req.body;
      if (!password) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Password required',
          },
        });
      }

      await userService.deleteAccount(userId, password);
      
      return res.json({
        success: true,
        message: 'Account deletion scheduled',
      });
    } catch (error) {
      logger.error('Error in deleteAccount:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to delete account',
        },
      });
    }
  }
}

export const userController = new UserController();