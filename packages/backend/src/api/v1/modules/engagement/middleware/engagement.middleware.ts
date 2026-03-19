/**
 * Engagement Middleware
 * Engagement-specific middleware functions
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../../core/database/client';
import { logger } from '../../../../../core/logger';
import { redis } from '../../../../../core/cache/redis.client';
import { ApiErrorCode } from '@viraz/shared';

/**
 * Check if target exists for engagement
 */
export const targetExists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { targetType, targetId } = req.body;

    if (!targetType || !targetId) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Target type and ID are required',
        },
      });
    }

    let exists = false;

    switch (targetType) {
      case 'ad':
        exists = !!(await prisma.ad.findUnique({ where: { id: targetId } }));
        break;
      case 'room':
        exists = !!(await prisma.room.findUnique({ where: { id: targetId } }));
        break;
      case 'campaign':
        exists = !!(await prisma.campaign.findUnique({ where: { id: targetId } }));
        break;
      case 'product':
        exists = !!(await prisma.product.findUnique({ where: { id: targetId } }));
        break;
      case 'comment':
        exists = !!(await prisma.comment.findUnique({ where: { id: targetId } }));
        break;
      case 'brand':
        exists = !!(await prisma.brand.findUnique({ where: { id: targetId } }));
        break;
      default:
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Invalid target type',
          },
        });
    }

    if (!exists) {
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: `${targetType} not found`,
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in targetExists middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to verify target',
      },
    });
  }
};

/**
 * Rate limit for engagement actions
 */
export const engagementRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const action = req.body.action || 'unknown';
  
  const key = `ratelimit:engagement:${userId}:${action}`;
  const limits: Record<string, number> = {
    like: 100, // 100 likes per hour
    comment: 50, // 50 comments per hour
    share: 30, // 30 shares per hour
    click: 200, // 200 clicks per hour
    view: 500, // 500 views per hour
    save: 100, // 100 saves per hour
    report: 10, // 10 reports per hour
  };
  const limit = limits[action] || 50;
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
          message: `Too many ${action} actions. Please try again later.`,
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in engagementRateLimit middleware:', error);
    next(); // Proceed on error
  }
};

/**
 * Check for duplicate engagement
 */
export const checkDuplicateEngagement = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const { targetType, targetId, action } = req.body;

  if (!userId || !targetType || !targetId || !action) {
    return next();
  }

  const key = `duplicate:engagement:${userId}:${targetType}:${targetId}:${action}`;
  
  try {
    const exists = await redis.get(key);
    
    if (exists) {
      return res.status(429).json({
        success: false,
        error: {
          code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
          message: 'Action already performed recently',
        },
      });
    }

    // Set cooldown based on action
    let cooldown = 5; // seconds
    switch (action) {
      case 'like':
        cooldown = 2;
        break;
      case 'share':
        cooldown = 10;
        break;
      case 'click':
        cooldown = 1;
        break;
      case 'view':
        cooldown = 60;
        break;
      case 'report':
        cooldown = 300; // 5 minutes
        break;
    }

    await redis.setex(key, cooldown, '1');
    next();
  } catch (error) {
    logger.error('Error in checkDuplicateEngagement middleware:', error);
    next();
  }
};

/**
 * Validate comment content
 */
export const validateCommentContent = (req: Request, res: Response, next: NextFunction) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Comment content is required',
      },
    });
  }

  if (content.length < 1) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Comment cannot be empty',
      },
    });
  }

  if (content.length > 1000) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Comment cannot exceed 1000 characters',
      },
    });
  }

  next();
};

/**
 * Validate suggestion content
 */
export const validateSuggestionContent = (req: Request, res: Response, next: NextFunction) => {
  const { title, content } = req.body;

  if (!title) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Suggestion title is required',
      },
    });
  }

  if (title.length < 3) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Title must be at least 3 characters',
      },
    });
  }

  if (title.length > 200) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Title cannot exceed 200 characters',
      },
    });
  }

  if (!content) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Suggestion content is required',
      },
    });
  }

  if (content.length < 10) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Content must be at least 10 characters',
      },
    });
  }

  if (content.length > 5000) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Content cannot exceed 5000 characters',
      },
    });
  }

  next();
};

/**
 * Check if user can moderate content
 */
export const canModerate = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const { targetType, targetId } = req.params;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: {
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'Authentication required',
      },
    });
  }

  try {
    let isAuthorized = false;

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountType: true },
    });

    if (user?.accountType === 'ADMIN') {
      return next();
    }

    // Check if user owns the content
    if (targetType === 'comment') {
      const comment = await prisma.comment.findUnique({
        where: { id: targetId },
      });
      if (comment?.userId === userId) {
        isAuthorized = true;
      }
    } else if (targetType === 'suggestion') {
      const suggestion = await prisma.suggestion.findUnique({
        where: { id: targetId },
      });
      if (suggestion?.userId === userId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: {
          code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
          message: 'Not authorized to moderate this content',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in canModerate middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to check authorization',
      },
    });
  }
};

/**
 * Track engagement for analytics
 */
export const trackEngagement = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const { targetType, targetId, action } = req.body;

  // Store original json method
  const originalJson = res.json;
  
  // Override json method to track engagement after response
  res.json = function(body) {
    if (body.success && userId) {
      // Track engagement asynchronously
      prisma.userEngagement.create({
        data: {
          userId,
          targetType,
          targetId,
          type: action,
          metadata: req.body.metadata,
        },
      }).catch(console.error);

      // Update engagement counts in Redis
      const countKey = `engagement:counts:${targetType}:${targetId}`;
      redis.hincrby(countKey, action, 1).catch(console.error);
      redis.expire(countKey, 86400).catch(console.error);
    }
    
    return originalJson.call(this, body);
  };
  
  next();
};