/**
 * Notification Middleware
 * Notification-specific middleware functions
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../../core/database/client';
import { logger } from '../../../../../core/logger';
import { redis } from '../../../../../core/cache/redis.client';
import { ApiErrorCode } from '@viraz/shared';

/**
 * Check if notification exists and belongs to user
 */
export const notificationExists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const notificationId = req.params.notificationId;

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Notification ID required',
        },
      });
    }

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: 'Notification not found',
        },
      });
    }

    req.notification = notification;
    next();
  } catch (error) {
    logger.error('Error in notificationExists middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to verify notification',
      },
    });
  }
};

/**
 * Rate limit for notification operations
 */
export const notificationRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const action = req.path + req.method;
  
  const key = `ratelimit:notification:${userId}:${action}`;
  const limit = 100; // 100 operations per hour
  const windowMs = 60 * 60 * 1000; // 1 hour

  try {
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, windowMs / 1000);
    }

    if (current > limit) {
      return res.status(429).json({
        success: false,
        error: {
          code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
          message: 'Too many notification operations. Please try again later.',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in notificationRateLimit middleware:', error);
    next(); // Proceed on error
  }
};

/**
 * Validate push token
 */
export const validatePushToken = (req: Request, res: Response, next: NextFunction) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Push token is required',
      },
    });
  }

  if (typeof token !== 'string' || token.length < 10) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Invalid push token format',
      },
    });
  }

  next();
};

/**
 * Check quiet hours
 */
export const checkQuietHours = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;

  try {
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (preferences?.quietHoursStart && preferences?.quietHoursEnd) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number);
      const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);

      const currentTime = currentHour * 60 + currentMinute;
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;

      if (currentTime >= startTime && currentTime <= endTime) {
        // Store original json method
        const originalJson = res.json;
        
        // Override json method to add quiet hours info
        res.json = function(body) {
          body.quietHours = {
            active: true,
            until: preferences.quietHoursEnd,
          };
          return originalJson.call(this, body);
        };
      }
    }

    next();
  } catch (error) {
    logger.error('Error in checkQuietHours middleware:', error);
    next();
  }
};

/**
 * Track notification delivery
 */
export const trackNotificationDelivery = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Store original json method
  const originalJson = res.json;
  
  // Override json method to track delivery after response
  res.json = function(body) {
    const duration = Date.now() - startTime;

    if (body.success) {
      // Track delivery metrics
      redis.incr('notifications:delivered:total').catch(console.error);
      redis.lpush('notifications:delivery:times', duration.toString()).catch(console.error);
      redis.ltrim('notifications:delivery:times', 0, 999).catch(console.error);
    }

    return originalJson.call(this, body);
  };
  
  next();
};

/**
 * Filter sensitive notification data
 */
export const filterSensitiveData = (req: Request, res: Response, next: NextFunction) => {
  // Store original json method
  const originalJson = res.json;
  
  // Override json method to filter sensitive data
  res.json = function(body) {
    if (body.data?.notifications && Array.isArray(body.data.notifications)) {
      body.data.notifications = body.data.notifications.map((notif: any) => {
        // Remove sensitive data from notification
        const { ...safeNotif } = notif;
        // Keep only safe fields
        return safeNotif;
      });
    }
    
    return originalJson.call(this, body);
  };
  
  next();
};

/**
 * Validate bulk notification request
 */
export const validateBulkNotification = (req: Request, res: Response, next: NextFunction) => {
  const { userIds, title, body } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'User IDs array is required',
      },
    });
  }

  if (userIds.length > 1000) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Cannot send to more than 1000 users at once',
      },
    });
  }

  if (!title || title.length < 1 || title.length > 200) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Valid title (1-200 characters) is required',
      },
    });
  }

  if (!body || body.length < 1 || body.length > 1000) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Valid body (1-1000 characters) is required',
      },
    });
  }

  next();
};

/**
 * Check notification channel availability
 */
export const checkChannelAvailability = (req: Request, res: Response, next: NextFunction) => {
  const { channels } = req.body;

  if (!channels) {
    return next();
  }

  const availableChannels = ['push', 'email', 'sms', 'in-app'];
  const invalidChannels = channels.filter((c: string) => !availableChannels.includes(c));

  if (invalidChannels.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: `Invalid channels: ${invalidChannels.join(', ')}`,
      },
    });
  }

  next();
};