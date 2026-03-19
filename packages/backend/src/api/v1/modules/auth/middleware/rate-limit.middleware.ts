/**
 * Rate Limit Middleware
 * Rate limiting for authentication endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { redis } from '../../../../../core/cache/redis.client';
import { logger } from '../../../../../core/logger';
import { ApiErrorCode } from '@viraz/shared';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  message?: string;
  statusCode?: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessful?: boolean; // Don't count successful requests
  skipFailed?: boolean; // Don't count failed requests
}

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs,
      max: config.max,
      message: config.message || 'Too many requests, please try again later.',
      statusCode: config.statusCode || 429,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
      skipSuccessful: config.skipSuccessful || false,
      skipFailed: config.skipFailed || false,
    };
  }

  /**
   * Default key generator (uses IP)
   */
  private defaultKeyGenerator(req: Request): string {
    return req.ip || 
           req.headers['x-forwarded-for'] as string || 
           req.socket.remoteAddress || 
           'unknown';
  }

  /**
   * Middleware function
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = this.config.keyGenerator!(req);
        const routeKey = `${req.method}:${req.path}`;
        const redisKey = `ratelimit:${routeKey}:${key}`;

        // Get current count
        const current = await redis.get(redisKey);
        const currentCount = current ? parseInt(current) : 0;

        // Check if limit exceeded
        if (currentCount >= this.config.max) {
          const ttl = await redis.ttl(redisKey);
          
          res.setHeader('X-RateLimit-Limit', this.config.max);
          res.setHeader('X-RateLimit-Remaining', 0);
          res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + ttl);

          return res.status(this.config.statusCode!).json({
            success: false,
            error: {
              code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
              message: this.config.message,
              retryAfter: ttl,
            },
          });
        }

        // Increment count
        const newCount = await redis.incr(redisKey);
        
        // Set expiry on first request
        if (newCount === 1) {
          await redis.expire(redisKey, Math.ceil(this.config.windowMs / 1000));
        }

        // Set rate limit headers
        const ttl = await redis.ttl(redisKey);
        res.setHeader('X-RateLimit-Limit', this.config.max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, this.config.max - newCount));
        res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + ttl);

        // Store original json method
        const originalJson = res.json;
        
        // Override json method to handle skip logic
        res.json = function(body) {
          // Check if we should skip counting based on response
          if (req.rateLimitSkipped) {
            // Decrement the count if we're skipping
            redis.decr(redisKey).catch(console.error);
          }
          
          return originalJson.call(this, body);
        };

        next();
      } catch (error) {
        logger.error('Rate limit error:', error);
        next(); // Proceed on error
      }
    };
  }

  /**
   * Skip counting for this request
   */
  skip() {
    return (req: Request, res: Response, next: NextFunction) => {
      req.rateLimitSkipped = true;
      next();
    };
  }
}

/**
 * Authentication-specific rate limiters
 */

// Login rate limiter (5 attempts per 15 minutes)
export const loginRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts. Please try again later.',
  skipSuccessful: true, // Don't count successful logins
}).middleware();

// Registration rate limiter (3 registrations per hour)
export const registerRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many registration attempts. Please try again later.',
}).middleware();

// Password reset rate limiter (3 requests per hour)
export const passwordResetRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset requests. Please try again later.',
}).middleware();

// Email verification rate limiter (5 attempts per hour)
export const emailVerificationRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many verification attempts. Please try again later.',
}).middleware();

// Phone verification rate limiter (5 attempts per hour)
export const phoneVerificationRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many verification attempts. Please try again later.',
}).middleware();

// OTP rate limiter (3 attempts per 15 minutes)
export const otpRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: 'Too many OTP attempts. Please try again later.',
}).middleware();

// Generic API rate limiter (100 requests per minute)
export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests. Please slow down.',
}).middleware();

// Strict rate limiter for sensitive operations (10 requests per hour)
export const strictRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many attempts. Please try again later.',
}).middleware();

// IP-based rate limiter for anonymous endpoints
export const ipRateLimiter = (max: number = 50, windowMs: number = 60 * 60 * 1000) => {
  return new RateLimiter({
    windowMs,
    max,
    message: 'Too many requests from this IP. Please try again later.',
    keyGenerator: (req) => req.ip || 'unknown',
  }).middleware();
};

// User-based rate limiter for authenticated endpoints
export const userRateLimiter = (max: number = 200, windowMs: number = 60 * 60 * 1000) => {
  return new RateLimiter({
    windowMs,
    max,
    message: 'Too many requests. Please try again later.',
    keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
  }).middleware();
};

// Concurrent requests limiter
export const concurrentLimiter = (max: number = 5) => {
  const activeRequests = new Map<string, number>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.user?.id || req.ip || 'unknown';
    const current = activeRequests.get(key) || 0;

    if (current >= max) {
      return res.status(429).json({
        success: false,
        error: {
          code: ApiErrorCode.CONCURRENT_REQUESTS_LIMIT,
          message: 'Too many concurrent requests. Please wait.',
        },
      });
    }

    activeRequests.set(key, current + 1);

    res.on('finish', () => {
      const updated = activeRequests.get(key) || 1;
      if (updated <= 1) {
        activeRequests.delete(key);
      } else {
        activeRequests.set(key, updated - 1);
      }
    });

    next();
  };
};

// Declare rateLimitSkipped on Request
declare global {
  namespace Express {
    interface Request {
      rateLimitSkipped?: boolean;
    }
  }
}

export default {
  loginRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
  emailVerificationRateLimiter,
  phoneVerificationRateLimiter,
  otpRateLimiter,
  apiRateLimiter,
  strictRateLimiter,
  ipRateLimiter,
  userRateLimiter,
  concurrentLimiter,
};