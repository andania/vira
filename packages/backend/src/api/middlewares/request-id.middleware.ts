/**
 * Request ID Middleware
 * Generates and tracks unique request IDs for tracing and debugging
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import { logger } from '../../../core/logger';
import { redis } from '../../../core/cache/redis.client';

// Constants for UUID generation
const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // DNS namespace

declare global {
  namespace Express {
    interface Request {
      id: string;
      startTime: number;
      traceId?: string;
      spanId?: string;
    }
  }
}

/**
 * Generate a deterministic request ID from parts
 */
const generateDeterministicId = (parts: string[]): string => {
  const input = parts.join(':');
  return uuidv5(input, NAMESPACE);
};

/**
 * Extract request ID from various sources
 */
const extractRequestId = (req: Request): string | null => {
  // Check headers in order of preference
  const sources = [
    req.headers['x-request-id'],
    req.headers['x-correlation-id'],
    req.headers['x-trace-id'],
    req.headers['request-id'],
  ];

  for (const source of sources) {
    if (source && typeof source === 'string') {
      return source;
    }
  }

  return null;
};

/**
 * Generate a new request ID
 */
const generateRequestId = (req: Request): string => {
  // Try to create deterministic ID from request parts
  try {
    const parts = [
      req.ip || 'unknown',
      req.method || 'unknown',
      req.path || 'unknown',
      Date.now().toString(),
      Math.random().toString(36).substring(7),
    ];
    return generateDeterministicId(parts);
  } catch (error) {
    // Fallback to random UUID
    return uuidv4();
  }
};

/**
 * Request ID middleware
 * Adds unique ID to each request for tracing
 */
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  // Extract or generate request ID
  const extractedId = extractRequestId(req);
  req.id = extractedId || generateRequestId(req);
  
  // Add start time for performance tracking
  req.startTime = Date.now();

  // Generate trace ID for distributed tracing
  req.traceId = req.headers['x-trace-id'] as string || uuidv4();
  
  // Generate span ID for current operation
  req.spanId = uuidv4();

  // Set response header
  res.setHeader('X-Request-ID', req.id);
  res.setHeader('X-Trace-ID', req.traceId);

  // Store request start in Redis for tracking long-running requests
  if (process.env.NODE_ENV === 'production') {
    const key = `request:${req.id}`;
    redis.setex(key, 3600, JSON.stringify({
      id: req.id,
      traceId: req.traceId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id,
      startTime: req.startTime,
    })).catch(err => logger.error('Failed to store request in Redis:', err));
  }

  // Log request start in development
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`[${req.id}] Started ${req.method} ${req.path}`);
  }

  // Track response finish
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    
    // Log request completion
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`[${req.id}] Completed ${res.statusCode} in ${duration}ms`);
    }

    // Track slow requests
    if (duration > 1000) {
      logger.warn(`[${req.id}] Slow request detected: ${duration}ms`, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        userId: req.user?.id,
      });
    }

    // Remove from Redis if stored
    if (process.env.NODE_ENV === 'production') {
      redis.del(`request:${req.id}`).catch(err => 
        logger.error('Failed to delete request from Redis:', err)
      );
    }
  });

  next();
};

/**
 * Generate request ID from user ID (for authenticated requests)
 */
export const requestIdFromUser = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.id) {
    const parts = [
      req.user.id,
      req.method,
      req.path,
      Date.now().toString(),
    ];
    req.id = generateDeterministicId(parts);
    res.setHeader('X-Request-ID', req.id);
  }
  next();
};

/**
 * Validate request ID format
 */
export const validateRequestId = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'];
  
  if (requestId && typeof requestId === 'string') {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(requestId)) {
      logger.warn(`Invalid request ID format: ${requestId}`);
    }
  }
  
  next();
};

/**
 * Get request context for logging
 */
export const getRequestContext = (req: Request): Record<string, any> => {
  return {
    requestId: req.id,
    traceId: req.traceId,
    spanId: req.spanId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.user?.id,
    userAgent: req.headers['user-agent'],
  };
};

/**
 * Middleware to add request context to response headers
 */
export const addRequestContextHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Request-ID', req.id);
  res.setHeader('X-Trace-ID', req.traceId || '');
  res.setHeader('X-Span-ID', req.spanId || '');
  next();
};

/**
 * Get request timing information
 */
export const getRequestTiming = (req: Request): number => {
  return Date.now() - req.startTime;
};

/**
 * Check if request is taking too long
 */
export const isRequestSlow = (req: Request, threshold: number = 5000): boolean => {
  return Date.now() - req.startTime > threshold;
};

/**
 * Get all active requests (for monitoring)
 */
export const getActiveRequests = async (): Promise<any[]> => {
  try {
    const keys = await redis.keys('request:*');
    const requests = await Promise.all(
      keys.map(async (key) => {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
      })
    );
    return requests.filter(Boolean);
  } catch (error) {
    logger.error('Failed to get active requests:', error);
    return [];
  }
};

/**
 * Middleware to ensure request ID is present
 */
export const ensureRequestId = (req: Request, res: Response, next: NextFunction) => {
  if (!req.id) {
    req.id = uuidv4();
    req.startTime = Date.now();
    res.setHeader('X-Request-ID', req.id);
  }
  next();
};

/**
 * Chain request IDs (for microservices)
 */
export const chainRequestId = (req: Request, res: Response, next: NextFunction) => {
  const parentId = req.headers['x-parent-request-id'];
  if (parentId && typeof parentId === 'string') {
    req.headers['x-request-id'] = parentId;
    res.setHeader('X-Parent-Request-ID', parentId);
  }
  next();
};

export default requestId;