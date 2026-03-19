/**
 * User Middleware
 * User-specific middleware functions
 */

import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { logger } from '../../../../../core/logger';
import { ApiErrorCode } from '@viraz/shared';

/**
 * Check if user exists
 */
export const userExists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId || req.body.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'User ID required',
        },
      });
    }

    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: 'User not found',
        },
      });
    }

    req.targetUser = user;
    next();
  } catch (error) {
    logger.error('Error in userExists middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to verify user',
      },
    });
  }
};

/**
 * Check if user can access target user's data
 */
export const canAccessUser = (req: Request, res: Response, next: NextFunction) => {
  const currentUserId = req.user?.id;
  const targetUserId = req.params.userId || req.body.userId;

  // Admin can access any user
  if (req.user?.role === 'ADMIN') {
    return next();
  }

  // Users can access their own data
  if (currentUserId === targetUserId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: {
      code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
      message: 'You do not have permission to access this user\'s data',
    },
  });
};

/**
 * Validate profile update data
 */
export const validateProfileUpdate = (req: Request, res: Response, next: NextFunction) => {
  const allowedFields = [
    'firstName',
    'lastName',
    'displayName',
    'gender',
    'birthDate',
    'bio',
    'website',
    'occupation',
    'company',
    'education',
  ];

  const updates = Object.keys(req.body);
  const isValidOperation = updates.every(update => allowedFields.includes(update));

  if (!isValidOperation) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Invalid update fields',
      },
    });
  }

  next();
};

/**
 * Rate limit for follow actions
 */
export const followRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const followLimit = 50; // Max 50 follows per hour
  const timeWindow = 60 * 60 * 1000; // 1 hour

  try {
    const followCount = await prisma.userFollow.count({
      where: {
        followerId: userId,
        followedAt: {
          gte: new Date(Date.now() - timeWindow),
        },
      },
    });

    if (followCount >= followLimit) {
      return res.status(429).json({
        success: false,
        error: {
          code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
          message: 'Too many follow actions. Please try again later.',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in followRateLimit:', error);
    next();
  }
};