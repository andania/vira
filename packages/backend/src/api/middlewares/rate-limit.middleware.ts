/**
 * Rate Limit Middleware
 * Request rate limiting using Redis
 */

import { Request, Response, NextFunction } from 'express';
import { redis } from '../../../core/cache/redis.client';
import { logger } from '../../../core/logger';
import { ApiErrorCode } from '@viraz/shared';
import { ApiError } from './error.middleware';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  statusCode?: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessful?: boolean;
  skipFailed?: boolean;
  skip?: (req: Request) => boolean;
}

/**
 * Rate limiter factory
 */
export const rateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    keyGenerator = (req) => req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
    skipSuccessful = false,
    skipFailed = false,
    skip = () => false,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if request should be skipped
      if (skip(req)) {
        return next();
      }

      const key = `ratelimit:${keyGenerator(req)}:${req.path}`;
      
      // Get current count
      const current = await redis.get(key);
      const currentCount = current ? parseInt(current) : 0;

      // Check if limit exceeded
      if (currentCount >= max) {
        const ttl = await redis.ttl(key);
        
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + ttl);

        const error = new ApiError(message, statusCode, ApiErrorCode.RATE_LIMIT_EXCEEDED);
        error.details = { retryAfter: ttl };
        return next(error);
      }

      // Increment count
      const newCount = await redis.incr(key);
      
      // Set expiry on first request
      if (newCount === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }

      // Set rate limit headers
      const ttl = await redis.ttl(key);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - newCount));
      res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + ttl);

      // Store original json method
      const originalJson = res.json;
      
      // Override json method to handle skip logic
      res.json = function(body) {
        // Check if we should adjust count based on response
        if (skipSuccessful && body.success) {
          redis.decr(key).catch(console.error);
        } else if (skipFailed && !body.success) {
          redis.decr(key).catch(console.error);
        }
        
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      logger.error('Rate limit error:', error);
      next(); // Proceed on error
    }
  };
};

/**
 * Pre-configured rate limiters
 */

// General API rate limiter (100 requests per minute)
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many API requests. Please slow down.',
});

// Authentication rate limiter (5 requests per 15 minutes)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts. Please try again later.',
});

// Strict rate limiter (10 requests per hour)
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many attempts. Please try again later.',
});

// Public endpoints rate limiter (30 requests per minute)
export const publicRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many requests. Please slow down.',
});

// File upload rate limiter (10 uploads per hour)
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many uploads. Please try again later.',
});

// IP-based rate limiter
export const ipRateLimiter = (max: number = 50, windowMs: number = 60 * 60 * 1000) => {
  return rateLimit({
    windowMs,
    max,
    message: 'Too many requests from this IP. Please try again later.',
  });
};

// User-based rate limiter
export const userRateLimiter = (max: number = 200, windowMs: number = 60 * 60 * 1000) => {
  return rateLimit({
    windowMs,
    max,
    message: 'Too many requests. Please try again later.',
    keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
  });
};