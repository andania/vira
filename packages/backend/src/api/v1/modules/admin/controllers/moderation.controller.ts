/**
 * Moderation Controller
 * Handles HTTP requests for moderation operations
 */

import { Request, Response } from 'express';
import { moderationService } from '../services/moderation.service';
import { adminService } from '../services/admin.service';
import { logger } from '../../../../../core/logger';
import { ApiResponse, ApiErrorCode } from '@viraz/shared';

export class ModerationController {
  /**
   * Get moderation queue
   */
  async getModerationQueue(req: Request, res: Response) {
    try {
      const type = req.query.type as string || 'all';
      const status = req.query.status as string || 'pending';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const queue = await moderationService.getModerationQueue({
        type,
        status,
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
          message: 'Failed to get moderation queue',
        },
      });
    }
  }

  /**
   * Get report details
   */
  async getReportDetails(req: Request, res: Response) {
    try {
      const { reportId } = req.params;

      const report = await moderationService.getReportDetails(reportId);

      return res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error('Error in getReportDetails:', error);
      return res.status(404).json({
        success: false,
        error: {
          code: ApiErrorCode.RESOURCE_NOT_FOUND,
          message: error.message || 'Report not found',
        },
      });
    }
  }

  /**
   * Resolve report
   */
  async resolveReport(req: Request, res: Response) {
    try {
      const { reportId } = req.params;
      const { resolution, action } = req.body;

      await moderationService.resolveReport(reportId, req.user!.id, resolution, action);

      // Log admin action
      await adminService.logAdminAction({
        adminId: req.user!.id,
        action: 'RESOLVE_REPORT',
        resourceType: 'report',
        resourceId: reportId,
        details: { resolution, action },
      });

      return res.json({
        success: true,
        message: 'Report resolved successfully',
      });
    } catch (error) {
      logger.error('Error in resolveReport:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to resolve report',
        },
      });
    }
  }

  /**
   * Dismiss report
   */
  async dismissReport(req: Request, res: Response) {
    try {
      const { reportId } = req.params;
      const { reason } = req.body;

      await moderationService.dismissReport(reportId, req.user!.id, reason);

      // Log admin action
      await adminService.logAdminAction({
        adminId: req.user!.id,
        action: 'DISMISS_REPORT',
        resourceType: 'report',
        resourceId: reportId,
        details: { reason },
      });

      return res.json({
        success: true,
        message: 'Report dismissed successfully',
      });
    } catch (error) {
      logger.error('Error in dismissReport:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to dismiss report',
        },
      });
    }
  }

  /**
   * Take moderation action
   */
  async takeAction(req: Request, res: Response) {
    try {
      const { targetUserId, actionType, duration, reason } = req.body;

      const action = await moderationService.takeAction({
        moderatorId: req.user!.id,
        targetUserId,
        actionType,
        duration,
        reason,
      });

      // Log admin action
      await adminService.logAdminAction({
        adminId: req.user!.id,
        action: 'TAKE_MODERATION_ACTION',
        resourceType: 'user',
        resourceId: targetUserId,
        details: { actionType, duration, reason },
      });

      return res.json({
        success: true,
        data: action,
        message: `Moderation action '${actionType}' applied successfully`,
      });
    } catch (error) {
      logger.error('Error in takeAction:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to take moderation action',
        },
      });
    }
  }

  /**
   * Remove moderation action
   */
  async removeAction(req: Request, res: Response) {
    try {
      const { actionId } = req.params;

      await moderationService.removeAction(actionId);

      // Log admin action
      await adminService.logAdminAction({
        adminId: req.user!.id,
        action: 'REMOVE_MODERATION_ACTION',
        resourceType: 'moderation',
        resourceId: actionId,
      });

      return res.json({
        success: true,
        message: 'Moderation action removed successfully',
      });
    } catch (error) {
      logger.error('Error in removeAction:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to remove moderation action',
        },
      });
    }
  }

  /**
   * Get moderation statistics
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
          message: 'Failed to get moderation statistics',
        },
      });
    }
  }

  /**
   * Moderate content (automated)
   */
  async moderateContent(req: Request, res: Response) {
    try {
      const { content, type } = req.body;

      const result = await moderationService.moderateContent(content, type);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error in moderateContent:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to moderate content',
        },
      });
    }
  }

  /**
   * Get user moderation history
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
          message: 'Failed to get user moderation history',
        },
      });
    }
  }

  /**
   * Get room moderation history
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
          message: 'Failed to get room moderation history',
        },
      });
    }
  }
}

export const moderationController = new ModerationController();