/**
 * Authentication Middleware
 * Handles JWT verification and user authentication
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../core/database/client';
import { redis } from '../../../core/cache/redis.client';
import { jwtService } from '../../v1/modules/auth/services/jwt.service';
import { logger } from '../../../core/logger';
import { ApiErrorCode } from '@viraz/shared';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      session?: any;
    }
  }
}

/**
 * Authenticate user via JWT token
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: ApiErrorCode.UNAUTHORIZED,
          message: 'Authentication required',
        },
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const payload = jwtService.verifyAccessToken(token);
    if (!payload) {
      return res.status(401).json({
        success: false,
        error: {
          code: ApiErrorCode.INVALID_TOKEN,
          message: 'Invalid or expired token',
        },
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await jwtService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        error: {
          code: ApiErrorCode.TOKEN_REVOKED,
          message: 'Token has been revoked',
        },
      });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: ApiErrorCode.UNAUTHORIZED,
          message: 'User not found',
        },
      });
    }

    // Check user status
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: {
          code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
          message: `Account is ${user.status.toLowerCase()}`,
        },
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Authentication failed',
      },
    });
  }
};

/**
 * Optional authentication (doesn't fail if no token)
 */
export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = jwtService.verifyAccessToken(token);
      
      if (payload) {
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
        });
        if (user && user.status === 'ACTIVE') {
          req.user = user;
        }
      }
    }
    
    next();
  } catch (error) {
    // Continue without user
    next();
  }
};

/**
 * Authorize by role
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: ApiErrorCode.UNAUTHORIZED,
          message: 'Authentication required',
        },
      });
    }

    if (!roles.includes(req.user.accountType)) {
      return res.status(403).json({
        success: false,
        error: {
          code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
          message: 'Insufficient permissions',
        },
      });
    }

    next();
  };
};

/**
 * Check if user is verified
 */
export const requireVerified = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'Authentication required',
      },
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      error: {
        code: ApiErrorCode.ACCOUNT_NOT_VERIFIED,
        message: 'Email not verified',
      },
    });
  }

  next();
};

/**
 * Check if user is sponsor
 */
export const requireSponsor = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'Authentication required',
      },
    });
  }

  if (req.user.accountType !== 'SPONSOR' && req.user.accountType !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: {
        code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
        message: 'Sponsor access required',
      },
    });
  }

  next();
};

/**
 * Check if user is admin
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'Authentication required',
      },
    });
  }

  if (req.user.accountType !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: {
        code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
        message: 'Admin access required',
      },
    });
  }

  next();
};