/**
 * AI Middleware
 * AI-specific middleware functions
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../../../core/logger';
import { redis } from '../../../../../core/cache/redis.client';
import { aiService } from '../services/ai.service';
import { ApiErrorCode } from '@viraz/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * Track AI request metrics
 */
export const trackAIMetrics = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = uuidv4();

  // Store original json method
  const originalJson = res.json;
  
  // Override json method to track metrics after response
  res.json = function(body) {
    const duration = Date.now() - startTime;

    // Track metrics asynchronously
    setImmediate(() => {
      const metrics = {
        requestId,
        path: req.path,
        method: req.method,
        type: req.body.type,
        duration,
        success: body.success,
        userId: req.user?.id,
        timestamp: new Date(),
      };

      // Store in Redis for real-time monitoring
      redis.lpush('ai:metrics', JSON.stringify(metrics)).catch(console.error);
      redis.ltrim('ai:metrics', 0, 999).catch(console.error);

      // Update counters
      redis.incr('ai:requests:total').catch(console.error);
      redis.hincrby('ai:requests:bytype', req.body.type || 'unknown', 1).catch(console.error);
      
      logger.debug(`AI request completed: ${duration}ms`, metrics);
    });

    return originalJson.call(this, body);
  };
  
  next();
};

/**
 * Rate limit for AI requests
 */
export const aiRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id || req.ip;
  const apiKey = req.headers['x-api-key'] as string;
  
  const identifier = apiKey || userId;
  const key = `ratelimit:ai:${identifier}`;
  
  // Different limits based on authentication
  const limit = userId ? 100 : 20; // Authenticated users get higher limit
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
          message: 'Too many AI requests. Please try again later.',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in aiRateLimit middleware:', error);
    next(); // Proceed on error
  }
};

/**
 * Validate AI request payload
 */
export const validateAIPayload = (req: Request, res: Response, next: NextFunction) => {
  const { type, data } = req.body;

  if (!type) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'AI request type is required',
      },
    });
  }

  if (!data) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'AI request data is required',
      },
    });
  }

  // Validate based on type
  const validTypes = ['recommendation', 'personalization', 'trend', 'fraud', 'moderation'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: `Invalid AI request type. Must be one of: ${validTypes.join(', ')}`,
      },
    });
  }

  next();
};

/**
 * Cache AI responses
 */
export const cacheAIResponse = (ttl: number = 3600) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests or specific POST requests
    if (req.method !== 'GET' && req.path !== '/process') {
      return next();
    }

    const userId = req.user?.id || 'anonymous';
    const cacheKey = `ai:response:${userId}:${req.path}:${JSON.stringify(req.body)}:${JSON.stringify(req.query)}`;
    
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
      logger.error('Error in cacheAIResponse middleware:', error);
      next();
    }
  };
};

/**
 * Check AI feature availability
 */
export const checkAIFeature = (feature: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if feature is enabled in config
      const enabled = await redis.get(`ai:feature:${feature}`);
      
      if (enabled === 'false') {
        return res.status(503).json({
          success: false,
          error: {
            code: ApiErrorCode.SERVICE_UNAVAILABLE,
            message: `AI feature '${feature}' is currently disabled`,
          },
        });
      }

      next();
    } catch (error) {
      logger.error('Error in checkAIFeature middleware:', error);
      next();
    }
  };
};

/**
 * Log AI usage for billing
 */
export const logAIUsage = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const apiKey = req.headers['x-api-key'] as string;

  if (userId || apiKey) {
    const identifier = apiKey || userId;
    const today = new Date().toISOString().split('T')[0];
    const type = req.body.type || 'unknown';

    await redis.hincrby(`ai:usage:${identifier}:${today}`, type, 1);
    await redis.expire(`ai:usage:${identifier}:${today}`, 30 * 86400); // 30 days
  }

  next();
};

/**
 * Sanitize AI input
 */
export const sanitizeAIInput = (req: Request, res: Response, next: NextFunction) => {
  // Remove any sensitive data from AI requests
  const sensitiveFields = ['password', 'token', 'secret', 'credit_card', 'ssn'];
  
  if (req.body.data) {
    const sanitizeObject = (obj: any) => {
      for (const key in obj) {
        if (sensitiveFields.includes(key.toLowerCase())) {
          delete obj[key];
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };

    sanitizeObject(req.body.data);
  }

  next();
};

/**
 * Validate model parameters
 */
export const validateModelParams = (req: Request, res: Response, next: NextFunction) => {
  const { model, params } = req.body;

  if (model) {
    const validModels = ['recommendation', 'fraud', 'moderation', 'trend'];
    if (!validModels.includes(model)) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: `Invalid model name. Must be one of: ${validModels.join(', ')}`,
        },
      });
    }
  }

  if (params) {
    // Validate parameter types
    if (params.limit && (typeof params.limit !== 'number' || params.limit < 1 || params.limit > 1000)) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Limit must be a number between 1 and 1000',
        },
      });
    }

    if (params.threshold && (typeof params.threshold !== 'number' || params.threshold < 0 || params.threshold > 1)) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Threshold must be a number between 0 and 1',
        },
      });
    }
  }

  next();
};

/**
 * Check AI service health before processing
 */
export const checkAIHealth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await aiService.getHealth();
    
    if (health.status === 'error' || health.status === 'degraded') {
      return res.status(503).json({
        success: false,
        error: {
          code: ApiErrorCode.SERVICE_UNAVAILABLE,
          message: 'AI service is currently unavailable',
          details: health,
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in checkAIHealth middleware:', error);
    next();
  }
};

/**
 * Add request ID for tracing
 */
export const addRequestId = (req: Request, res: Response, next: NextFunction) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};