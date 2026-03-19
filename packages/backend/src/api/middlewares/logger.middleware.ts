/**
 * Logger Middleware
 * Request/response logging
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../core/logger';
import { redis } from '../../../core/cache/redis.client';

declare global {
  namespace Express {
    interface Request {
      id: string;
      startTime: number;
    }
  }
}

/**
 * Add request ID and timestamp
 */
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  req.id = uuidv4();
  req.startTime = Date.now();
  res.setHeader('X-Request-ID', req.id);
  next();
};

/**
 * Log incoming requests
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Log request
  logger.info(`${req.method} ${req.path}`, {
    requestId: req.id,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id,
  });

  // Store original json method
  const originalJson = res.json;
  
  // Override json method to log response
  res.json = function(body) {
    const responseTime = Date.now() - req.startTime;

    // Log response
    logger.info(`${req.method} ${req.path} ${res.statusCode} - ${responseTime}ms`, {
      requestId: req.id,
      statusCode: res.statusCode,
      responseTime,
      success: body?.success,
    });

    // Track response time in Redis for monitoring
    redis.lpush(`responsetime:${req.path}`, responseTime.toString()).catch(console.error);
    redis.ltrim(`responsetime:${req.path}`, 0, 99).catch(console.error);

    return originalJson.call(this, body);
  };

  next();
};

/**
 * Log errors
 */
export const errorLogger = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error: ${err.message}`, {
    requestId: req.id,
    error: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  });

  next(err);
};

/**
 * Log slow requests
 */
export const slowRequestLogger = (threshold: number = 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      if (duration > threshold) {
        logger.warn(`Slow request detected: ${req.method} ${req.path} took ${duration}ms`, {
          requestId: req.id,
          duration,
          threshold,
          userId: req.user?.id,
        });
      }
    });

    next();
  };
};

/**
 * Log API usage for billing/analytics
 */
export const usageLogger = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const apiKey = req.headers['x-api-key'] as string;

  if (userId || apiKey) {
    const identifier = apiKey || userId;
    const today = new Date().toISOString().split('T')[0];
    
    redis.hincrby(`usage:${identifier}:${today}`, req.path, 1).catch(console.error);
    redis.expire(`usage:${identifier}:${today}`, 30 * 86400).catch(console.error); // 30 days
  }

  next();
};