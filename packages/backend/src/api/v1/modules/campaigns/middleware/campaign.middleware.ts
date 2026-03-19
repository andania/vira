/**
 * Campaign Middleware
 * Campaign-specific middleware functions
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../../core/database/client';
import { logger } from '../../../../../core/logger';
import { ApiErrorCode } from '@viraz/shared';

/**
 * Check if campaign exists
 */
export const campaignExists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaignId = req.params.campaignId || req.body.campaignId;
    
    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Campaign ID required',
        },
      });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        brand: true,
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: 'Campaign not found',
        },
      });
    }

    req.campaign = campaign;
    next();
  } catch (error) {
    logger.error('Error in campaignExists middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to verify campaign',
      },
    });
  }
};

/**
 * Check if user owns the campaign
 */
export const ownsCampaign = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const campaign = req.campaign;

  if (!campaign) {
    return res.status(404).json({
      success: false,
      error: {
        code: ApiErrorCode.RESOURCE_NOT_FOUND,
        message: 'Campaign not found',
      },
    });
  }

  // Check if user is the brand owner
  if (campaign.brand?.sponsorId !== userId) {
    return res.status(403).json({
      success: false,
      error: {
        code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
        message: 'You do not own this campaign',
      },
    });
  }

  next();
};

/**
 * Check if campaign can be modified
 */
export const canModifyCampaign = (req: Request, res: Response, next: NextFunction) => {
  const campaign = req.campaign;

  if (!campaign) {
    return res.status(404).json({
      success: false,
      error: {
        code: ApiErrorCode.RESOURCE_NOT_FOUND,
        message: 'Campaign not found',
      },
    });
  }

  // Campaigns can only be modified in DRAFT or PAUSED state
  if (campaign.status !== 'DRAFT' && campaign.status !== 'PAUSED') {
    return res.status(403).json({
      success: false,
      error: {
        code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
        message: `Campaign cannot be modified in ${campaign.status} state`,
      },
    });
  }

  next();
};

/**
 * Check if campaign can be launched
 */
export const canLaunchCampaign = async (req: Request, res: Response, next: NextFunction) => {
  const campaign = req.campaign;

  if (!campaign) {
    return res.status(404).json({
      success: false,
      error: {
        code: ApiErrorCode.RESOURCE_NOT_FOUND,
        message: 'Campaign not found',
      },
    });
  }

  // Check if campaign has at least one ad
  const adCount = await prisma.ad.count({
    where: { campaignId: campaign.id },
  });

  if (adCount === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Campaign must have at least one ad',
      },
    });
  }

  // Check if campaign has budget
  if (campaign.totalBudget <= 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Campaign must have a budget greater than 0',
      },
    });
  }

  next();
};

/**
 * Validate campaign dates
 */
export const validateCampaignDates = (req: Request, res: Response, next: NextFunction) => {
  const { startDate, endDate } = req.body;

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'End date must be after start date',
        },
      });
    }

    // Check if dates are in the past
    const now = new Date();
    if (start < now) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Start date cannot be in the past',
        },
      });
    }
  }

  next();
};

/**
 * Rate limit for campaign operations
 */
export const campaignRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const operation = req.method + req.path;
  const limit = 50; // Max 50 operations per hour
  const timeWindow = 60 * 60 * 1000; // 1 hour

  try {
    // This would use Redis to track rate limits
    // Simplified version for now
    next();
  } catch (error) {
    logger.error('Error in campaignRateLimit:', error);
    next();
  }
};

/**
 * Validate campaign budget
 */
export const validateCampaignBudget = (req: Request, res: Response, next: NextFunction) => {
  const { totalBudget, dailyBudget } = req.body;

  if (totalBudget !== undefined) {
    if (totalBudget < 10) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Total budget must be at least $10',
        },
      });
    }

    if (totalBudget > 100000) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Total budget cannot exceed $100,000',
        },
      });
    }
  }

  if (dailyBudget !== undefined) {
    if (dailyBudget < 1) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Daily budget must be at least $1',
        },
      });
    }

    if (dailyBudget > 10000) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Daily budget cannot exceed $10,000',
        },
      });
    }
  }

  next();
};