/**
 * Sponsor Middleware
 * Sponsor-specific middleware functions
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../../core/database/client';
import { logger } from '../../../../../core/logger';
import { redis } from '../../../../../core/cache/redis.client';
import { ApiErrorCode } from '@viraz/shared';

/**
 * Check if user has sponsor role
 */
export const requireSponsor = (req: Request, res: Response, next: NextFunction) => {
  const userRole = req.user?.role;

  if (userRole !== 'SPONSOR' && userRole !== 'ADMIN') {
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
 * Check if sponsor is verified
 */
export const requireVerifiedSponsor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    const sponsor = await prisma.sponsor.findUnique({
      where: { id: userId },
    });

    if (!sponsor) {
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: 'Sponsor profile not found',
        },
      });
    }

    if (sponsor.verificationStatus !== 'verified') {
      return res.status(403).json({
        success: false,
        error: {
          code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
          message: 'Sponsor account must be verified to perform this action',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in requireVerifiedSponsor middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to verify sponsor status',
      },
    });
  }
};

/**
 * Check if sponsor owns brand
 */
export const ownsBrand = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const brandId = req.params.brandId || req.body.brandId;

    const brand = await prisma.brand.findFirst({
      where: {
        id: brandId,
        sponsorId: userId,
      },
    });

    if (!brand) {
      return res.status(403).json({
        success: false,
        error: {
          code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
          message: 'You do not own this brand',
        },
      });
    }

    req.brand = brand;
    next();
  } catch (error) {
    logger.error('Error in ownsBrand middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to verify brand ownership',
      },
    });
  }
};

/**
 * Check sponsor credit limit
 */
export const checkCreditLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { totalBudget } = req.body;

    if (!totalBudget) {
      return next();
    }

    const sponsor = await prisma.sponsor.findUnique({
      where: { id: userId },
    });

    if (!sponsor) {
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: 'Sponsor not found',
        },
      });
    }

    // Get current spend
    const currentSpend = await prisma.campaign.aggregate({
      where: {
        brand: {
          sponsorId: userId,
        },
        status: { in: ['ACTIVE', 'SCHEDULED'] },
      },
      _sum: {
        totalBudget: true,
      },
    });

    const totalCommitted = currentSpend._sum.totalBudget || 0;
    const remainingCredit = sponsor.creditLimit - totalCommitted;

    if (totalBudget > remainingCredit) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.INSUFFICIENT_FUNDS,
          message: `Insufficient credit. Available: $${remainingCredit}`,
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in checkCreditLimit middleware:', error);
    next();
  }
};

/**
 * Rate limit for sponsor operations
 */
export const sponsorRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const key = `ratelimit:sponsor:${userId}`;
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
          message: 'Too many sponsor operations. Please try again later.',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in sponsorRateLimit middleware:', error);
    next();
  }
};

/**
 * Validate business details
 */
export const validateBusinessDetails = (req: Request, res: Response, next: NextFunction) => {
  const { businessDetails } = req.body;

  if (!businessDetails) {
    return next();
  }

  const requiredFields = ['legalName', 'registrationNumber', 'businessAddress', 'businessPhone', 'businessEmail'];
  
  for (const field of requiredFields) {
    if (!businessDetails[field]) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: `Business details: ${field} is required`,
        },
      });
    }
  }

  next();
};

/**
 * Check brand name availability
 */
export const checkBrandNameAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    const brandId = req.params.brandId;

    if (!name) {
      return next();
    }

    const existingBrand = await prisma.brand.findFirst({
      where: {
        name,
        ...(brandId ? { NOT: { id: brandId } } : {}),
      },
    });

    if (existingBrand) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.DUPLICATE_VALUE,
          message: 'Brand name already exists',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in checkBrandNameAvailability middleware:', error);
    next();
  }
};

/**
 * Log sponsor action
 */
export const logSponsorAction = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to log after response
    res.json = function(body) {
      if (body.success) {
        setImmediate(() => {
          prisma.auditLog.create({
            data: {
              userId: req.user?.id,
              action: `SPONSOR_${action}`,
              resourceType: 'sponsor',
              resourceId: req.params.brandId || req.params.verificationId,
              newValues: {
                method: req.method,
                path: req.path,
                body: req.body,
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
 * Validate file upload for verification
 */
export const validateVerificationFiles = (req: Request, res: Response, next: NextFunction) => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'At least one verification document is required',
      },
    });
  }

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  for (const file of files) {
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.INVALID_FILE_TYPE,
          message: `File type ${file.mimetype} not allowed. Allowed: PDF, JPEG, PNG`,
        },
      });
    }

    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.FILE_TOO_LARGE,
          message: 'File size exceeds 10MB limit',
        },
      });
    }
  }

  next();
};