/**
 * Admin Middleware
 * Admin-specific middleware functions
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../../core/database/client';
import { logger } from '../../../../../core/logger';
import { redis } from '../../../../../core/cache/redis.client';
import { ApiErrorCode } from '@viraz/shared';

/**
 * Check if user has admin privileges
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const userRole = req.user?.role;

  if (userRole !== 'ADMIN') {
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

/**
 * Check if user has moderator privileges (admin or moderator)
 */
export const requireModerator = (req: Request, res: Response, next: NextFunction) => {
  const userRole = req.user?.role;

  if (userRole !== 'ADMIN' && userRole !== 'MODERATOR') {
    return res.status(403).json({
      success: false,
      error: {
        code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
        message: 'Moderator access required',
      },
    });
  }

  next();
};

/**
 * Rate limit for admin actions
 */
export const adminRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const adminId = req.user?.id;
  const action = req.path + req.method;
  
  const key = `ratelimit:admin:${adminId}:${action}`;
  const limit = 200; // 200 operations per hour
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
          message: 'Too many admin operations. Please try again later.',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in adminRateLimit middleware:', error);
    next(); // Proceed on error
  }
};

/**
 * Log admin action
 */
export const logAdminAction = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to log after response
    res.json = function(body) {
      if (body.success) {
        // Log admin action asynchronously
        setImmediate(() => {
          prisma.auditLog.create({
            data: {
              userId: req.user?.id,
              action,
              resourceType: req.params.resourceType,
              resourceId: req.params.resourceId,
              newValues: {
                method: req.method,
                path: req.path,
                body: req.body,
                query: req.query,
              },
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'],
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
 * Validate user exists
 */
export const validateUserExists = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.params.userId || req.body.userId;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'User ID required',
      },
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: 'User not found',
        },
      });
    }

    req.targetUser = user;
    next();
  } catch (error) {
    logger.error('Error in validateUserExists middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to validate user',
      },
    });
  }
};

/**
 * Validate report exists
 */
export const validateReportExists = async (req: Request, res: Response, next: NextFunction) => {
  const reportId = req.params.reportId;

  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: 'Report not found',
        },
      });
    }

    req.report = report;
    next();
  } catch (error) {
    logger.error('Error in validateReportExists middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to validate report',
      },
    });
  }
};

/**
 * Validate fraud alert exists
 */
export const validateFraudAlertExists = async (req: Request, res: Response, next: NextFunction) => {
  const alertId = req.params.alertId;

  try {
    const alert = await prisma.fraudAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: 'Fraud alert not found',
        },
      });
    }

    req.fraudAlert = alert;
    next();
  } catch (error) {
    logger.error('Error in validateFraudAlertExists middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to validate fraud alert',
      },
    });
  }
};

/**
 * Check maintenance mode
 */
export const checkMaintenanceMode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { settingKey: 'maintenance.mode' },
    });

    const maintenanceMode = setting?.settingValue === 'true';

    if (maintenanceMode) {
      // Allow admin access during maintenance
      if (req.user?.role === 'ADMIN') {
        return next();
      }

      return res.status(503).json({
        success: false,
        error: {
          code: ApiErrorCode.SERVICE_UNAVAILABLE,
          message: 'Platform is under maintenance. Please try again later.',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in checkMaintenanceMode middleware:', error);
    next();
  }
};

/**
 * Validate date range for reports
 */
export const validateDateRange = (req: Request, res: Response, next: NextFunction) => {
  const { startDate, endDate } = req.query;

  if (startDate && endDate) {
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

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
 * Sanitize admin input
 */
export const sanitizeAdminInput = (req: Request, res: Response, next: NextFunction) => {
  // Remove any sensitive fields from logs
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
  
  if (req.body) {
    for (const field of sensitiveFields) {
      if (req.body[field]) {
        req.body[field] = '[REDACTED]';
      }
    }
  }

  next();
};