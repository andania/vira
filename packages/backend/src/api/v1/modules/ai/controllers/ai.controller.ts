/**
 * AI Controller
 * Main controller for AI operations
 */

import { Request, Response } from 'express';
import { aiService } from '../services/ai.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class AIController {
  /**
   * Process AI request
   */
  async processRequest(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { type, data } = req.body;

      if (!type || !data) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Request type and data are required',
          },
        });
      }

      const result = await aiService.processRequest({
        type,
        data,
        userId,
      });

      return res.json({
        success: result.success,
        data: result.data,
        error: result.error,
        meta: {
          processingTime: result.processingTime,
        },
      });
    } catch (error) {
      logger.error('Error in processRequest:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to process AI request',
        },
      });
    }
  }

  /**
   * Get AI usage statistics (admin only)
   */
  async getUsageStats(req: Request, res: Response) {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;

      const stats = await aiService.getUsageStats(days);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getUsageStats:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get AI usage statistics',
        },
      });
    }
  }

  /**
   * Get AI health status
   */
  async getHealth(req: Request, res: Response) {
    try {
      const health = await aiService.getHealth();

      return res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      logger.error('Error in getHealth:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get AI health',
        },
      });
    }
  }

  /**
   * Clear AI cache (admin only)
   */
  async clearCache(req: Request, res: Response) {
    try {
      const { type } = req.body;

      await aiService.clearCache(type);

      return res.json({
        success: true,
        message: 'AI cache cleared successfully',
      });
    } catch (error) {
      logger.error('Error in clearCache:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to clear AI cache',
        },
      });
    }
  }

  /**
   * Train AI models (admin only)
   */
  async trainModels(req: Request, res: Response) {
    try {
      const { models } = req.body;

      if (!models || !Array.isArray(models) || models.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Models array is required',
          },
        });
      }

      const results = await aiService.trainModels(models);

      return res.json({
        success: true,
        data: results,
        message: 'Model training initiated',
      });
    } catch (error) {
      logger.error('Error in trainModels:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to train models',
        },
      });
    }
  }

  /**
   * Get available AI features
   */
  async getFeatures(req: Request, res: Response) {
    try {
      const features = [
        {
          name: 'recommendation',
          description: 'Personalized content recommendations',
          endpoints: ['/recommendations', '/recommendations/:itemId/explain'],
        },
        {
          name: 'personalization',
          description: 'User behavior analysis and personalization',
          endpoints: ['/personalization/profile', '/personalization/segments'],
        },
        {
          name: 'trend',
          description: 'Trend detection and prediction',
          endpoints: ['/trend/current', '/trend/predict/:itemId/:itemType'],
        },
        {
          name: 'fraud',
          description: 'AI-powered fraud detection',
          endpoints: ['/fraud/analyze/:userId', '/fraud/takeover/:userId'],
        },
        {
          name: 'moderation',
          description: 'Automated content moderation',
          endpoints: ['/moderation/text', '/moderation/image'],
        },
      ];

      return res.json({
        success: true,
        data: features,
      });
    } catch (error) {
      logger.error('Error in getFeatures:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get AI features',
        },
      });
    }
  }

  /**
   * Get AI model performance metrics (admin only)
   */
  async getModelPerformance(req: Request, res: Response) {
    try {
      // This would fetch actual model metrics from ML tracking system
      const metrics = {
        recommendation: {
          accuracy: 0.85,
          precision: 0.82,
          recall: 0.79,
          lastTraining: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        fraud: {
          accuracy: 0.92,
          precision: 0.89,
          recall: 0.87,
          lastTraining: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
        moderation: {
          accuracy: 0.88,
          precision: 0.85,
          recall: 0.83,
          lastTraining: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      };

      return res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error('Error in getModelPerformance:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to get model performance',
        },
      });
    }
  }

  /**
   * Test AI endpoint (for development)
   */
  async test(req: Request, res: Response) {
    try {
      const { type, input } = req.body;

      let output;

      switch (type) {
        case 'echo':
          output = { message: 'AI service is working', input };
          break;
        case 'mock-recommendation':
          output = {
            recommendations: [
              { id: '1', type: 'ad', score: 0.95 },
              { id: '2', type: 'room', score: 0.87 },
              { id: '3', type: 'product', score: 0.76 },
            ],
          };
          break;
        default:
          output = { message: 'Test successful' };
      }

      return res.json({
        success: true,
        data: output,
        meta: {
          timestamp: new Date(),
          type,
        },
      });
    } catch (error) {
      logger.error('Error in test:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Test failed',
        },
      });
    }
  }
}

export const aiController = new AIController();