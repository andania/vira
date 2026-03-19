/**
 * Campaign Controller
 * Handles HTTP requests for campaign operations
 */

import { Request, Response } from 'express';
import { campaignService } from '../services/campaign.service';
import { adService } from '../services/ad.service';
import { targetingService } from '../services/targeting.service';
import { budgetService } from '../services/budget.service';
import { schedulingService } from '../services/scheduling.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class CampaignController {
  /**
   * Create campaign
   */
  async createCampaign(req: Request, res: Response) {
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

      // Validate targeting if provided
      if (data.targeting) {
        const errors = targetingService.validateTargeting(data.targeting);
        if (errors.length > 0) {
          return res.status(400).json({
            success: false,
            error: {
              code: ApiErrorCode.VALIDATION_ERROR,
              message: 'Invalid targeting criteria',
              details: errors,
            },
          });
        }
      }

      // Validate dates
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      
      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'End date must be after start date',
          },
        });
      }

      const campaign = await campaignService.createCampaign(data);

      return res.status(201).json({
        success: true,
        data: campaign,
        message: 'Campaign created successfully',
      });
    } catch (error) {
      logger.error('Error in createCampaign:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to create campaign',
        },
      });
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;

      const campaign = await campaignService.getCampaignById(campaignId);

      return res.json({
        success: true,
        data: campaign,
      });
    } catch (error) {
      logger.error('Error in getCampaign:', error);
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: 'Campaign not found',
        },
      });
    }
  }

  /**
   * Update campaign
   */
  async updateCampaign(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { campaignId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      // Validate targeting if provided
      if (req.body.targeting) {
        const errors = targetingService.validateTargeting(req.body.targeting);
        if (errors.length > 0) {
          return res.status(400).json({
            success: false,
            error: {
              code: ApiErrorCode.VALIDATION_ERROR,
              message: 'Invalid targeting criteria',
              details: errors,
            },
          });
        }
      }

      const campaign = await campaignService.updateCampaign(campaignId, req.body, userId);

      return res.json({
        success: true,
        data: campaign,
        message: 'Campaign updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateCampaign:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update campaign',
        },
      });
    }
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { campaignId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await campaignService.deleteCampaign(campaignId, userId);

      return res.json({
        success: true,
        message: 'Campaign deleted successfully',
      });
    } catch (error) {
      logger.error('Error in deleteCampaign:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to delete campaign',
        },
      });
    }
  }

  /**
   * Launch campaign
   */
  async launchCampaign(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { campaignId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const campaign = await campaignService.launchCampaign(campaignId, userId);

      return res.json({
        success: true,
        data: campaign,
        message: 'Campaign launched successfully',
      });
    } catch (error) {
      logger.error('Error in launchCampaign:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to launch campaign',
        },
      });
    }
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { campaignId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const campaign = await campaignService.pauseCampaign(campaignId, userId);

      return res.json({
        success: true,
        data: campaign,
        message: 'Campaign paused successfully',
      });
    } catch (error) {
      logger.error('Error in pauseCampaign:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to pause campaign',
        },
      });
    }
  }

  /**
   * End campaign
   */
  async endCampaign(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { campaignId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const campaign = await campaignService.endCampaign(campaignId, userId);

      return res.json({
        success: true,
        data: campaign,
        message: 'Campaign ended successfully',
      });
    } catch (error) {
      logger.error('Error in endCampaign:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to end campaign',
        },
      });
    }
  }

  /**
   * Duplicate campaign
   */
  async duplicateCampaign(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { campaignId } = req.params;
      const { name } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const campaign = await campaignService.duplicateCampaign(campaignId, userId, name);

      return res.status(201).json({
        success: true,
        data: campaign,
        message: 'Campaign duplicated successfully',
      });
    } catch (error) {
      logger.error('Error in duplicateCampaign:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to duplicate campaign',
        },
      });
    }
  }

  /**
   * Get campaigns by brand
   */
  async getCampaignsByBrand(req: Request, res: Response) {
    try {
      const { brandId } = req.params;
      const filters = req.query;

      const result = await campaignService.getCampaignsByBrand(brandId, filters);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error in getCampaignsByBrand:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get campaigns',
        },
      });
    }
  }

  /**
   * Get campaign budget report
   */
  async getBudgetReport(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;
      const days = req.query.days ? parseInt(req.query.days as string) : 30;

      const report = await budgetService.getBudgetReport(campaignId, days);

      return res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error('Error in getBudgetReport:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get budget report',
        },
      });
    }
  }

  /**
   * Allocate budget to campaign
   */
  async allocateBudget(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;
      const { amount, currency } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Valid amount is required',
          },
        });
      }

      await budgetService.allocateBudget(campaignId, amount, currency);

      return res.json({
        success: true,
        message: 'Budget allocated successfully',
      });
    } catch (error) {
      logger.error('Error in allocateBudget:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to allocate budget',
        },
      });
    }
  }

  /**
   * Get campaign schedule
   */
  async getSchedule(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;

      const schedule = await schedulingService.getCampaignSchedule(campaignId);

      return res.json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      logger.error('Error in getSchedule:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get schedule',
        },
      });
    }
  }

  /**
   * Update campaign schedule
   */
  async updateSchedule(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;

      // Validate schedule
      const errors = schedulingService.validateSchedule(req.body);
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Invalid schedule configuration',
            details: errors,
          },
        });
      }

      await schedulingService.updateSchedule(campaignId, req.body);

      return res.json({
        success: true,
        message: 'Schedule updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateSchedule:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to update schedule',
        },
      });
    }
  }

  /**
   * Pause campaign schedule
   */
  async pauseSchedule(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;

      await schedulingService.pauseSchedule(campaignId);

      return res.json({
        success: true,
        message: 'Schedule paused successfully',
      });
    } catch (error) {
      logger.error('Error in pauseSchedule:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to pause schedule',
        },
      });
    }
  }

  /**
   * Resume campaign schedule
   */
  async resumeSchedule(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;

      await schedulingService.resumeSchedule(campaignId);

      return res.json({
        success: true,
        message: 'Schedule resumed successfully',
      });
    } catch (error) {
      logger.error('Error in resumeSchedule:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to resume schedule',
        },
      });
    }
  }
}

export const campaignController = new CampaignController();