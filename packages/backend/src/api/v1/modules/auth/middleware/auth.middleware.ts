/**
 * Auth Middleware
 * Authentication and authorization middleware
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../../core/database/client';
import { redis } from '../../../../../core/cache/redis.client';
import { jwtService } from '../services/jwt.service';
import { sessionService } from '../services/session.service';
import { logger } from '../../../../../core/logger';
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
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
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
 * Check if user has permission
 */
export const hasPermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      // Admin has all permissions
      if (req.user.accountType === 'ADMIN') {
        return next();
      }

      // Get user permissions
      const permissions = await prisma.userPermission.findMany({
        where: {
          userId: req.user.id,
          permission: {
            resource,
            action,
          },
        },
      });

      if (permissions.length === 0) {
        // Check role permissions
        const rolePermissions = await prisma.rolePermission.findMany({
          where: {
            role: {
              userRoles: {
                some: {
                  userId: req.user.id,
                },
              },
            },
            permission: {
              resource,
              action,
            },
          },
        });

        if (rolePermissions.length === 0) {
          return res.status(403).json({
            success: false,
            error: {
              code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
              message: 'Insufficient permissions',
            },
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Permission check failed',
        },
      });
    }
  };
};

/**
 * Rate limit for authentication endpoints
 */
export const authRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip;
  const endpoint = req.path;
  
  const key = `ratelimit:auth:${ip}:${endpoint}`;
  const limits: Record<string, number> = {
    '/login': 5, // 5 attempts per 15 minutes
    '/register': 3, // 3 registrations per hour
    '/password-reset': 3, // 3 requests per hour
    '/verify-email': 5, // 5 attempts per hour
    '/verify-phone': 5, // 5 attempts per hour
  };

  const limit = limits[endpoint] || 10;
  const windowMs = 15 * 60 * 1000; // 15 minutes

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
          message: 'Too many attempts. Please try again later.',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Rate limit error:', error);
    next();
  }
};

/**
 * Validate session
 */
export const validateSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionToken = req.headers['x-session-token'] as string;
    
    if (!sessionToken) {
      return next();
    }

    const session = await sessionService.getSessionByToken(sessionToken);
    
    if (session) {
      req.session = session;
      await sessionService.updateSessionActivity(session.id);
    }

    next();
  } catch (error) {
    logger.error('Session validation error:', error);
    next();
  }
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
 * Check if 2FA is enabled and verified
 */
export const requireTwoFactor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: ApiErrorCode.UNAUTHORIZED,
          message: 'Authentication required',
        },
      });
    }

    const twoFactor = await prisma.twoFactorAuth.findUnique({
      where: { userId: req.user.id },
    });

    if (twoFactor?.enabled) {
      const twoFactorVerified = req.headers['x-2fa-token'];
      
      if (!twoFactorVerified) {
        return res.status(403).json({
          success: false,
          error: {
            code: ApiErrorCode.TWO_FACTOR_REQUIRED,
            message: 'Two-factor authentication required',
          },
        });
      }

      // Verify 2FA token (implement based on your 2FA method)
      const isValid = await verifyTwoFactorToken(req.user.id, twoFactorVerified as string);
      
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.INVALID_2FA_CODE,
            message: 'Invalid 2FA code',
          },
        });
      }
    }

    next();
  } catch (error) {
    logger.error('2FA check error:', error);
    next();
  }
};

/**
 * Verify 2FA token helper
 */
async function verifyTwoFactorToken(userId: string, token: string): Promise<boolean> {
  // Implement 2FA verification logic
  return true;
}