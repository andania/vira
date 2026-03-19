/**
 * Billboard Middleware
 * Billboard-specific middleware functions
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../../core/database/client';
import { logger } from '../../../../../core/logger';
import { redis } from '../../../../../core/cache/redis.client';
import { ApiErrorCode } from '@viraz/shared';

/**
 * Validate location parameters
 */
export const validateLocation = (req: Request, res: Response, next: NextFunction) => {
  const { lat, lng, radius } = req.query;

  if (lat && lng) {
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Invalid latitude value',
        },
      });
    }

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Invalid longitude value',
        },
      });
    }

    if (radius) {
      const radiusValue = parseInt(radius as string);
      if (isNaN(radiusValue) || radiusValue < 1 || radiusValue > 1000) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Radius must be between 1 and 1000 km',
          },
        });
      }
    }
  }

  next();
};

/**
 * Rate limit for feed requests
 */
export const feedRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id || req.ip;
  const key = `ratelimit:feed:${userId}`;
  const limit = 100; // 100 requests per hour
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
          message: 'Too many feed requests. Please try again later.',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in feedRateLimit middleware:', error);
    next(); // Proceed on error
  }
};

/**
 * Cache feed response
 */
export const cacheFeed = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id || 'anonymous';
  const { limit = 20, offset = 0, type = 'all' } = req.query;
  
  const cacheKey = `feed:${userId}:${type}:${offset}:${limit}`;
  
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
        redis.setex(cacheKey, 300, JSON.stringify(body.data)).catch(console.error);
      }
      return originalJson.call(this, body);
    };
    
    next();
  } catch (error) {
    logger.error('Error in cacheFeed middleware:', error);
    next();
  }
};

/**
 * Validate search query
 */
export const validateSearchQuery = (req: Request, res: Response, next: NextFunction) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Search query is required',
      },
    });
  }

  if (q.length < 2) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Search query must be at least 2 characters',
      },
    });
  }

  if (q.length > 100) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Search query too long',
      },
    });
  }

  next();
};

/**
 * Track search query for analytics
 */
export const trackSearch = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const query = req.query.q as string;

  // Store original json method
  const originalJson = res.json;
  
  // Override json method to track search after response
  res.json = function(body) {
    if (body.success && body.data) {
      const resultCount = body.data.results?.length || 0;
      
      // Track search asynchronously
      prisma.searchLog.create({
        data: {
          userId,
          query,
          results: resultCount,
          timestamp: new Date(),
        },
      }).catch(console.error);

      // Update trending searches in Redis
      redis.zincrby('search:trending', 1, query.toLowerCase()).catch(console.error);
      redis.expire('search:trending', 7 * 24 * 60 * 60).catch(console.error);
    }
    
    return originalJson.call(this, body);
  };
  
  next();
};

/**
 * Filter sensitive content
 */
export const filterSensitiveContent = async (req: Request, res: Response, next: NextFunction) => {
  // Store original json method
  const originalJson = res.json;
  
  // Override json method to filter content
  res.json = function(body) {
    if (body.success && body.data) {
      // Filter items based on user preferences
      const userAge = req.user?.profile?.birthDate 
        ? new Date().getFullYear() - new Date(req.user.profile.birthDate).getFullYear()
        : null;

      // Filter function for individual items
      const filterItem = (item: any) => {
        // Filter age-restricted content
        if (item.metadata?.ageRestricted && userAge && userAge < 18) {
          return false;
        }
        
        // Filter based on user preferences
        if (req.user?.preferences?.contentSensitivity) {
          if (item.metadata?.sensitive) {
            return false;
          }
        }
        
        return true;
      };

      // Apply filter to arrays of items
      if (Array.isArray(body.data)) {
        body.data = body.data.filter(filterItem);
      } else if (body.data.items && Array.isArray(body.data.items)) {
        body.data.items = body.data.items.filter(filterItem);
      } else if (body.data.results && Array.isArray(body.data.results)) {
        body.data.results = body.data.results.filter(filterItem);
      }
    }
    
    return originalJson.call(this, body);
  };
  
  next();
};

/**
 * Personalize feed based on user preferences
 */
export const personalizeFeed = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return next();
  }

  // Store original json method
  const originalJson = res.json;
  
  // Override json method to personalize content
  res.json = function(body) {
    if (body.success && body.data) {
      // Get user interests from request (added by auth middleware)
      const interests = req.user?.profile?.interests || [];
      
      if (interests.length > 0 && Array.isArray(body.data)) {
        // Boost scores for items matching user interests
        body.data = body.data.map((item: any) => {
          if (item.metadata?.category && interests.includes(item.metadata.category)) {
            item.score = (item.score || 0) + 20;
          }
          return item;
        });

        // Re-sort by score
        body.data.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
      }
    }
    
    return originalJson.call(this, body);
  };
  
  next();
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const { limit, offset } = req.query;

  if (limit) {
    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Limit must be between 1 and 100',
        },
      });
    }
  }

  if (offset) {
    const offsetNum = parseInt(offset as string);
    if (isNaN(offsetNum) || offsetNum < 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Offset must be a positive number',
        },
      });
    }
  }

  next();
};