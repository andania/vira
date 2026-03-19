/**
 * Notification Preference Controller
 * Handles HTTP requests for notification preference operations
 */

import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class PreferenceController {
  /**
   * Get notification preferences
   */
  async getPreferences(req: Request, res: Response) {
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

      const preferences = await notificationService.getUserPreferences(userId);

      return res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      logger.error('Error in getPreferences:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get notification preferences',
        },
      });
    }
  }

  /**
   * Update notification preferences
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

      await notificationService.updatePreferences(userId, req.body);

      return res.json({
        success: true,
        message: 'Notification preferences updated successfully',
      });
    } catch (error) {
      logger.error('Error in updatePreferences:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update notification preferences',
        },
      });
    }
  }

  /**
   * Get quiet hours settings
   */
  async getQuietHours(req: Request, res: Response) {
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

      const preferences = await notificationService.getUserPreferences(userId);

      return res.json({
        success: true,
        data: {
          enabled: !!(preferences.quietHoursStart && preferences.quietHoursEnd),
          start: preferences.quietHoursStart,
          end: preferences.quietHoursEnd,
        },
      });
    } catch (error) {
      logger.error('Error in getQuietHours:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get quiet hours settings',
        },
      });
    }
  }

  /**
   * Update quiet hours
   */
  async updateQuietHours(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { start, end, enabled } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      if (enabled && (!start || !end)) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Start and end times are required when enabling quiet hours',
          },
        });
      }

      await notificationService.updatePreferences(userId, {
        quietHoursStart: enabled ? start : null,
        quietHoursEnd: enabled ? end : null,
      });

      return res.json({
        success: true,
        message: 'Quiet hours updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateQuietHours:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update quiet hours',
        },
      });
    }
  }

  /**
   * Toggle notification category
   */
  async toggleCategory(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { category } = req.params;
      const { enabled } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const preferences = await notificationService.getUserPreferences(userId);
      
      preferences.categories[category as keyof typeof preferences.categories] = enabled;

      await notificationService.updatePreferences(userId, {
        categories: preferences.categories,
      });

      return res.json({
        success: true,
        message: `Notification category ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      logger.error('Error in toggleCategory:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to toggle notification category',
        },
      });
    }
  }

  /**
   * Toggle channel
   */
  async toggleChannel(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { channel } = req.params;
      const { enabled } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const update: any = {};

      switch (channel) {
        case 'push':
          update.push = enabled;
          break;
        case 'email':
          update.email = enabled;
          break;
        case 'sms':
          update.sms = enabled;
          break;
        default:
          return res.status(400).json({
            success: false,
            error: {
              code: ApiErrorCode.VALIDATION_ERROR,
              message: 'Invalid notification channel',
            },
          });
      }

      await notificationService.updatePreferences(userId, update);

      return res.json({
        success: true,
        message: `${channel} notifications ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      logger.error('Error in toggleChannel:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to toggle notification channel',
        },
      });
    }
  }

  /**
   * Reset to default preferences
   */
  async resetToDefault(req: Request, res: Response) {
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

      const defaultPreferences = {
        push: true,
        email: true,
        sms: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        categories: {
          financial: true,
          engagement: true,
          campaign: true,
          room: true,
          achievement: true,
          system: true,
          ai: false,
          social: true,
        },
      };

      await notificationService.updatePreferences(userId, defaultPreferences);

      return res.json({
        success: true,
        message: 'Notification preferences reset to default',
      });
    } catch (error) {
      logger.error('Error in resetToDefault:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to reset notification preferences',
        },
      });
    }
  }
}

export const preferenceController = new PreferenceController();