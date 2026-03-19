/**
 * CORS Middleware
 * Cross-Origin Resource Sharing configuration
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../../../config';
import { logger } from '../../../core/logger';

// Allowed origins
const allowedOrigins = config.corsOrigin || [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://viraz.com',
  'https://app.viraz.com',
];

// Allowed methods
const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

// Allowed headers
const allowedHeaders = [
  'Origin',
  'X-Requested-With',
  'Content-Type',
  'Accept',
  'Authorization',
  'X-Session-Token',
  'X-API-Key',
  'X-Request-ID',
];

// Exposed headers
const exposedHeaders = [
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
  'X-Request-ID',
];

/**
 * Check if origin is allowed
 */
const isOriginAllowed = (origin: string): boolean => {
  return allowedOrigins.includes(origin) || allowedOrigins.includes('*');
};

/**
 * CORS middleware
 */
export const cors = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    // Set CORS headers for preflight
    if (origin && isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
    }
    
    res.setHeader('Access-Control-Allow-Methods', allowedMethods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    return res.status(204).end();
  }

  // Set CORS headers for actual requests
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }

  res.setHeader('Access-Control-Allow-Methods', allowedMethods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
  res.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '));
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle CORS errors
  if (origin && !isOriginAllowed(origin)) {
    logger.warn(`CORS blocked request from origin: ${origin}`);
    return res.status(403).json({
      success: false,
      error: {
        code: 'CORS_ERROR',
        message: 'Origin not allowed',
      },
    });
  }

  next();
};

/**
 * Dynamic CORS middleware with custom options
 */
export const corsWithOptions = (options: {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}) => {
  const {
    allowedOrigins: customOrigins = allowedOrigins,
    allowedMethods: customMethods = allowedMethods,
    allowedHeaders: customHeaders = allowedHeaders,
    exposedHeaders: customExposed = exposedHeaders,
    credentials = true,
    maxAge = 86400,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    const isOriginAllowed = (origin: string): boolean => {
      return customOrigins.includes(origin) || customOrigins.includes('*');
    };

    if (req.method === 'OPTIONS') {
      if (origin && isOriginAllowed(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      
      res.setHeader('Access-Control-Allow-Methods', customMethods.join(', '));
      res.setHeader('Access-Control-Allow-Headers', customHeaders.join(', '));
      res.setHeader('Access-Control-Max-Age', maxAge.toString());
      
      if (credentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      
      return res.status(204).end();
    }

    if (origin && isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', customMethods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', customHeaders.join(', '));
    res.setHeader('Access-Control-Expose-Headers', customExposed.join(', '));
    
    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    next();
  };
};