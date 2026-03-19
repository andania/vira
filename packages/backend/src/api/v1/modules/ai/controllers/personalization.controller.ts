/**
 * Personalization Controller
 * Handles HTTP requests for user personalization
 */

import { Request, Response } from 'express';
import { personalizationService } from '../services/personalization.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class PersonalizationController {
  /**
   * Get user personalization profile
   */
  async getPersonalization(req: Request, res: Response) {
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

      const personalization = await personalizationService.getUserPersonalization(userId);

      return res.json({
        success: true,
        data: personalization,
      });
    } catch (error) {
      logger.error('Error in getPersonalization:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get personalization',
        },
      });
    }
  }

  /**
   * Get user segments
   */
  async getUserSegments(req: Request, res: Response) {
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

      const segments = await personalizationService.getUserSegments(userId);

      return res.json({
        success: true,
        data: segments,
      });
    } catch (error) {
      logger.error('Error in getUserSegments:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get user segments',
        },
      });
    }
  }

  /**
   * Get personalized notifications
   */
  async getPersonalizedNotifications(req: Request, res: Response) {
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

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const notifications = await personalizationService.getPersonalizedNotifications(userId, limit);

      return res.json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      logger.error('Error in getPersonalizedNotifications:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get personalized notifications',
        },
      });
    }
  }

  /**
   * Update personalization (track interaction)
   */
  async updatePersonalization(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { type, targetType, targetId } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      if (!type || !targetType || !targetId) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Type, targetType, and targetId are required',
          },
        });
      }

      await personalizationService.updatePersonalization(userId, {
        type,
        targetType,
        targetId,
      });

      return res.json({
        success: true,
        message: 'Personalization updated',
      });
    } catch (error) {
      logger.error('Error in updatePersonalization:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to update personalization',
        },
      });
    }
  }
}

export const personalizationController = new PersonalizationController();