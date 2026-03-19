/**
 * Gamification Middleware
 * Gamification-specific middleware functions
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../../core/database/client';
import { logger } from '../../../../../core/logger';
import { redis } from '../../../../../core/cache/redis.client';
import { ApiErrorCode } from '@viraz/shared';

/**
 * Track gamification events automatically
 */
export const trackGamificationEvent = (eventType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return next();
    }

    // Store original json method
    const originalJson = res.json;
    
    // Override json method to trigger gamification after response
    res.json = function(body) {
      if (body.success) {
        // Trigger gamification event asynchronously
        setImmediate(() => {
          gamificationService.processEvent({
            userId,
            type: eventType as any,
            value: 1,
            metadata: {
              path: req.path,
              method: req.method,
              ...req.body,
            },
          }).catch(console.error);
        });
      }
      
      return originalJson.call(this, body);
    };
    
    next();
  };
};

/**
 * Check if user has required rank
 */
export const requireRank = (minLevel: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
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

      const userLevel = await prisma.userLevel.findUnique({
        where: { userId },
        include: { currentLevel: true },
      });

      const currentLevel = userLevel?.currentLevel?.levelNumber || 1;

      if (currentLevel < minLevel) {
        return res.status(403).json({
          success: false,
          error: {
            code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
            message: `Rank ${minLevel} or higher required`,
          },
        });
      }

      next();
    } catch (error) {
      logger.error('Error in requireRank middleware:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to check rank requirement',
        },
      });
    }
  };
};

/**
 * Check if user has required achievement
 */
export const requireAchievement = (achievementCode: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
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

      const achievement = await prisma.achievement.findUnique({
        where: { code: achievementCode },
      });

      if (!achievement) {
        return res.status(404).json({
          success: false,
          error: {
            code: ApiErrorCode.RESOURCE_NOT_FOUND,
            message: 'Achievement not found',
          },
        });
      }

      const userAchievement = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId,
            achievementId: achievement.id,
          },
        },
      });

      if (!userAchievement?.completed) {
        return res.status(403).json({
          success: false,
          error: {
            code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
            message: 'Required achievement not completed',
          },
        });
      }

      next();
    } catch (error) {
      logger.error('Error in requireAchievement middleware:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to check achievement requirement',
        },
      });
    }
  };
};

/**
 * Rate limit for gamification actions
 */
export const gamificationRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const action = req.path + req.method;
  
  const key = `ratelimit:gamification:${userId}:${action}`;
  const limit = 200; // 200 operations per hour
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
          message: 'Too many gamification operations. Please try again later.',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in gamificationRateLimit middleware:', error);
    next(); // Proceed on error
  }
};

/**
 * Cache gamification data
 */
export const cacheGamificationData = (ttl: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const cacheKey = `gamification:${userId}:${req.path}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        return res.json({
          success: true,
          data,
          cached: true,
        });
      }
      
      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache response
      res.json = function(body) {
        if (body.success && body.data) {
          redis.setex(cacheKey, ttl, JSON.stringify(body.data)).catch(console.error);
        }
        return originalJson.call(this, body);
      };
      
      next();
    } catch (error) {
      logger.error('Error in cacheGamificationData middleware:', error);
      next();
    }
  };
};

/**
 * Validate achievement claim
 */
export const validateAchievementClaim = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { achievementId } = req.params;

    const userAchievement = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId,
        },
      },
    });

    if (!userAchievement) {
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: 'Achievement not found for user',
        },
      });
    }

    if (!userAchievement.completed) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Achievement not completed yet',
        },
      });
    }

    if (userAchievement.rewardClaimed) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Reward already claimed',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in validateAchievementClaim middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to validate achievement claim',
      },
    });
  }
};

/**
 * Validate challenge claim
 */
export const validateChallengeClaim = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { challengeId } = req.params;

    const userChallenge = await prisma.userChallenge.findUnique({
      where: {
        userId_challengeId: {
          userId,
          challengeId,
        },
      },
    });

    if (!userChallenge) {
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: 'Challenge not found for user',
        },
      });
    }

    if (!userChallenge.completed) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Challenge not completed yet',
        },
      });
    }

    if (userChallenge.rewardClaimed) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Reward already claimed',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in validateChallengeClaim middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to validate challenge claim',
      },
    });
  }
};

/**
 * Check if feature is enabled
 */
export const gamificationFeatureEnabled = (feature: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // This would check feature flags from config
    const enabled = true; // Default to enabled
    
    if (!enabled) {
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: `${feature} feature is not available`,
        },
      });
    }
    
    next();
  };
};