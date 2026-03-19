/**
 * Moderation Controller
 * Handles HTTP requests for room moderation operations
 */

import { Request, Response } from 'express';
import { moderationService } from '../../../admin/services/moderation.service';
import { roomService } from '../services/room.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class ModerationController {
  /**
   * Moderate a user in room
   */
  async moderateUser(req: Request, res: Response) {
    try {
      const moderatorId = req.user?.id;
      const { roomId } = req.params;
      const { targetUserId, actionType, duration, reason } = req.body;

      if (!moderatorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      // Check if moderator has permission
      const room = await roomService.getRoomById(roomId);
      const isHost = room.hosts.some((h: any) => h.userId === moderatorId);
      
      if (!isHost) {
        return res.status(403).json({
          success: false,
          error: {
            code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
            message: 'Only hosts can moderate rooms',
          },
        });
      }

      const result = await moderationService.moderateUser({
        roomId,
        moderatorId,
        targetUserId,
        actionType,
        duration,
        reason,
      });

      return res.json({
        success: true,
        data: result,
        message: `User ${actionType} successfully`,
      });
    } catch (error) {
      logger.error('Error in moderateUser:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to moderate user',
        },
      });
    }
  }

  /**
   * Remove moderation action
   */
  async removeModeration(req: Request, res: Response) {
    try {
      const moderatorId = req.user?.id;
      const { roomId, actionId } = req.params;

      if (!moderatorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      // Check if moderator has permission
      const room = await roomService.getRoomById(roomId);
      const isHost = room.hosts.some((h: any) => h.userId === moderatorId);
      
      if (!isHost) {
        return res.status(403).json({
          success: false,
          error: {
            code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
            message: 'Only hosts can remove moderation actions',
          },
        });
      }

      await moderationService.removeModerationAction(actionId);

      return res.json({
        success: true,
        message: 'Moderation action removed successfully',
      });
    } catch (error) {
      logger.error('Error in removeModeration:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to remove moderation action',
        },
      });
    }
  }

  /**
   * Get moderation history for room
   */
  async getRoomModerationHistory(req: Request, res: Response) {
    try {
      const { roomId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const history = await moderationService.getRoomModerationHistory(roomId, limit, offset);

      return res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('Error in getRoomModerationHistory:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get moderation history',
        },
      });
    }
  }

  /**
   * Get moderation history for user
   */
  async getUserModerationHistory(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const history = await moderationService.getUserModerationHistory(userId, limit, offset);

      return res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('Error in getUserModerationHistory:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get user moderation history',
        },
      });
    }
  }

  /**
   * Report a room
   */
  async reportRoom(req: Request, res: Response) {
    try {
      const reporterId = req.user?.id;
      const { roomId } = req.params;
      const { reportType, description, evidenceUrls } = req.body;

      if (!reporterId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const report = await moderationService.reportRoom({
        roomId,
        reporterId,
        reportType,
        description,
        evidenceUrls,
      });

      return res.status(201).json({
        success: true,
        data: report,
        message: 'Room reported successfully',
      });
    } catch (error) {
      logger.error('Error in reportRoom:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to report room',
        },
      });
    }
  }

  /**
   * Report a message
   */
  async reportMessage(req: Request, res: Response) {
    try {
      const reporterId = req.user?.id;
      const { roomId, messageId } = req.params;
      const { reportType, description } = req.body;

      if (!reporterId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      const report = await moderationService.reportMessage({
        roomId,
        messageId,
        reporterId,
        reportType,
        description,
      });

      return res.status(201).json({
        success: true,
        data: report,
        message: 'Message reported successfully',
      });
    } catch (error) {
      logger.error('Error in reportMessage:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to report message',
        },
      });
    }
  }

  /**
   * Get moderation queue (admin only)
   */
  async getModerationQueue(req: Request, res: Response) {
    try {
      const { type = 'all', status = 'pending' } = req.query;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const queue = await moderationService.getModerationQueue({
        type: type as string,
        status: status as string,
        limit,
        offset,
      });

      return res.json({
        success: true,
        data: queue,
      });
    } catch (error) {
      logger.error('Error in getModerationQueue:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to get moderation queue',
        },
      });
    }
  }

  /**
   * Resolve a report (admin only)
   */
  async resolveReport(req: Request, res: Response) {
    try {
      const adminId = req.user?.id;
      const { reportId } = req.params;
      const { resolution, action } = req.body;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      await moderationService.resolveReport(reportId, adminId, resolution, action);

      return res.json({
        success: true,
        message: 'Report resolved successfully',
      });
    } catch (error) {
      logger.error('Error in resolveReport:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to resolve report',
        },
      });
    }
  }

  /**
   * Get moderation statistics (admin only)
   */
  async getModerationStats(req: Request, res: Response) {
    try {
      const stats = await moderationService.getModerationStats();

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
          message: error.message || 'Failed to get moderation statistics',
        },
      });
    }
  }

  /**
   * Set room moderation settings
   */
  async setModerationSettings(req: Request, res: Response) {
    try {
      const moderatorId = req.user?.id;
      const { roomId } = req.params;
      const { settings } = req.body;

      if (!moderatorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
      }

      // Check if moderator has permission
      const room = await roomService.getRoomById(roomId);
      const isHost = room.hosts.some((h: any) => h.userId === moderatorId);
      
      if (!isHost) {
        return res.status(403).json({
          success: false,
          error: {
            code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
            message: 'Only hosts can change moderation settings',
          },
        });
      }

      await roomService.updateRoom(roomId, { settings }, moderatorId);

      return res.json({
        success: true,
        message: 'Moderation settings updated successfully',
      });
    } catch (error) {
      logger.error('Error in setModerationSettings:', error);
      return res.status(400).json({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message || 'Failed to update moderation settings',
        },
      });
    }
  }
}

export const moderationController = new ModerationController();