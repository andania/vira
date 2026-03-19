/**
 * Ad Middleware
 * Ad-specific middleware functions
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../../core/database/client';
import { logger } from '../../../../../core/logger';
import { ApiErrorCode } from '@viraz/shared';

/**
 * Check if ad exists
 */
export const adExists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adId = req.params.adId || req.body.adId;
    
    if (!adId) {
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Ad ID required',
        },
      });
    }

    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      include: {
        campaign: {
          include: {
            brand: true,
          },
        },
      },
    });

    if (!ad) {
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: 'Ad not found',
        },
      });
    }

    req.ad = ad;
    next();
  } catch (error) {
    logger.error('Error in adExists middleware:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to verify ad',
      },
    });
  }
};

/**
 * Check if user owns the ad
 */
export const ownsAd = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const ad = req.ad;

  if (!ad) {
    return res.status(404).json({
      success: false,
      error: {
        code: ApiErrorCode.RESOURCE_NOT_FOUND,
        message: 'Ad not found',
      },
    });
  }

  // Check if user is the brand owner
  if (ad.campaign?.brand?.sponsorId !== userId) {
    return res.status(403).json({
      success: false,
      error: {
        code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
        message: 'You do not own this ad',
      },
    });
  }

  next();
};

/**
 * Validate ad content based on type
 */
export const validateAdContent = (req: Request, res: Response, next: NextFunction) => {
  const { type, content } = req.body;

  if (!type || !content) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Ad type and content are required',
      },
    });
  }

  switch (type) {
    case 'video':
      if (!content.mediaUrls || content.mediaUrls.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Video ad must have at least one media URL',
          },
        });
      }
      break;

    case 'image':
      if (!content.mediaUrls || content.mediaUrls.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Image ad must have at least one image URL',
          },
        });
      }
      break;

    case 'carousel':
      if (!content.mediaUrls || content.mediaUrls.length < 2) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Carousel ad must have at least 2 images',
          },
        });
      }
      if (content.mediaUrls.length > 10) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Carousel ad cannot have more than 10 images',
          },
        });
      }
      break;

    case 'text':
      if (!content.title && !content.body) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Text ad must have title or body',
          },
        });
      }
      break;

    case 'poll':
      if (!content.pollOptions || content.pollOptions.length < 2) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Poll ad must have at least 2 options',
          },
        });
      }
      if (content.pollOptions.length > 10) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Poll ad cannot have more than 10 options',
          },
        });
      }
      break;
  }

  next();
};

/**
 * Validate asset upload
 */
export const validateAssetUpload = (req: Request, res: Response, next: NextFunction) => {
  const { type } = req.body;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'No file uploaded',
      },
    });
  }

  // Validate file type based on asset type
  const fileType = req.file.mimetype;

  switch (type) {
    case 'image':
      if (!fileType.startsWith('image/')) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'File must be an image',
          },
        });
      }
      break;

    case 'video':
      if (!fileType.startsWith('video/')) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'File must be a video',
          },
        });
      }
      break;

    case 'audio':
      if (!fileType.startsWith('audio/')) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'File must be an audio file',
          },
        });
      }
      break;

    case 'document':
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(fileType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'File must be a PDF or Word document',
          },
        });
      }
      break;
  }

  next();
};