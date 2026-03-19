/**
 * Comment Controller
 * Handles HTTP requests for comment operations
 */

import { Request, Response } from 'express';
import { commentService } from '../services/comment.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class CommentController {
  /**
   * Create comment
   */
  async createComment(req: Request, res: Response) {
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

      const { targetType, targetId, content, parentId } = req.body;

      if (!targetType || !targetId || !content) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Target type, target ID, and content are required',
          },
        });
      }

      const comment = await commentService.createComment({
        userId,
        targetType,
        targetId,
        content,
        parentId,
      });

      return res.status(201).json({
        success: true,
        data: comment,
        message: 'Comment created successfully',
      });
    } catch (error) {
      logger.error('Error in createComment:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to create comment',
        },
      });
    }
  }

  /**
   * Get comments
   */
  async getComments(req: Request, res: Response) {
    try {
      const { targetType, targetId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const sortBy = req.query.sortBy as 'recent' | 'popular' || 'recent';
      const parentId = req.query.parentId as string || null;

      const comments = await commentService.getComments(targetType, targetId, {
        limit,
        offset,
        sortBy,
        parentId: parentId === 'null' ? null : parentId,
      });

      return res.json({
        success: true,
        data: comments,
      });
    } catch (error) {
      logger.error('Error in getComments:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get comments',
        },
      });
    }
  }

  /**
   * Get comment
   */
  async getComment(req: Request, res: Response) {
    try {
      const { commentId } = req.params;

      const comment = await commentService.getComment(commentId);

      return res.json({
        success: true,
        data: comment,
      });
    } catch (error) {
      logger.error('Error in getComment:', error);
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: error.message || 'Comment not found',
        },
      });
    }
  }

  /**
   * Update comment
   */
  async updateComment(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { commentId } = req.params;
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

      const comment = await commentService.updateComment(commentId, userId, { content });

      return res.json({
        success: true,
        data: comment,
        message: 'Comment updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateComment:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update comment',
        },
      });
    }
  }

  /**
   * Delete comment
   */
  async deleteComment(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { commentId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await commentService.deleteComment(commentId, userId);

      return res.json({
        success: true,
        message: 'Comment deleted successfully',
      });
    } catch (error) {
      logger.error('Error in deleteComment:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to delete comment',
        },
      });
    }
  }

  /**
   * Toggle comment like
   */
  async toggleLike(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { commentId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const result = await commentService.toggleLike(commentId, userId);

      return res.json({
        success: true,
        data: result,
        message: `Comment ${result.action}`,
      });
    } catch (error) {
      logger.error('Error in toggleLike:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to toggle like',
        },
      });
    }
  }

  /**
   * Report comment
   */
  async reportComment(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { commentId } = req.params;
      const { reason, description } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Reason is required',
          },
        });
      }

      const report = await commentService.reportComment(commentId, userId, reason, description);

      return res.status(201).json({
        success: true,
        data: report,
        message: 'Comment reported successfully',
      });
    } catch (error) {
      logger.error('Error in reportComment:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to report comment',
        },
      });
    }
  }

  /**
   * Get comment replies
   */
  async getReplies(req: Request, res: Response) {
    try {
      const { commentId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const replies = await commentService.getReplies(commentId, limit, offset);

      return res.json({
        success: true,
        data: replies,
      });
    } catch (error) {
      logger.error('Error in getReplies:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get replies',
        },
      });
    }
  }
}

export const commentController = new CommentController();