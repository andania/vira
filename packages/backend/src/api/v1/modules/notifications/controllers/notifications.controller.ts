/**
 * Notification Controller
 * Handles HTTP requests for notification operations
 */

import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { pushService } from '../services/push.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class NotificationController {
  /**
   * Get user notifications
   */
  async getNotifications(req: Request, res: Response) {
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
      const unreadOnly = req.query.unread === 'true';
      const types = req.query.types ? (req.query.types as string).split(',') as any : undefined;

      const notifications = await notificationService.getUserNotifications(userId, {
        limit,
        offset,
        unreadOnly,
        types,
      });

      return res.json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      logger.error('Error in getNotifications:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get notifications',
        },
      });
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(req: Request, res: Response) {
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

      const count = await notificationService.getUnreadCount(userId);

      return res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      logger.error('Error in getUnreadCount:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get unread count',
        },
      });
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { notificationId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await notificationService.markAsRead(notificationId, userId);

      return res.json({
        success: true,
        message: 'Notification marked as read',
      });
    } catch (error) {
      logger.error('Error in markAsRead:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to mark notification as read',
        },
      });
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(req: Request, res: Response) {
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

      await notificationService.markAllAsRead(userId);

      return res.json({
        success: true,
        message: 'All notifications marked as read',
      });
    } catch (error) {
      logger.error('Error in markAllAsRead:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to mark all notifications as read',
        },
      });
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { notificationId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await notificationService.deleteNotification(notificationId, userId);

      return res.json({
        success: true,
        message: 'Notification deleted',
      });
    } catch (error) {
      logger.error('Error in deleteNotification:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to delete notification',
        },
      });
    }
  }

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
          message: 'Failed to get preferences',
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
        message: 'Preferences updated successfully',
      });
    } catch (error) {
      logger.error('Error in updatePreferences:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to update preferences',
        },
      });
    }
  }

  /**
   * Register push token
   */
  async registerPushToken(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { token, deviceInfo } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      if (!token) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Push token is required',
          },
        });
      }

      await pushService.registerDevice(userId, token, deviceInfo);

      return res.json({
        success: true,
        message: 'Push token registered',
      });
    } catch (error) {
      logger.error('Error in registerPushToken:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to register push token',
        },
      });
    }
  }

  /**
   * Unregister push token
   */
  async unregisterPushToken(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { token } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await pushService.unregisterDevice(userId, token);

      return res.json({
        success: true,
        message: 'Push token unregistered',
      });
    } catch (error) {
      logger.error('Error in unregisterPushToken:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to unregister push token',
        },
      });
    }
  }

  /**
   * Test notification (admin only)
   */
  async testNotification(req: Request, res: Response) {
    try {
      const { userId, type, channel } = req.body;

      await notificationService.create({
        userId,
        type,
        title: 'Test Notification',
        body: 'This is a test notification from VIRAZ',
        channels: channel ? [channel] : undefined,
      });

      return res.json({
        success: true,
        message: 'Test notification sent',
      });
    } catch (error) {
      logger.error('Error in testNotification:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to send test notification',
        },
      });
    }
  }
}

export const notificationController = new NotificationController();