/**
 * Content Moderation Controller
 * Handles HTTP requests for AI-powered content moderation
 */

import { Request, Response } from 'express';
import { contentModerationService } from '../services/content.moderation.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class ModerationController {
  /**
   * Moderate text content
   */
  async moderateText(req: Request, res: Response) {
    try {
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Content is required',
          },
        });
      }

      const result = await contentModerationService.moderateText(content);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error in moderateText:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to moderate text',
        },
      });
    }
  }

  /**
   * Moderate image content
   */
  async moderateImage(req: Request, res: Response) {
    try {
      const { imageUrl } = req.body;

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Image URL is required',
          },
        });
      }

      const result = await contentModerationService.moderateImage(imageUrl);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error in moderateImage:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to moderate image',
        },
      });
    }
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats(req: Request, res: Response) {
    try {
      const stats = await contentModerationService.getModerationStats();

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getModerationStats:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get moderation statistics',
        },
      });
    }
  }

  /**
   * Get moderation rules
   */
  async getModerationRules(req: Request, res: Response) {
    try {
      const rules = contentModerationService.getModerationRules();

      return res.json({
        success: true,
        data: rules,
      });
    } catch (error) {
      logger.error('Error in getModerationRules:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get moderation rules',
        },
      });
    }
  }

  /**
   * Update moderation rules (admin only)
   */
  async updateModerationRules(req: Request, res: Response) {
    try {
      const { rules } = req.body;

      if (!rules) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Rules are required',
          },
        });
      }

      await contentModerationService.updateModerationRules(rules);

      return res.json({
        success: true,
        message: 'Moderation rules updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateModerationRules:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to update moderation rules',
        },
      });
    }
  }
}

export const moderationController = new ModerationController();