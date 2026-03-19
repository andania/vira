/**
 * Analytics Middleware
 * Analytics-specific middleware functions
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../../../core/logger';
import { redis } from '../../../../../core/cache/redis.client';
import { analyticsService } from '../services/analytics.service';
import { ApiErrorCode } from '@viraz/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * Track page view automatically
 */
export const trackPageView = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = uuidv4();

  // Store original json method
  const originalJson = res.json;
  
  // Override json method to track after response
  res.json = function(body) {
    const duration = Date.now() - startTime;

    // Track page view asynchronously
    setImmediate(() => {
      analyticsService.trackEvent({
        userId: req.user?.id,
        eventType: 'page_view',
        properties: {
          path: req.path,
          method: req.method,
          query: req.query,
          duration,
          statusCode: res.statusCode,
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          requestId,
        },
      }).catch(console.error);
    });

    return originalJson.call(this, body);
  };
  
  next();
};

/**
 * Track custom event
 */
export const trackEvent = (eventType: string, getProperties?: (req: Request) => any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to track after response
    res.json = function(body) {
      if (body.success) {
        setImmediate(() => {
          const properties = getProperties ? getProperties(req) : {};
          
          analyticsService.trackEvent({
            userId: req.user?.id,
            eventType,
            properties: {
              ...properties,
              path: req.path,
              method: req.method,
              statusCode: res.statusCode,
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
 * Rate limit for analytics endpoints
 */
export const analyticsRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id || req.ip;
  const key = `ratelimit:analytics:${userId}`;
  const limit = 100; // 100 requests per minute
  const windowMs = 60 * 1000; // 1 minute

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
          message: 'Too many analytics requests. Please try again later.',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in analyticsRateLimit middleware:', error);
    next(); // Proceed on error
  }
};

/**
 * Validate date range
 */
export const validateDateRange = (req: Request, res: Response, next: NextFunction) => {
  const { startDate, endDate } = req.body;

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Invalid date format',
        },
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'End date must be after start date',
        },
      });
    }

    const maxRange = 90 * 24 * 60 * 60 * 1000; // 90 days
    if (end.getTime() - start.getTime() > maxRange) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Date range cannot exceed 90 days',
        },
      });
    }
  }

  next();
};

/**
 * Cache analytics response
 */
export const cacheAnalytics = (ttl: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `analytics:${req.path}:${JSON.stringify(req.query)}`;
    
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
      logger.error('Error in cacheAnalytics middleware:', error);
      next();
    }
  };
};

/**
 * Require analytics access (admin or specific role)
 */
export const requireAnalyticsAccess = (level: 'basic' | 'advanced' | 'admin' = 'basic') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    // Admin has access to everything
    if (userRole === 'ADMIN') {
      return next();
    }

    // Check access level based on user role
    switch (level) {
      case 'basic':
        // Basic analytics available to all authenticated users
        if (userRole) {
          return next();
        }
        break;
      case 'advanced':
        // Advanced analytics for sponsors and above
        if (userRole === 'SPONSOR' || userRole === 'ADMIN') {
          return next();
        }
        break;
      case 'admin':
        // Admin only
        return res.status(403).json({
          success: false,
          error: {
            code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
            message: 'Admin access required',
          },
        });
    }

    return res.status(403).json({
      success: false,
      error: {
        code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
        message: 'Insufficient permissions for analytics access',
      },
    });
  };
};

/**
 * Validate metrics array
 */
export const validateMetrics = (req: Request, res: Response, next: NextFunction) => {
  const { metrics } = req.body;

  if (metrics && !Array.isArray(metrics)) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Metrics must be an array',
      },
    });
  }

  if (metrics && metrics.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'At least one metric is required',
      },
    });
  }

  next();
};

/**
 * Sanitize analytics input
 */
export const sanitizeAnalyticsInput = (req: Request, res: Response, next: NextFunction) => {
  // Remove any sensitive data from analytics events
  if (req.body.properties) {
    const sensitiveFields = ['password', 'token', 'secret', 'credit_card', 'ssn'];
    
    for (const field of sensitiveFields) {
      if (req.body.properties[field]) {
        delete req.body.properties[field];
      }
    }
  }

  next();
};

/**
 * Track API usage for billing
 */
export const trackApiUsage = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const apiKey = req.headers['x-api-key'] as string;

  if (userId || apiKey) {
    const key = apiKey ? `apiusage:key:${apiKey}` : `apiusage:user:${userId}`;
    const today = new Date().toISOString().split('T')[0];
    
    await redis.hincrby(`${key}:${today}`, req.path, 1);
    await redis.expire(`${key}:${today}`, 30 * 86400); // 30 days
  }

  next();
};