/**
 * Ad Controller
 * Handles HTTP requests for ad operations
 */

import { Request, Response } from 'express';
import { adService } from '../services/ad.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class AdController {
  /**
   * Create ad
   */
  async createAd(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const data = {
        ...req.body,
        createdBy: userId,
      };

      const ad = await adService.createAd(data);

      return res.status(201).json({
        success: true,
        data: ad,
        message: 'Ad created successfully',
      });
    } catch (error) {
      logger.error('Error in createAd:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to create ad',
        },
      });
    }
  }

  /**
   * Get ad by ID
   */
  async getAd(req: Request, res: Response) {
    try {
      const { adId } = req.params;

      const ad = await adService.getAdById(adId);

      return res.json({
        success: true,
        data: ad,
      });
    } catch (error) {
      logger.error('Error in getAd:', error);
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: 'Ad not found',
        },
      });
    }
  }

  /**
   * Update ad
   */
  async updateAd(req: Request, res: Response) {
    try {
      const { adId } = req.params;

      const ad = await adService.updateAd(adId, req.body);

      return res.json({
        success: true,
        data: ad,
        message: 'Ad updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateAd:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update ad',
        },
      });
    }
  }

  /**
   * Delete ad
   */
  async deleteAd(req: Request, res: Response) {
    try {
      const { adId } = req.params;

      await adService.deleteAd(adId);

      return res.json({
        success: true,
        message: 'Ad deleted successfully',
      });
    } catch (error) {
      logger.error('Error in deleteAd:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to delete ad',
        },
      });
    }
  }

  /**
   * Upload ad asset
   */
  async uploadAsset(req: Request, res: Response) {
    try {
      const { adId } = req.params;
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

      if (!type) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Asset type is required',
          },
        });
      }

      const asset = await adService.uploadAdAsset(adId, req.file, type);

      return res.json({
        success: true,
        data: asset,
        message: 'Asset uploaded successfully',
      });
    } catch (error) {
      logger.error('Error in uploadAsset:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to upload asset',
        },
      });
    }
  }

  /**
   * Delete ad asset
   */
  async deleteAsset(req: Request, res: Response) {
    try {
      const { assetId } = req.params;

      await adService.deleteAdAsset(assetId);

      return res.json({
        success: true,
        message: 'Asset deleted successfully',
      });
    } catch (error) {
      logger.error('Error in deleteAsset:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to delete asset',
        },
      });
    }
  }

  /**
   * Get ads by campaign
   */
  async getAdsByCampaign(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;

      const ads = await adService.getAdsByCampaign(campaignId);

      return res.json({
        success: true,
        data: ads,
      });
    } catch (error) {
      logger.error('Error in getAdsByCampaign:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get ads',
        },
      });
    }
  }

  /**
   * Get ad analytics
   */
  async getAdAnalytics(req: Request, res: Response) {
    try {
      const { adId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Start date and end date are required',
          },
        });
      }

      const analytics = await adService.getAdAnalytics(
        adId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      return res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Error in getAdAnalytics:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get ad analytics',
        },
      });
    }
  }

  /**
   * Duplicate ad
   */
  async duplicateAd(req: Request, res: Response) {
    try {
      const { adId } = req.params;
      const { campaignId } = req.body;

      const ad = await adService.duplicateAd(adId, campaignId);

      return res.status(201).json({
        success: true,
        data: ad,
        message: 'Ad duplicated successfully',
      });
    } catch (error) {
      logger.error('Error in duplicateAd:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to duplicate ad',
        },
      });
    }
  }
}

export const adController = new AdController();