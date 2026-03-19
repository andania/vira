/**
 * Suggestion Controller
 * Handles HTTP requests for suggestion operations
 */

import { Request, Response } from 'express';
import { suggestionService } from '../services/suggestion.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class SuggestionController {
  /**
   * Create suggestion
   */
  async createSuggestion(req: Request, res: Response) {
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

      const { targetType, targetId, title, content, category } = req.body;

      if (!targetType || !targetId || !title || !content || !category) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Target type, target ID, title, content, and category are required',
          },
        });
      }

      const suggestion = await suggestionService.createSuggestion({
        userId,
        targetType,
        targetId,
        title,
        content,
        category,
      });

      return res.status(201).json({
        success: true,
        data: suggestion,
        message: 'Suggestion created successfully',
      });
    } catch (error) {
      logger.error('Error in createSuggestion:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to create suggestion',
        },
      });
    }
  }

  /**
   * Get suggestions
   */
  async getSuggestions(req: Request, res: Response) {
    try {
      const { targetType, targetId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const status = req.query.status as string;
      const category = req.query.category as string;
      const sortBy = req.query.sortBy as 'recent' | 'popular' | 'status' || 'recent';

      const suggestions = await suggestionService.getSuggestions(targetType, targetId, {
        status,
        category,
        limit,
        offset,
        sortBy,
      });

      return res.json({
        success: true,
        data: suggestions,
      });
    } catch (error) {
      logger.error('Error in getSuggestions:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get suggestions',
        },
      });
    }
  }

  /**
   * Get suggestion
   */
  async getSuggestion(req: Request, res: Response) {
    try {
      const { suggestionId } = req.params;

      const suggestion = await suggestionService.getSuggestion(suggestionId);

      return res.json({
        success: true,
        data: suggestion,
      });
    } catch (error) {
      logger.error('Error in getSuggestion:', error);
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: error.message || 'Suggestion not found',
        },
      });
    }
  }

  /**
   * Update suggestion status (for content owners/admins)
   */
  async updateSuggestionStatus(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { suggestionId } = req.params;
      const { status, feedback } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Status is required',
          },
        });
      }

      const suggestion = await suggestionService.updateSuggestionStatus(
        suggestionId,
        userId,
        status,
        feedback
      );

      return res.json({
        success: true,
        data: suggestion,
        message: `Suggestion ${status} successfully`,
      });
    } catch (error) {
      logger.error('Error in updateSuggestionStatus:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update suggestion status',
        },
      });
    }
  }

  /**
   * Vote on suggestion
   */
  async voteSuggestion(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { suggestionId } = req.params;
      const { vote } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      if (!vote || (vote !== 'up' && vote !== 'down')) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Valid vote (up/down) is required',
          },
        });
      }

      const result = await suggestionService.voteSuggestion(suggestionId, userId, vote);

      return res.json({
        success: true,
        data: result,
        message: `Vote ${result.action} successfully`,
      });
    } catch (error) {
      logger.error('Error in voteSuggestion:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to vote on suggestion',
        },
      });
    }
  }

  /**
   * Add comment to suggestion
   */
  async addComment(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { suggestionId } = req.params;
      const { content } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      if (!content) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Content is required',
          },
        });
      }

      const comment = await suggestionService.addComment(suggestionId, userId, content);

      return res.status(201).json({
        success: true,
        data: comment,
        message: 'Comment added successfully',
      });
    } catch (error) {
      logger.error('Error in addComment:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to add comment',
        },
      });
    }
  }

  /**
   * Get suggestion statistics
   */
  async getSuggestionStats(req: Request, res: Response) {
    try {
      const { targetType, targetId } = req.params;

      const stats = await suggestionService.getSuggestionStats(targetType, targetId);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getSuggestionStats:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get suggestion statistics',
        },
      });
    }
  }
}

export const suggestionController = new SuggestionController();