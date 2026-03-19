/**
 * Targeting Controller
 * Handles HTTP requests for targeting operations
 */

import { Request, Response } from 'express';
import { targetingService } from '../services/targeting.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class TargetingController {
  /**
   * Estimate audience size
   */
  async estimateAudience(req: Request, res: Response) {
    try {
      const { criteria } = req.body;

      // Validate criteria
      const errors = targetingService.validateTargeting(criteria);
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

      const size = await targetingService.estimateAudienceSize(criteria);

      return res.json({
        success: true,
        data: { size, criteria },
      });
    } catch (error) {
      logger.error('Error in estimateAudience:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to estimate audience size',
        },
      });
    }
  }

  /**
   * Validate targeting criteria
   */
  async validateTargeting(req: Request, res: Response) {
    try {
      const { criteria } = req.body;

      const errors = targetingService.validateTargeting(criteria);

      return res.json({
        success: true,
        data: {
          isValid: errors.length === 0,
          errors,
        },
      });
    } catch (error) {
      logger.error('Error in validateTargeting:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to validate targeting',
        },
      });
    }
  }

  /**
   * Create audience segment
   */
  async createAudienceSegment(req: Request, res: Response) {
    try {
      const { name, criteria } = req.body;

      if (!name || !criteria) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Name and criteria are required',
          },
        });
      }

      const errors = targetingService.validateTargeting(criteria);
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

      const segment = await targetingService.createAudienceSegment(name, criteria);

      return res.status(201).json({
        success: true,
        data: segment,
        message: 'Audience segment created successfully',
      });
    } catch (error) {
      logger.error('Error in createAudienceSegment:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to create audience segment',
        },
      });
    }
  }

  /**
   * Get audience segments
   */
  async getAudienceSegments(req: Request, res: Response) {
    try {
      const segments = await targetingService.getAudienceSegments();

      return res.json({
        success: true,
        data: segments,
      });
    } catch (error) {
      logger.error('Error in getAudienceSegments:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get audience segments',
        },
      });
    }
  }

  /**
   * Update audience segment
   */
  async updateAudienceSegment(req: Request, res: Response) {
    try {
      const { segmentId } = req.params;
      const { name, criteria } = req.body;

      if (criteria) {
        const errors = targetingService.validateTargeting(criteria);
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

      const segment = await targetingService.updateAudienceSegment(segmentId, name, criteria);

      return res.json({
        success: true,
        data: segment,
        message: 'Audience segment updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateAudienceSegment:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to update audience segment',
        },
      });
    }
  }

  /**
   * Delete audience segment
   */
  async deleteAudienceSegment(req: Request, res: Response) {
    try {
      const { segmentId } = req.params;

      await targetingService.deleteAudienceSegment(segmentId);

      return res.json({
        success: true,
        message: 'Audience segment deleted successfully',
      });
    } catch (error) {
      logger.error('Error in deleteAudienceSegment:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to delete audience segment',
        },
      });
    }
  }

  /**
   * Check if user matches targeting
   */
  async checkUserMatch(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { criteria } = req.body;

      const matches = await targetingService.userMatchesTargeting(userId, criteria);

      return res.json({
        success: true,
        data: { matches },
      });
    } catch (error) {
      logger.error('Error in checkUserMatch:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to check user match',
        },
      });
    }
  }
}

export const targetingController = new TargetingController();